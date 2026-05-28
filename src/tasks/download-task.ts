import { createDb, isTracked } from '../state/db.js';
import { logger } from '../config/logger.js';
import { loadConfig } from '../config/app-config.js';
import { QBittorrentApi } from '../qbittorrent/api.js';
import { SeasonParse } from '../mikan/season.js';
import { runRecurringTask } from './task-runner.js';
import { pathToFileURL } from 'node:url';

const DOWNLOAD_INTERVAL_MS = 10 * 1000 * 60;

export async function downloadTask() {
  const db = await createDb();
  const config = loadConfig();
  const api = new QBittorrentApi(config.qbittorrent);

  const seasons = await Promise.all(config.subscriptions.map((subscription) => new SeasonParse(subscription).parse()));

  for (const season of seasons) {
    for (const episode of season.episodes) {
      if (!isTracked(db.data, episode.torrent)) {
        logger.info(`Downloading ${season.title} S${season.number}E${episode.number}`);
        await api.download(episode);
        db.data.active[episode.torrent] = {
          number: episode.number,
          enclosureUrl: episode.enclosureUrl,
          subscriptionRss: season.subscriptionRss,
        };
        await db.write();
      }
    }
  }

  await db.write();
}

export function startDownloadTask() {
  logger.info('Starting download task');
  return runRecurringTask('download task', downloadTask, DOWNLOAD_INTERVAL_MS);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startDownloadTask();
}
