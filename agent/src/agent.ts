import './env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { pathToFileURL } from 'node:url';
import { basicAuthorizationHeader } from './auth.js';
import { loadAgentConfig } from './config.js';
import { fetchWithRetry } from './fetch-with-retry.js';
import { formatBytes, formatInterval } from './format.js';
import { logger } from './logger.js';
import { runRecurringTask } from './task-runner.js';
import type { AgentConfig, ClaimedJobs, MoverJob } from './types.js';

class MoveAgent {
  constructor(private readonly config: AgentConfig) {}

  async runOnce() {
    const jobs = await this.claimJobs();
    if (!jobs.length) return;

    for (const job of jobs) {
      await this.moveJobWithRetry(job).catch(async (error: unknown) => {
        await this.reportFailure(job.id, (error as Error).message);
      });
    }
  }

  private async claimJobs() {
    const response = await this.request<ClaimedJobs>(`/api/mover/jobs/claim?limit=${this.config.jobLimit}`, {
      method: 'POST',
    });
    return response.jobs;
  }

  private async moveJobWithRetry(job: MoverJob) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.jobAttempts; attempt += 1) {
      try {
        await this.moveJob(job);
        return;
      } catch (error) {
        lastError = error;
        logger.warn(
          `Move job ${job.id} attempt ${attempt}/${this.config.jobAttempts} failed: ${(error as Error).message}`,
        );
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Move job failed.');
  }

  private async moveJob(job: MoverJob) {
    const targetPath = safeJoin(this.config.libraryRoot, job.targetRelativePath);
    const temporaryPath = `${targetPath}.part-${process.pid}`;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const sourceUrl = new URL(job.sourceUrl, this.config.downloadServerUrl);
    const response = await fetchWithRetry(
      sourceUrl,
      {
        headers: {
          ...this.authorizationHeaders(),
          ...(job.sourceHeaders ?? {}),
        },
      },
      2,
      1000,
      this.config.transferTimeoutMs,
    );
    if (!response.body) throw new Error(`Source returned an empty body: ${sourceUrl.toString()}`);

    const contentLength = Number(response.headers.get('content-length'));
    const progress = new MoveProgress(job, Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0);
    logger.info(`Moving ${formatJob(job)} to ${this.displayPath(job.targetRelativePath)}`);

    try {
      await pipeline(
        Readable.fromWeb(response.body as ReadableStream),
        progress.stream(),
        createWriteStream(temporaryPath),
        {
          signal: AbortSignal.timeout(this.config.transferTimeoutMs),
        },
      );
      progress.finish();
      await fs.rename(temporaryPath, targetPath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true });
      throw error;
    }

    const displayTargetPath = this.displayPath(job.targetRelativePath);
    await this.request(`/api/mover/jobs/${job.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ targetPath, displayTargetPath }),
    });

    logger.info(`Moved ${job.title} S${job.season}E${job.episode} to ${displayTargetPath}`);
  }

  private reportFailure(id: string, message: string) {
    logger.warn(`Move job ${id} failed: ${message}`);
    return this.request(`/api/mover/jobs/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  private async request<T = unknown>(pathName: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(new URL(pathName, this.config.downloadServerUrl), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(this.config.apiTimeoutMs),
      headers: {
        'Content-Type': 'application/json',
        ...this.authorizationHeaders(),
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`);
    }

    return data as T;
  }

  private displayPath(relativePath: string) {
    const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
    if (/^[a-z]:[\\/]/i.test(this.config.libraryDisplayRoot) || this.config.libraryDisplayRoot.includes('\\')) {
      return path.win32.join(this.config.libraryDisplayRoot, normalized);
    }

    return safeJoin(this.config.libraryDisplayRoot, normalized);
  }

  private authorizationHeaders() {
    return basicAuthorizationHeader(this.config.serverCredentials);
  }
}

function startMoveAgent() {
  const config = loadAgentConfig();
  logger.info(`Starting mover agent with ${formatInterval(config.pollIntervalMs)} interval`);
  const agent = new MoveAgent(config);
  return runRecurringTask('mover agent', () => agent.runOnce(), config.pollIntervalMs);
}

function safeJoin(root: string, relativePath: string) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  const target = path.resolve(root, normalized);
  const resolvedRoot = path.resolve(root);

  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Target path escapes library root: ${relativePath}`);
  }

  return target;
}

class MoveProgress {
  private readonly startedAt = Date.now();
  private lastLoggedAt = this.startedAt;
  private transferredBytes = 0;

  constructor(
    private readonly job: MoverJob,
    private readonly totalBytes: number,
  ) {}

  stream() {
    return new Transform({
      transform: (chunk: Buffer, _encoding, callback) => {
        this.transferredBytes += chunk.length;
        this.log(false);
        callback(null, chunk);
      },
    });
  }

  finish() {
    this.log(true);
  }

  private log(force: boolean) {
    const now = Date.now();
    if (!force && now - this.lastLoggedAt < 5_000) return;

    this.lastLoggedAt = now;
    const elapsedSeconds = Math.max((now - this.startedAt) / 1000, 0.001);
    const speed = this.transferredBytes / elapsedSeconds;
    const percent =
      this.totalBytes > 0 ? `${Math.min(100, (this.transferredBytes / this.totalBytes) * 100).toFixed(0)}% · ` : '';
    const total = this.totalBytes > 0 ? ` / ${formatBytes(this.totalBytes)}` : '';
    logger.info(
      `Moving ${formatJob(this.job)} ${percent}${formatBytes(this.transferredBytes)}${total} · ${formatBytes(speed)}/s`,
    );
  }
}

function formatJob(job: MoverJob) {
  return `${job.title} S${job.season}E${job.episode}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startMoveAgent();
}
