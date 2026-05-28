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
import { resolveActiveEpisodeMetadata, resolveCompletedEpisodeMetadata } from '../state/episode-metadata.js';
import { numberDisplayString } from '../utils/number.js';
import { buildFileServerUrl, copyFromFileServer, pickDownloadedFile } from '../files/file-transfer.js';
import { createLibraryTargetPath } from '../library/library-path.js';
import { runRecurringTask } from './task-runner.js';

const MOVE_INTERVAL_MS = Number(process.env.MOVE_INTERVAL_MS ?? 30_000);

type MoveEpisodeResult = 'moved' | 'existing' | 'missing' | 'pending' | 'recovered' | 'skipped';
type CleanupEpisodeResult = 'cleaned' | 'missing' | 'pending' | 'skipped';

interface MoveEpisodeOutcome {
  result: MoveEpisodeResult;
  episode: ActiveEpisode;
  targetPath?: string;
}

interface CleanupEpisodeOutcome {
  result: CleanupEpisodeResult;
  hash: string;
  displayName: string;
}

export interface ReconciliationTaskOptions {
  configPath?: string;
  dbPath?: string;
}

let currentReconciliation: Promise<void> | undefined;

export class DownloadReconciler {
  private readonly config: Config;
  private readonly api: QBittorrentApi;
  private readonly db: AppDb;

  constructor(config: Config, api: QBittorrentApi, db: AppDb) {
    this.config = config;
    this.api = api;
    this.db = db;
  }

  async reconcile() {
    const summary: Record<MoveEpisodeResult, number> = {
      moved: 0,
      existing: 0,
      missing: 0,
      pending: 0,
      recovered: 0,
      skipped: 0,
    };
    const torrents = await this.api.torrentsByHash();

    for (const [torrent, episode] of Object.entries(this.db.data.active)) {
      const activeEpisode = resolveActiveEpisodeMetadata(this.config, torrent, episode);
      const outcome = await this.moveEpisode(activeEpisode, torrents.get(torrent)).catch((error: unknown) => {
        logger.warn(`Failed to move ${this.episodeDisplayString(activeEpisode)}: ${(error as Error).message}`);
        return { result: 'skipped' as const, episode: activeEpisode };
      });
      summary[outcome.result] += 1;
      this.logMoveOutcome(outcome);
    }

    await this.cleanupMovedEpisodes(torrents);

    if (summary.moved || summary.recovered || summary.skipped) {
      logger.info(
        `Download reconciliation checked ${Object.values(summary).reduce((total, value) => total + value, 0)} active episodes: ` +
          `${summary.moved} moved, ${summary.pending} pending, ${summary.recovered} restored in qBittorrent, ` +
          `${summary.existing} already existed, ${summary.missing} missing, ${summary.skipped} skipped`,
      );
    }
  }

  private episodeDisplayString(episode: ActiveEpisode) {
    return `${episode.title} S${numberDisplayString(episode.season)}E${numberDisplayString(episode.number)}`;
  }

  private async moveEpisode(
    episode: ActiveEpisode,
    torrent: QBittorrentTorrent | undefined,
  ): Promise<MoveEpisodeOutcome> {
    if (!torrent) {
      try {
        await this.api.download(episode);
        return { result: 'recovered', episode };
      } catch (error) {
        logger.warn(
          `Failed to restore ${this.episodeDisplayString(episode)} in qBittorrent: ${(error as Error).message}`,
        );
        return { result: 'missing', episode };
      }
    }

    if (!torrent.canMove()) {
      return { result: 'pending', episode };
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

    if (await fileExists(target.writePath)) {
      completeEpisode(this.db.data, episode.torrent, target.displayPath);
      await this.db.write();
      return { result: 'existing', episode, targetPath: target.displayPath };
    }

    if (this.config.qbittorrent.fileServer) {
      const url = buildFileServerUrl(this.config.qbittorrent, downloadedFile.remotePath);
      await copyFromFileServer(this.config.qbittorrent.fileServer, url, target.writePath);
    } else {
      if ((await fs.lstat(downloadedFile.remotePath)).isDirectory()) {
        logger.warn(`${this.episodeDisplayString(episode)} is a directory, skipping move`);
        return { result: 'skipped', episode };
      }
      await fs.copyFile(downloadedFile.remotePath, target.writePath, fsConstants.COPYFILE_FICLONE);
    }

    completeEpisode(this.db.data, episode.torrent, target.displayPath);
    await this.db.write();
    return { result: 'moved', episode, targetPath: target.displayPath };
  }

  private logMoveOutcome(outcome: MoveEpisodeOutcome) {
    if (outcome.result === 'moved') {
      logger.info(`Moved ${this.episodeDisplayString(outcome.episode)} to ${outcome.targetPath}`);
      return;
    }

    if (outcome.result === 'existing') {
      logger.warn(`Skipped ${this.episodeDisplayString(outcome.episode)} because ${outcome.targetPath} already exists`);
      return;
    }

    if (outcome.result === 'recovered') {
      logger.info(`Restored ${this.episodeDisplayString(outcome.episode)} in qBittorrent`);
    }
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

      const completed = resolveCompletedEpisodeMetadata(this.config, episode);
      const displayName = `${completed.title} S${numberDisplayString(completed.season)}E${numberDisplayString(
        completed.number,
      )}`;
      const outcome = await this.cleanupMovedEpisode(hash, displayName, torrents.get(hash));
      summary[outcome.result] += 1;
      this.logCleanupOutcome(outcome);
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
    displayName: string,
    torrent: QBittorrentTorrent | undefined,
  ): Promise<CleanupEpisodeOutcome> {
    if (!torrent) return { result: 'missing', hash, displayName };
    if (!torrent.canCleanupDownloadedFiles()) return { result: 'pending', hash, displayName };

    await this.api.removeTorrent(hash, true);
    markQbittorrentRemoved(this.db.data, hash);
    await this.db.write();
    return { result: 'cleaned', hash, displayName };
  }

  private logCleanupOutcome(outcome: CleanupEpisodeOutcome) {
    if (outcome.result === 'cleaned') {
      logger.info(`Removed moved torrent ${outcome.displayName} (${outcome.hash}) from qBittorrent`);
    }
  }
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function reconcileCompletedDownloads(options: ReconciliationTaskOptions = {}) {
  if (currentReconciliation) return currentReconciliation;

  currentReconciliation = runDownloadReconciliation(options).finally(() => {
    currentReconciliation = undefined;
  });

  return currentReconciliation;
}

export function reconcileDownloads(options: ReconciliationTaskOptions = {}) {
  return reconcileCompletedDownloads(options);
}

async function runDownloadReconciliation(options: ReconciliationTaskOptions) {
  const config = loadConfig(options.configPath);
  const db = await createDb(options.dbPath);

  const hasActiveEpisodes = Object.keys(db.data.active).length > 0;
  const hasMovedEpisodesToClean = Object.values(db.data.completed).some((episode) => !episode.qbitRemovedAt);
  if (!hasActiveEpisodes && !hasMovedEpisodesToClean) return;

  const api = new QBittorrentApi(config.qbittorrent);
  await new DownloadReconciler(config, api, db).reconcile();
}

export function startDownloadReconciliation() {
  logger.info(`Starting download reconciliation with ${MOVE_INTERVAL_MS}ms interval`);
  return runRecurringTask('download reconciliation', reconcileDownloads, MOVE_INTERVAL_MS);
}
