import { logger } from './config/logger.js';
import { QBittorrentApi } from './qbittorrent/api.js';
import { loadConfig } from './config/app-config.js';
import { withDb } from './state/db.js';
import type { ActiveEpisode, CompletedEpisode, MoveJobRecord } from './state/db.js';
import { resolveActiveEpisodeMetadata, resolveCompletedEpisodeMetadata } from './state/episode-metadata.js';
import type { DownloadState, QbittorrentStatuses } from './downloads/types.js';
import type { QBittorrentTorrentStatus } from './qbittorrent/types.js';

const QBIT_STATUS_CACHE_MS = Number(process.env.DOWNLOADS_QBIT_CACHE_MS ?? 1500);

export class DownloadService {
  private qbitCache:
    | {
        expiresAt: number;
        value: QbittorrentStatuses;
      }
    | undefined;

  constructor(private readonly dbPath: string) {}

  async state(options: DownloadStateOptions = {}): Promise<DownloadState> {
    const config = await loadConfig(this.dbPath);
    const data = await withDb(this.dbPath, (db) => db.data);
    const torrentStatuses = await this.loadQbittorrentStatuses(config);

    const state = {
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

    return options.subscriptionRss ? filterStateBySubscription(state, options.subscriptionRss) : state;
  }

  private async loadQbittorrentStatuses(config: Awaited<ReturnType<typeof loadConfig>>) {
    const now = Date.now();
    if (this.qbitCache && this.qbitCache.expiresAt > now) {
      return this.qbitCache.value;
    }

    const api = new QBittorrentApi(config.qbittorrent);
    let value: QbittorrentStatuses;
    try {
      value = { statuses: await api.torrentStatusesByHash() };
    } catch (error) {
      value = { error: (error as Error).message };
      logger.warn(`Failed to load qBittorrent statuses: ${(error as Error).message}`);
    }

    this.qbitCache = { expiresAt: now + QBIT_STATUS_CACHE_MS, value };
    return value;
  }
}

interface DownloadStateOptions {
  subscriptionRss?: string;
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

function filterStateBySubscription(state: DownloadState, subscriptionRss: string): DownloadState {
  return {
    active: filterRecord(state.active, (episode) => episode.subscriptionRss === subscriptionRss),
    moveJobs: filterRecord(state.moveJobs, (job) => job.subscriptionRss === subscriptionRss),
    completed: filterRecord(state.completed, (episode) => episode.subscriptionRss === subscriptionRss),
  };
}

function filterRecord<T>(record: Record<string, T>, predicate: (value: T) => boolean): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => predicate(value)));
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
