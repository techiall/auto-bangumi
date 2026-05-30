import { loadConfig } from './config/app-config.js';
import { logger } from './config/logger.js';
import { QBittorrentApi } from './qbittorrent/api.js';
import type { QBittorrentTorrentStatus } from './qbittorrent/types.js';
import { withDb } from './state/db.js';
import type { ActiveEpisode, CompletedEpisode, MoveJobRecord } from './state/db.js';
import { resolveActiveEpisodeMetadata, resolveCompletedEpisodeMetadata } from './state/episode-metadata.js';
import { syncMoveJobs } from './move-job-sync.js';
import type { DownloadState, QbittorrentStatuses } from './downloads/types.js';

export class DownloadService {
  constructor(private readonly dbPath: string) {}

  async state(): Promise<DownloadState> {
    void syncMoveJobs({
      dbPath: this.dbPath,
    }).catch((error: unknown) => {
      logger.warn(`Move job sync failed: ${(error as Error).message}`);
    });

    const config = await loadConfig(this.dbPath);
    const data = await withDb(this.dbPath, (db) => db.data);
    const api = new QBittorrentApi(config.qbittorrent);
    const torrentStatuses = await this.loadQbittorrentStatuses(api);

    return {
      active: mapRecord(data.active, (hash, episode) =>
        withQbittorrentStatus(hash, resolveActiveEpisodeMetadata(config, hash, episode), torrentStatuses),
      ),
      moveJobs: mapRecord(data.moveJobs, (hash, job) =>
        withQbittorrentStatus(hash, resolveMoveJobMetadata(config, job), torrentStatuses),
      ),
      completed: mapRecord(data.completed, (hash, episode) =>
        withQbittorrentStatus(hash, resolveCompletedEpisodeMetadata(config, episode), torrentStatuses),
      ),
    };
  }

  private async loadQbittorrentStatuses(api: QBittorrentApi) {
    try {
      return { statuses: await api.torrentStatusesByHash() };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
}

function resolveMoveJobMetadata(config: Awaited<ReturnType<typeof loadConfig>>, job: MoveJobRecord): MoveJobRecord {
  const subscription = job.subscriptionRss
    ? config.subscriptions.find((current) => current.rss === job.subscriptionRss)
    : undefined;

  if (!subscription) return job;

  return {
    ...job,
    title: subscription.title,
    folder: subscription.folder,
    season: subscription.season,
  };
}

function mapRecord<T, R>(record: Record<string, T>, mapper: (key: string, value: T) => R): Record<string, R> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, mapper(key, value)]));
}

function withQbittorrentStatus<T extends ActiveEpisode | CompletedEpisode | MoveJobRecord>(
  hash: string,
  episode: T,
  torrents: QbittorrentStatuses,
): T & { qbit?: QBittorrentTorrentStatus; qbitError?: string } {
  if ('error' in torrents) {
    return {
      ...episode,
      qbitError: torrents.error,
    };
  }

  return {
    ...episode,
    qbit: torrents.statuses.get(hash),
  };
}
