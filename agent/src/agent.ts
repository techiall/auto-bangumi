import './env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { pathToFileURL } from 'node:url';
import { fetchWithRetry } from './fetch-with-retry.js';
import { formatInterval } from './format.js';
import { logger } from './logger.js';
import { runRecurringTask } from './task-runner.js';

const MOVE_AGENT_INTERVAL_MS = Number(process.env.MOVE_AGENT_INTERVAL_MS ?? 10_000);
const MOVE_AGENT_LIMIT = Number(process.env.MOVE_AGENT_LIMIT ?? 1);
const MOVE_AGENT_JOB_ATTEMPTS = Number(process.env.MOVE_AGENT_JOB_ATTEMPTS ?? 2);
const MOVE_AGENT_API_TIMEOUT_MS = Number(process.env.MOVE_AGENT_API_TIMEOUT_MS ?? 15_000);
const MOVE_AGENT_TRANSFER_TIMEOUT_MS = Number(process.env.MOVE_AGENT_TRANSFER_TIMEOUT_MS ?? 30 * 60_000);
const DEFAULT_MOVER_API_TOKEN = 'auto-bangumi-local-mover-api-token';
const LIBRARY_ROOT = '/library';

interface MoverJob {
  id: string;
  sourceUrl: string;
  sourceHeaders?: Record<string, string>;
  targetRelativePath: string;
  title: string;
  season: number;
  episode: number;
}

interface ClaimedJobs {
  jobs: MoverJob[];
}

class MoveAgent {
  private readonly downloadServerUrl: string;
  private readonly libraryRoot: string;
  private readonly libraryDisplayRoot: string;
  private readonly token?: string;

  constructor() {
    this.downloadServerUrl = normalizeBaseUrl(process.env.DOWNLOAD_SERVER_URL ?? 'http://server:3001');
    this.libraryRoot = LIBRARY_ROOT;
    this.libraryDisplayRoot = process.env.LIBRARY_DISPLAY_ROOT?.trim() || this.libraryRoot;
    this.token = requireMoverApiToken(process.env.MOVER_API_TOKEN);
  }

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
    const response = await this.request<ClaimedJobs>(`/api/mover/jobs/claim?limit=${MOVE_AGENT_LIMIT}`, {
      method: 'POST',
    });
    return response.jobs;
  }

  private async moveJobWithRetry(job: MoverJob) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MOVE_AGENT_JOB_ATTEMPTS; attempt += 1) {
      try {
        await this.moveJob(job);
        return;
      } catch (error) {
        lastError = error;
        logger.warn(
          `Move job ${job.id} attempt ${attempt}/${MOVE_AGENT_JOB_ATTEMPTS} failed: ${(error as Error).message}`,
        );
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Move job failed.');
  }

  private async moveJob(job: MoverJob) {
    const targetPath = safeJoin(this.libraryRoot, job.targetRelativePath);
    const temporaryPath = `${targetPath}.part-${process.pid}`;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const sourceUrl = new URL(job.sourceUrl, this.downloadServerUrl);
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
      MOVE_AGENT_API_TIMEOUT_MS,
    );
    if (!response.body) throw new Error(`Source returned an empty body: ${sourceUrl.toString()}`);

    try {
      await pipeline(Readable.fromWeb(response.body as ReadableStream), createWriteStream(temporaryPath), {
        signal: AbortSignal.timeout(MOVE_AGENT_TRANSFER_TIMEOUT_MS),
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
    const response = await fetch(new URL(pathName, this.downloadServerUrl), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(MOVE_AGENT_API_TIMEOUT_MS),
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
    if (/^[a-z]:[\\/]/i.test(this.libraryDisplayRoot) || this.libraryDisplayRoot.includes('\\')) {
      return path.win32.join(this.libraryDisplayRoot, normalized);
    }

    return safeJoin(this.libraryDisplayRoot, normalized);
  }

  private authorizationHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }
}

function startMoveAgent() {
  logger.info(`Starting mover agent with ${formatInterval(MOVE_AGENT_INTERVAL_MS)} interval`);
  const agent = new MoveAgent();
  return runRecurringTask('mover agent', () => agent.runOnce(), MOVE_AGENT_INTERVAL_MS);
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value?.trim()) throw new Error('DOWNLOAD_SERVER_URL is required for mover agent');
  return value.endsWith('/') ? value : `${value}/`;
}

function requireMoverApiToken(value: string | undefined) {
  const token = value?.trim();

  if (token?.startsWith('replace-with-')) {
    throw new Error('MOVER_API_TOKEN must be changed from the placeholder value.');
  }

  return token || DEFAULT_MOVER_API_TOKEN;
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
