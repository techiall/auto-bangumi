import { loadConfig } from '../config/app-config.js';
import { QBittorrentApi } from '../qbittorrent/api.js';
import { createDb } from '../state/db.js';
import type { ActiveEpisode, CompletedEpisode } from '../state/db.js';
import type { QBittorrentTorrentStatus } from '../qbittorrent/api.js';
import { resolveActiveEpisodeMetadata, resolveCompletedEpisodeMetadata } from '../state/episode-metadata.js';
import { moveCompletedEpisodes } from '../tasks/move-task.js';
import { logger } from '../config/logger.js';

export interface DownloadState {
  active: Record<string, ActiveEpisodeWithStatus>;
  completed: Record<string, CompletedEpisode>;
}

export type ActiveEpisodeWithStatus = ActiveEpisode & {
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
    void moveCompletedEpisodes({
      configPath: this.configPath,
      dbPath: this.dbPath,
    }).catch((error: unknown) => {
      logger.warn(`Failed to reconcile completed downloads: ${(error as Error).message}`);
    });

    const db = await createDb(this.dbPath);
    const config = loadConfig(this.configPath);
    const api = new QBittorrentApi(config.qbittorrent);
    const torrentStatuses = await this.loadQbittorrentStatuses(api);

    const active = Object.fromEntries(
      Object.entries(db.data.active).map(([hash, episode]) => [
        hash,
        this.withQbittorrentStatus(hash, resolveActiveEpisodeMetadata(config, hash, episode), torrentStatuses),
      ]),
    );

    return {
      active,
      completed: Object.fromEntries(
        Object.entries(db.data.completed).map(([hash, episode]) => [
          hash,
          resolveCompletedEpisodeMetadata(config, episode),
        ]),
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

  private withQbittorrentStatus(
    hash: string,
    episode: ActiveEpisode,
    torrents: QbittorrentStatuses,
  ): ActiveEpisodeWithStatus {
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
}
