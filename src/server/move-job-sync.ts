import { loadConfig } from './config/app-config.js';
import { logger } from './config/logger.js';
import { QBittorrentApi } from './qbittorrent/api.js';
import { markQbittorrentRemoved, withDb } from './state/db.js';
import { runRecurringTask } from './tasks/task-runner.js';
import { MoverJobService } from './mover-jobs.js';
import { formatInterval } from './utils/format.js';

const MOVE_JOB_SYNC_INTERVAL_MS = Number(process.env.MOVE_JOB_SYNC_INTERVAL_MS ?? 30_000);

export interface MoveJobSyncOptions {
  dbPath?: string;
}

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
  const cleaned = await withDb(dbPath, async (db) => {
    let cleaned = 0;

    for (const [hash, episode] of Object.entries(db.data.completed)) {
      if (episode.qbitRemovedAt) continue;

      const torrent = torrents.get(hash);
      if (!torrent) {
        markQbittorrentRemoved(db.data, hash);
        cleaned += 1;
        continue;
      }

      if (!torrent.canCleanupDownloadedFiles()) continue;

      await api.removeTorrent(hash, true);
      markQbittorrentRemoved(db.data, hash);
      cleaned += 1;
    }

    if (cleaned) await db.write();
    return cleaned;
  });

  if (cleaned) logger.info(`Cleaned ${cleaned} moved torrent${cleaned === 1 ? '' : 's'} from qBittorrent`);
}

export function startMoveJobSync(options: MoveJobSyncOptions = {}) {
  logger.info(`Starting move job sync with ${formatInterval(MOVE_JOB_SYNC_INTERVAL_MS)} interval`);
  return runRecurringTask('move job sync', () => syncMoveJobs(options), MOVE_JOB_SYNC_INTERVAL_MS);
}
