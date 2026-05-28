import { loadConfig } from '../config/app-config.js';
import { QBittorrentApi } from '../qbittorrent/api.js';
import { createDb } from '../state/db.js';
import type { ActiveEpisode, CompletedEpisode } from '../state/db.js';
import type { QBittorrentTorrentStatus } from '../qbittorrent/api.js';
import { resolveActiveEpisodeMetadata, resolveCompletedEpisodeMetadata } from '../state/episode-metadata.js';
import { reconcileCompletedDownloads } from '../tasks/move-task.js';
import { logger } from '../config/logger.js';

export interface DownloadState {
  active: Record<string, ActiveEpisodeWithStatus>;
  completed: Record<string, CompletedEpisodeWithStatus>;
}

export type ActiveEpisodeWithStatus = ActiveEpisode & {
  qbit?: QBittorrentTorrentStatus;
  qbitError?: string;
};

export type CompletedEpisodeWithStatus = CompletedEpisode & {
  qbit?: QBittorrentTorrentStatus;
  qbitError?: string;
};

type QbittorrentStatuses =
  | { statuses: Map<string, QBittorrentTorrentStatus>; error?: never }
  | { statuses?: never; error: string };

export class DownloadService {
  constructor(
    private readonly configPath: string,
    private readonly dbPath: string,
  ) {}

  async state(): Promise<DownloadState> {
    void reconcileCompletedDownloads({
      configPath: this.configPath,
      dbPath: this.dbPath,
    }).catch((error: unknown) => {
      logger.warn(`Download reconciliation failed: ${(error as Error).message}`);
    });

    const db = await createDb(this.dbPath);
    const config = loadConfig(this.configPath);
    const api = new QBittorrentApi(config.qbittorrent);
    const torrentStatuses = await this.loadQbittorrentStatuses(api);

    return {
      active: mapRecord(db.data.active, (hash, episode) =>
        withQbittorrentStatus(hash, resolveActiveEpisodeMetadata(config, hash, episode), torrentStatuses),
      ),
      completed: mapRecord(db.data.completed, (hash, episode) =>
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

function mapRecord<T, R>(record: Record<string, T>, mapper: (key: string, value: T) => R): Record<string, R> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, mapper(key, value)]));
}

function withQbittorrentStatus<T extends ActiveEpisode | CompletedEpisode>(
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
