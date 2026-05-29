import { isTracked, withDb } from '../state/db.js';
import type { Data } from '../state/db.js';
import { logger } from '../config/logger.js';
import { loadConfig } from '../config/app-config.js';
import type { SubscriptionConfig } from '../config/app-config.js';
import { QBittorrentApi } from '../qbittorrent/api.js';
import { SeasonParse } from '../mikan/season.js';
import { runRecurringTask } from './task-runner.js';
import { pathToFileURL } from 'node:url';
import { formatInterval } from '../utils/format.js';
import type { Episode } from '../mikan/episode.js';
import type { Season } from '../mikan/season.js';

const DOWNLOAD_INTERVAL_MS = 10 * 1000 * 60;
const DOWNLOAD_CONCURRENCY = 4;

export interface DownloadTaskOptions {
  dbPath?: string;
}

export interface SubscriptionScanResult {
  subscriptionCount: number;
  activeSubscriptionCount: number;
  archivedSubscriptionCount: number;
  parsedSubscriptionCount: number;
  queuedCount: number;
}

let currentSubscriptionScan: Promise<SubscriptionScanResult> | undefined;

export async function downloadTask(options: DownloadTaskOptions = {}) {
  if (currentSubscriptionScan) return currentSubscriptionScan;

  currentSubscriptionScan = scanSubscriptions(options).finally(() => {
    currentSubscriptionScan = undefined;
  });

  return currentSubscriptionScan;
}

async function scanSubscriptions(options: DownloadTaskOptions): Promise<SubscriptionScanResult> {
  const config = await loadConfig(options.dbPath);
  const api = new QBittorrentApi(config.qbittorrent);
  const activeSubscriptions = config.subscriptions.filter((subscription) => !subscription.archived);
  const archivedSubscriptionCount = config.subscriptions.length - activeSubscriptions.length;

  const seasons = await parseSubscribedSeasons(activeSubscriptions);
  const data = await withDb(options.dbPath, (db) => db.data);
  const candidates = collectNewEpisodes(data, seasons);
  if (!candidates.length) {
    return {
      subscriptionCount: config.subscriptions.length,
      activeSubscriptionCount: activeSubscriptions.length,
      archivedSubscriptionCount,
      parsedSubscriptionCount: seasons.length,
      queuedCount: 0,
    };
  }

  const knownTorrentHashes = await api.torrentHashes();
  let queuedCount = 0;
  const queuedEpisodes = new Map<string, Data['active'][string]>();

  await runWithConcurrency(candidates, DOWNLOAD_CONCURRENCY, async ({ season, episode }) => {
    logger.info(`Queueing ${season.title} S${season.number}E${episode.number}`);
    await api.download(episode, knownTorrentHashes);

    knownTorrentHashes.add(episode.torrent);
    queuedEpisodes.set(episode.torrent, {
      number: episode.number,
      enclosureUrl: episode.enclosureUrl,
      subscriptionRss: season.subscriptionRss,
    });
    queuedCount += 1;
  });

  if (queuedCount) {
    await withDb(options.dbPath, async (db) => {
      for (const [torrent, episode] of queuedEpisodes) {
        if (isTracked(db.data, torrent)) continue;
        db.data.active[torrent] = episode;
      }
      await db.write();
    });
  }

  if (queuedCount) {
    logger.info(`Subscription scan queued ${queuedCount} new episode${queuedCount === 1 ? '' : 's'}`);
  }
  if (archivedSubscriptionCount) {
    logger.info(
      `Subscription scan skipped ${archivedSubscriptionCount} archived subscription${
        archivedSubscriptionCount === 1 ? '' : 's'
      }`,
    );
  }

  return {
    subscriptionCount: config.subscriptions.length,
    activeSubscriptionCount: activeSubscriptions.length,
    archivedSubscriptionCount,
    parsedSubscriptionCount: seasons.length,
    queuedCount,
  };
}

function collectNewEpisodes(data: Data, seasons: Season[]) {
  const queued = new Set<string>();
  const candidates: Array<{ season: Season; episode: Episode }> = [];

  for (const season of seasons) {
    for (const episode of season.episodes) {
      if (queued.has(episode.torrent) || isTracked(data, episode.torrent)) continue;

      queued.add(episode.torrent);
      candidates.push({ season, episode });
    }
  }

  return candidates;
}

async function runWithConcurrency<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;
        await task(item);
      }
    }),
  );
}

async function parseSubscribedSeasons(subscriptions: SubscriptionConfig[]) {
  const results = await Promise.allSettled(subscriptions.map((subscription) => new SeasonParse(subscription).parse()));

  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return [result.value];

    logger.warn(`Failed to parse subscribed RSS: ${(result.reason as Error).message}`);
    return [];
  });
}

export function startDownloadTask(options: DownloadTaskOptions = {}) {
  logger.info(`Starting subscription scan with ${formatInterval(DOWNLOAD_INTERVAL_MS)} interval`);
  return runRecurringTask('subscription scan', () => downloadTask(options), DOWNLOAD_INTERVAL_MS);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startDownloadTask();
}
