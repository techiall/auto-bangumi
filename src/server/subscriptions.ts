import { loadConfig, saveSubscriptions } from './config/app-config.js';
import type { Config } from './config/app-config.js';
import { logger } from './config/logger.js';
import { QBittorrentApi } from './qbittorrent/api.js';
import { withDb } from './state/db.js';
import { HttpError } from './http-error.js';
import {
  parseSeasonPayload,
  parseSeasonUpdatePayload,
  type SeasonPayload,
  type SeasonUpdatePayload,
} from './season-payload.js';

export interface PublicConfig {
  subscriptions: Config['subscriptions'];
}

export class SubscriptionService {
  constructor(private readonly dbPath: string) {}

  async list(): Promise<PublicConfig> {
    return toPublicConfig(await loadConfig(this.dbPath));
  }

  async add(payload: SeasonPayload): Promise<PublicConfig> {
    const season = parseSeasonPayload(payload);
    const config = await loadConfig(this.dbPath);

    if (config.subscriptions.some((existing) => existing.rss === season.rss)) {
      throw new HttpError(409, 'This RSS already exists in config.');
    }

    config.subscriptions.push(season);
    return this.save(config);
  }

  async update(index: number, payload: SeasonUpdatePayload): Promise<PublicConfig> {
    const config = await loadConfig(this.dbPath);
    const current = this.find(config, index);

    config.subscriptions[index] = {
      ...current,
      ...parseSeasonUpdatePayload(payload, current),
    };

    return this.save(config);
  }

  async delete(index: number): Promise<PublicConfig> {
    const config = await loadConfig(this.dbPath);
    const subscription = this.find(config, index);

    await this.cleanupSubscription(subscription.rss, config);
    config.subscriptions.splice(index, 1);
    return this.save(config);
  }

  private async cleanupSubscription(rss: string, config: Config) {
    const hashes = await withDb(this.dbPath, (db) => [
      ...Object.entries(db.data.active)
        .filter(([, episode]) => episode.subscriptionRss === rss)
        .map(([hash]) => hash),
      ...Object.entries(db.data.completed)
        .filter(([, episode]) => episode.subscriptionRss === rss)
        .map(([hash]) => hash),
      ...Object.entries(db.data.moveJobs)
        .filter(([, job]) => job.subscriptionRss === rss)
        .map(([hash]) => hash),
    ]);

    if (!hashes.length) return;

    const api = new QBittorrentApi(config.qbittorrent);
    let removedFromQbittorrent = 0;
    let failedQbittorrentRemovals = 0;

    for (const hash of hashes) {
      const removed = await this.removeTorrent(api, hash);
      if (removed) {
        removedFromQbittorrent += 1;
      } else {
        failedQbittorrentRemovals += 1;
      }
    }

    await withDb(this.dbPath, async (db) => {
      for (const hash of hashes) {
        delete db.data.active[hash];
        delete db.data.moveJobs[hash];
        delete db.data.completed[hash];
      }
      await db.write();
    });
    logger.info(
      `Removed subscription state for ${rss}: ${hashes.length} db record${hashes.length === 1 ? '' : 's'}, ` +
        `${removedFromQbittorrent} qBittorrent torrent${removedFromQbittorrent === 1 ? '' : 's'} removed` +
        (failedQbittorrentRemovals ? `, ${failedQbittorrentRemovals} qBittorrent removal failed` : ''),
    );
  }

  private async removeTorrent(api: QBittorrentApi, hash: string) {
    try {
      return await api.removeTorrent(hash, true);
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Torrent not found') return true;

      logger.warn(`Failed to remove torrent ${hash} from qBittorrent: ${message}`);
      return false;
    }
  }

  private find(config: Config, index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= config.subscriptions.length) {
      throw new HttpError(404, 'Subscription not found.');
    }

    return config.subscriptions[index];
  }

  private async save(config: Config) {
    return toPublicConfig(await saveSubscriptions(config.subscriptions, this.dbPath));
  }
}

function toPublicConfig(config: Config): PublicConfig {
  return {
    subscriptions: config.subscriptions,
  };
}
