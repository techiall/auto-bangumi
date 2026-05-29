import { loadConfig } from './config/app-config.js';
import { logger } from './config/logger.js';
import { buildFileServerUrl, fileServerAuthorizationHeaders, pickDownloadedFile } from './files/file-transfer.js';
import { createLibraryTargetRelativePath } from './library/library-path.js';
import { QBittorrentApi } from './qbittorrent/api.js';
import { completeEpisode, markQbittorrentRemoved, withDb } from './state/db.js';
import type { AppDb, MoveJob, MoveJobRecord } from './state/db.js';
import { resolveActiveEpisodeMetadata } from './state/episode-metadata.js';
import { HttpError } from './http-error.js';
import { fetchWithRetry } from './utils/fetch-with-retry.js';

const DEFAULT_LEASE_MS = 15 * 60 * 1000;

export interface MoverJobPayload {
  id: string;
  title: string;
  folder: string;
  season: number;
  episode: number;
  sourceUrl: string;
  sourceHeaders: Record<string, string>;
  targetRelativePath: string;
  attempts: number;
}

export class MoverJobService {
  constructor(private readonly dbPath: string) {}

  async list() {
    const config = await loadConfig(this.dbPath);
    return withDb(this.dbPath, (db) =>
      Promise.all(
        Object.entries(db.data.moveJobs).map(([hash, job]) => this.toJob(config, hash, resolveMoveJob(config, job))),
      ),
    );
  }

  async claim(limit = 1) {
    await this.syncReadyJobs();

    const config = await loadConfig(this.dbPath);
    return withDb(this.dbPath, async (db) => {
      const now = new Date();
      const jobs: MoverJobPayload[] = [];

      for (const [hash, job] of Object.entries(db.data.moveJobs)) {
        if (jobs.length >= limit) break;
        if (!isClaimable(job, now)) continue;

        job.status = 'moving';
        job.attempts += 1;
        job.updatedAt = now.toISOString();
        job.leaseExpiresAt = new Date(now.getTime() + DEFAULT_LEASE_MS).toISOString();
        delete job.error;
        jobs.push(await this.toJob(config, hash, resolveMoveJob(config, job)));
      }

      if (jobs.length) await db.write();
      return { jobs };
    });
  }

  async complete(hash: string, payload: unknown) {
    const config = await loadConfig(this.dbPath);
    return withDb(this.dbPath, async (db) => {
      const job = this.findJob(db, hash);
      const targetPath = parseDisplayTargetPath(payload) || job.targetRelativePath;

      completeEpisode(db.data, hash, targetPath);
      await db.write();

      const api = new QBittorrentApi(config.qbittorrent);
      try {
        await api.removeTorrent(hash, true);
        markQbittorrentRemoved(db.data, hash);
        await db.write();
      } catch (error) {
        logger.warn(`Moved ${hash}, but failed to remove qBittorrent source files: ${(error as Error).message}`);
      }

      return { ok: true };
    });
  }

  async fail(hash: string, payload: unknown) {
    return withDb(this.dbPath, async (db) => {
      const job = this.findJob(db, hash);
      const now = new Date().toISOString();

      job.status = 'failed';
      job.error = parseErrorMessage(payload);
      job.updatedAt = now;
      delete job.leaseExpiresAt;
      await db.write();

      return { ok: true };
    });
  }

  async openSource(hash: string) {
    const config = await loadConfig(this.dbPath);
    const job = await withDb(this.dbPath, (db) => ({ ...this.findJob(db, hash) }));
    return fetchWithRetry(buildFileServerUrl(config.qbittorrent, job.sourceRemotePath), {
      headers: fileServerAuthorizationHeaders(config.qbittorrent.fileServer),
    });
  }

  async syncReadyJobs() {
    const config = await loadConfig(this.dbPath);
    const api = new QBittorrentApi(config.qbittorrent);
    const torrents = await api.torrentsByHash();
    await withDb(this.dbPath, async (db) => {
      let changed = false;

      for (const [hash, record] of Object.entries(db.data.active)) {
        if (db.data.moveJobs[hash]?.status === 'moving' || db.data.moveJobs[hash]?.status === 'failed') continue;

        const torrent = torrents.get(hash);
        if (!torrent?.canMove()) continue;

        const activeEpisode = resolveActiveEpisodeMetadata(config, hash, record);
        const rawTorrent = await api.getTorrent(hash);
        const files = await api.torrentFiles(hash);
        const downloadedFile = pickDownloadedFile(rawTorrent.raw.content_path as string, files);
        const targetRelativePath = createLibraryTargetRelativePath({
          folder: activeEpisode.folder,
          season: activeEpisode.season,
          episode: activeEpisode.number,
          extension: downloadedFile.extension,
        });

        const now = new Date().toISOString();
        db.data.moveJobs[hash] = {
          status: 'ready',
          number: activeEpisode.number,
          targetRelativePath,
          sourceRemotePath: downloadedFile.remotePath,
          ...(activeEpisode.subscriptionRss
            ? { subscriptionRss: activeEpisode.subscriptionRss }
            : {
                title: activeEpisode.title,
                folder: activeEpisode.folder,
                season: activeEpisode.season,
              }),
          createdAt: db.data.moveJobs[hash]?.createdAt ?? now,
          updatedAt: now,
          attempts: db.data.moveJobs[hash]?.attempts ?? 0,
        };
        changed = true;
      }

      if (changed) await db.write();
    });
  }

  private findJob(db: AppDb, hash: string) {
    const job = db.data.moveJobs[hash];
    if (!job) throw new HttpError(404, 'Move job not found.');
    return job;
  }

  private toJob(config: Awaited<ReturnType<typeof loadConfig>>, hash: string, job: MoveJob): MoverJobPayload {
    return {
      id: hash,
      title: job.title,
      folder: job.folder,
      season: job.season,
      episode: job.number,
      sourceUrl: `/api/mover/jobs/${encodeURIComponent(hash)}/source`,
      sourceHeaders: {},
      targetRelativePath: job.targetRelativePath,
      attempts: job.attempts,
    };
  }
}

function resolveMoveJob(config: Awaited<ReturnType<typeof loadConfig>>, job: MoveJobRecord): MoveJob {
  const subscription = job.subscriptionRss
    ? config.subscriptions.find((current) => current.rss === job.subscriptionRss)
    : undefined;

  const title = subscription?.title ?? job.title ?? 'Unknown';
  return {
    ...job,
    title,
    folder: subscription?.folder ?? job.folder ?? title,
    season: subscription?.season ?? job.season ?? 1,
  };
}

function isClaimable(job: MoveJobRecord, now: Date) {
  if (job.status === 'ready') return true;
  if (job.status !== 'moving' || !job.leaseExpiresAt) return false;
  return Date.parse(job.leaseExpiresAt) <= now.getTime();
}

function parseDisplayTargetPath(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const targetPath = String(
    (payload as { displayTargetPath?: unknown; targetPath?: unknown }).displayTargetPath ??
      (payload as { targetPath?: unknown }).targetPath ??
      '',
  ).trim();
  return targetPath || undefined;
}

function parseErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return 'Mover failed without details.';
  return String((payload as { message?: unknown }).message ?? '').trim() || 'Mover failed without details.';
}
