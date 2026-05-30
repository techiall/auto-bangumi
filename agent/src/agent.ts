import './env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { pathToFileURL } from 'node:url';
import { basicAuthorizationHeader } from './auth.js';
import { loadAgentConfig } from './config.js';
import { fetchWithRetry } from './fetch-with-retry.js';
import { formatInterval } from './format.js';
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
      this.config.apiTimeoutMs,
    );
    if (!response.body) throw new Error(`Source returned an empty body: ${sourceUrl.toString()}`);

    try {
      await pipeline(Readable.fromWeb(response.body as ReadableStream), createWriteStream(temporaryPath), {
        signal: AbortSignal.timeout(this.config.transferTimeoutMs),
      });
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startMoveAgent();
}
