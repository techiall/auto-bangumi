import { withDb } from '../state/db.js';
import type { SubscriptionConfig } from '../../shared/api-types.js';
export type { SubscriptionConfig } from '../../shared/api-types.js';

export async function loadConfig(dbPath = 'db/state.sqlite'): Promise<Config> {
  return withDb(dbPath, (db) => ({
    subscriptions: db.data.subscriptions,
    qbittorrent: normalizeQbittorrent(),
  }));
}

export async function saveSubscriptions(
  subscriptions: SubscriptionConfig[],
  dbPath = 'db/state.sqlite',
): Promise<Config> {
  return withDb(dbPath, async (db) => {
    db.data.subscriptions = subscriptions.map(normalizeSubscription);
    await db.write();

    return {
      subscriptions: db.data.subscriptions,
      qbittorrent: normalizeQbittorrent(),
    };
  });
}

export function normalizeSubscription(subscription: SubscriptionConfig): SubscriptionConfig {
  return {
    rss: subscription.rss,
    title: subscription.title,
    folder: subscription.folder?.trim() || subscription.title,
    season: subscription.season ?? 1,
    filters: subscription.filters?.filter((filter) => filter.length > 0) || undefined,
    archived: subscription.archived === true,
  };
}

function normalizeQbittorrent(): QbittorrentConfig {
  const qbittorrent = createDefaultQbittorrentConfig();

  return {
    ...qbittorrent,
    fileServer: createDefaultFileServerConfig(qbittorrent),
  };
}

function createDefaultQbittorrentConfig(): Omit<QbittorrentConfig, 'fileServer'> {
  const downloadPath = envString('QBITTORRENT_DOWNLOAD_PATH', '/downloads');

  return {
    host: envString('QBITTORRENT_HOST', 'qbittorrent'),
    port: envNumber('QBITTORRENT_PORT', 8080),
    username: envString('QBITTORRENT_USERNAME', 'admin'),
    password: envString('QBITTORRENT_PASSWORD', 'adminadmin'),
    ssl: envBoolean('QBITTORRENT_SSL', false),
    downloadPath,
    trackers: envList('QBITTORRENT_TRACKERS'),
    trackerUrls: envList('QBITTORRENT_TRACKER_URLS', ['https://cf.trackerslist.com/all.txt']),
  };
}

function createDefaultFileServerConfig(config: Pick<QbittorrentConfig, 'downloadPath'>): FileServerConfig {
  return {
    host: envString('QBITTORRENT_FILE_SERVER_HOST', envString('QBITTORRENT_HOST', 'qbittorrent')),
    port: envNumber('QBITTORRENT_FILE_SERVER_PORT', 8081),
    ssl: envBoolean('QBITTORRENT_FILE_SERVER_SSL', false),
    root: envString('QBITTORRENT_FILE_SERVER_ROOT', config.downloadPath),
    ...(process.env.QBITTORRENT_FILE_SERVER_BASE_PATH?.trim()
      ? { basePath: process.env.QBITTORRENT_FILE_SERVER_BASE_PATH.trim() }
      : {}),
    ...(process.env.QBITTORRENT_FILE_SERVER_USERNAME?.trim()
      ? { username: process.env.QBITTORRENT_FILE_SERVER_USERNAME.trim() }
      : {}),
    ...(process.env.QBITTORRENT_FILE_SERVER_PASSWORD?.trim()
      ? { password: process.env.QBITTORRENT_FILE_SERVER_PASSWORD.trim() }
      : {}),
  };
}

function envString(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
}

function envList(name: string, fallback: string[] = []) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface Config {
  subscriptions: SubscriptionConfig[];
  qbittorrent: QbittorrentConfig;
}

export interface QbittorrentConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  downloadPath: string;
  trackers: string[];
  trackerUrls: string[];
  fileServer: FileServerConfig;
}

export interface FileServerConfig {
  host: string;
  port: number;
  ssl: boolean;
  root?: string;
  basePath?: string;
  username?: string;
  password?: string;
}
