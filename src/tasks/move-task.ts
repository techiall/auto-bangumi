import { QBittorrentApi } from '../qbittorrent/api.js';
import type { QBittorrentTorrent } from '../qbittorrent/api.js';
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { loadConfig } from '../config/app-config.js';
import type { Config } from '../config/app-config.js';
import { logger } from '../config/logger.js';
import { completeEpisode, createDb, markQbittorrentRemoved } from '../state/db.js';
import type { AppDb } from '../state/db.js';
import type { ActiveEpisode } from '../state/db.js';
import { resolveActiveEpisodeMetadata } from '../state/episode-metadata.js';
import { numberDisplayString } from '../utils/number.js';
import { buildFileServerUrl, copyFromFileServer, pickDownloadedFile } from '../files/file-transfer.js';
import { createLibraryTargetPath } from '../library/library-path.js';
import { runRecurringTask } from './task-runner.js';

const MOVE_INTERVAL_MS = Number(process.env.MOVE_INTERVAL_MS ?? 30_000);

type MoveEpisodeResult = 'moved' | 'missing' | 'pending' | 'recovered' | 'skipped';
type CleanupEpisodeResult = 'cleaned' | 'missing' | 'pending' | 'skipped';

export interface MoveTaskOptions {
  configPath?: string;
  dbPath?: string;
}

let currentMoveTask: Promise<void> | undefined;

export class Move {
  private readonly config: Config;
  private readonly api: QBittorrentApi;
  private readonly db: AppDb;

  constructor(config: Config, api: QBittorrentApi, db: AppDb) {
    this.config = config;
    this.api = api;
    this.db = db;
  }

  async move() {
    const summary: Record<MoveEpisodeResult, number> = {
      moved: 0,
      missing: 0,
      pending: 0,
      recovered: 0,
      skipped: 0,
    };
    const torrents = await this.api.torrentsByHash();

    for (const [torrent, episode] of Object.entries(this.db.data.active)) {
      const result = await this.moveEpisode(
        resolveActiveEpisodeMetadata(this.config, torrent, episode),
        torrents.get(torrent),
      );
      summary[result] += 1;
    }

    await this.cleanupMovedEpisodes(torrents);

    if (summary.moved || summary.recovered || summary.skipped) {
      logger.info(
        `Move task checked ${Object.values(summary).reduce((total, value) => total + value, 0)} active episodes: ` +
          `${summary.moved} moved, ${summary.pending} pending, ${summary.recovered} restored in qBittorrent, ` +
          `${summary.missing} missing, ${summary.skipped} skipped`,
      );
    }
  }

  private episodeDisplayString(episode: ActiveEpisode) {
    return `${episode.title} S${numberDisplayString(episode.season)}E${numberDisplayString(episode.number)}`;
  }

  private async moveEpisode(
    episode: ActiveEpisode,
    torrent: QBittorrentTorrent | undefined,
  ): Promise<MoveEpisodeResult> {
    if (!torrent) {
      try {
        await this.api.download(episode);
        return 'recovered';
      } catch (error) {
        logger.warn(
          `Failed to restore ${this.episodeDisplayString(episode)} in qBittorrent: ${(error as Error).message}`,
        );
        return 'missing';
      }
    }

    if (!torrent.canMove()) {
      return 'pending';
    }

    const rawTorrent = await this.api.getTorrent(episode.torrent);
    const files = await this.api.torrentFiles(episode.torrent);
    const downloadedFile = pickDownloadedFile(rawTorrent.raw.content_path as string, files);
    const target = createLibraryTargetPath({
      folder: episode.folder,
      season: episode.season,
      episode: episode.number,
      extension: downloadedFile.extension,
    });
    await fs.mkdir(target.writeDirectory, { recursive: true });

    if (this.config.qbittorrent.fileServer) {
      const url = buildFileServerUrl(this.config.qbittorrent, downloadedFile.remotePath);
      await copyFromFileServer(this.config.qbittorrent.fileServer, url, target.writePath);
    } else {
      if ((await fs.lstat(downloadedFile.remotePath)).isDirectory()) {
        logger.warn(`${this.episodeDisplayString(episode)} is a directory, skipping move`);
        return 'skipped';
      }
      await fs.copyFile(downloadedFile.remotePath, target.writePath, fsConstants.COPYFILE_FICLONE);
    }

    completeEpisode(this.db.data, episode.torrent, target.displayPath);
    await this.db.write();
    return 'moved';
  }

  private async cleanupMovedEpisodes(torrents: Map<string, QBittorrentTorrent>) {
    const summary: Record<CleanupEpisodeResult, number> = {
      cleaned: 0,
      missing: 0,
      pending: 0,
      skipped: 0,
    };

    for (const [hash, episode] of Object.entries(this.db.data.completed)) {
      if (episode.qbitRemovedAt) {
        summary.skipped += 1;
        continue;
      }

      const result = await this.cleanupMovedEpisode(hash, torrents.get(hash));
      summary[result] += 1;
    }

    if (summary.cleaned) {
      logger.info(
        `Cleaned ${summary.cleaned} moved episodes from qBittorrent ` +
          `(${summary.pending} still seeding, ${summary.missing} missing, ${summary.skipped} already cleaned)`,
      );
    }
  }

  private async cleanupMovedEpisode(
    hash: string,
    torrent: QBittorrentTorrent | undefined,
  ): Promise<CleanupEpisodeResult> {
    if (!torrent) return 'missing';
    if (!torrent.canCleanupDownloadedFiles()) return 'pending';

    await this.api.removeTorrent(hash, true);
    markQbittorrentRemoved(this.db.data, hash);
    await this.db.write();
    return 'cleaned';
  }
}

export async function moveCompletedEpisodes(options: MoveTaskOptions = {}) {
  if (currentMoveTask) return currentMoveTask;

  currentMoveTask = runMoveCompletedEpisodes(options).finally(() => {
    currentMoveTask = undefined;
  });

  return currentMoveTask;
}

export function moveTask(options: MoveTaskOptions = {}) {
  return moveCompletedEpisodes(options);
}

async function runMoveCompletedEpisodes(options: MoveTaskOptions) {
  const config = loadConfig(options.configPath);
  const db = await createDb(options.dbPath);

  if (!Object.keys(db.data.active).length) return;

  const api = new QBittorrentApi(config.qbittorrent);
  await new Move(config, api, db).move();
}

export function startMoveTask() {
  logger.info(`Starting move task with ${MOVE_INTERVAL_MS}ms interval`);
  return runRecurringTask('move task', moveTask, MOVE_INTERVAL_MS);
}
