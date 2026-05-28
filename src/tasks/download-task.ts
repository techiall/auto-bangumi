import { createDb, isTracked } from '../state/db.js';
import { logger } from '../config/logger.js';
import { loadConfig } from '../config/app-config.js';
import type { SubscriptionConfig } from '../config/app-config.js';
import { QBittorrentApi } from '../qbittorrent/api.js';
import { SeasonParse } from '../mikan/season.js';
import { runRecurringTask } from './task-runner.js';
import { pathToFileURL } from 'node:url';

const DOWNLOAD_INTERVAL_MS = 10 * 1000 * 60;

export interface DownloadTaskOptions {
  configPath?: string;
  dbPath?: string;
}

let currentSubscriptionScan: Promise<void> | undefined;

export async function downloadTask(options: DownloadTaskOptions = {}) {
  if (currentSubscriptionScan) return currentSubscriptionScan;

  currentSubscriptionScan = scanSubscriptions(options).finally(() => {
    currentSubscriptionScan = undefined;
  });

  return currentSubscriptionScan;
}

async function scanSubscriptions(options: DownloadTaskOptions) {
  const db = await createDb(options.dbPath);
  const config = loadConfig(options.configPath);
  const api = new QBittorrentApi(config.qbittorrent);

  const seasons = await parseSubscribedSeasons(config.subscriptions);
  let queuedCount = 0;

  for (const season of seasons) {
    for (const episode of season.episodes) {
      if (!isTracked(db.data, episode.torrent)) {
        logger.info(`Queueing ${season.title} S${season.number}E${episode.number}`);
        await api.download(episode);
        db.data.active[episode.torrent] = {
          number: episode.number,
          enclosureUrl: episode.enclosureUrl,
          subscriptionRss: season.subscriptionRss,
        };
        queuedCount += 1;
        await db.write();
      }
    }
  }

  if (queuedCount) {
    logger.info(`Subscription scan queued ${queuedCount} new episode${queuedCount === 1 ? '' : 's'}`);
  }
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
  logger.info(`Starting subscription scan with ${DOWNLOAD_INTERVAL_MS}ms interval`);
  return runRecurringTask('subscription scan', () => downloadTask(options), DOWNLOAD_INTERVAL_MS);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startDownloadTask();
}
