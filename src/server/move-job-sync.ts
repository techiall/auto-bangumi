import { loadConfig } from './config/app-config.js';
import { logger } from './config/logger.js';
import { QBittorrentApi } from './qbittorrent/api.js';
import { markQbittorrentRemoved, withDb } from './state/db.js';
import { runRecurringTask } from './tasks/task-runner.js';
import { MoverJobService } from './mover-jobs.js';
import { formatInterval } from './utils/format.js';
import type { MoveJobSyncOptions } from './tasks/types.js';

const MOVE_JOB_SYNC_INTERVAL_MS = Number(process.env.MOVE_JOB_SYNC_INTERVAL_MS ?? 30_000);

let currentSync: Promise<void> | undefined;

export async function syncMoveJobs(options: MoveJobSyncOptions = {}) {
  if (currentSync) return currentSync;

  currentSync = runMoveJobSync(options).finally(() => {
    currentSync = undefined;
  });

  return currentSync;
}

async function runMoveJobSync(options: MoveJobSyncOptions) {
  const dbPath = options.dbPath ?? 'db/state.sqlite';
  const { hasActiveEpisodes, hasMovedEpisodesToClean } = await withDb(dbPath, (db) => ({
    hasActiveEpisodes: Object.keys(db.data.active).length > 0,
    hasMovedEpisodesToClean: Object.values(db.data.completed).some((episode) => !episode.qbitRemovedAt),
  }));

  if (hasActiveEpisodes) {
    await new MoverJobService(dbPath).syncReadyJobs();
  }

  if (hasMovedEpisodesToClean) {
    await cleanupMovedEpisodes(dbPath);
  }
}

async function cleanupMovedEpisodes(dbPath: string) {
  const config = await loadConfig(dbPath);
  const api = new QBittorrentApi(config.qbittorrent);
  const torrents = await api.torrentsByHash();
  const candidates = await withDb(dbPath, (db) =>
    Object.entries(db.data.completed)
      .filter(([, episode]) => !episode.qbitRemovedAt)
      .map(([hash]) => hash),
  );
  const cleanedHashes: string[] = [];

  for (const hash of candidates) {
    const torrent = torrents.get(hash);
    if (!torrent) {
      cleanedHashes.push(hash);
      continue;
    }

    if (!torrent.canCleanupDownloadedFiles()) continue;

    await api.removeTorrent(hash, true);
    cleanedHashes.push(hash);
  }

  const cleaned = await withDb(dbPath, async (db) => {
    for (const hash of cleanedHashes) {
      markQbittorrentRemoved(db.data, hash);
    }

    if (cleanedHashes.length) await db.write();
    return cleanedHashes.length;
  });

  if (cleaned) logger.info(`Cleaned ${cleaned} moved torrent${cleaned === 1 ? '' : 's'} from qBittorrent`);
}

export function startMoveJobSync(options: MoveJobSyncOptions = {}) {
  logger.info(`Starting move job sync with ${formatInterval(MOVE_JOB_SYNC_INTERVAL_MS)} interval`);
  return runRecurringTask('move job sync', () => syncMoveJobs(options), MOVE_JOB_SYNC_INTERVAL_MS);
}
