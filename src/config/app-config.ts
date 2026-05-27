import path from 'node:path';
import * as fs from 'node:fs';
import jsyaml from 'js-yaml';

const defaultFileServerConfig: FileServerConfig = {
  host: 'file-export',
  port: 80,
  ssl: false,
  root: '/downloads',
};

const defaultQbittorrentConfig: QbittorrentConfig = {
  host: 'qbittorrent',
  port: 8080,
  username: 'admin',
  password: 'adminadmin',
  ssl: false,
  downloadPath: '/downloads',
  fileServer: defaultFileServerConfig,
};
export function loadConfig(configPath = 'config/config.yaml'): Config {
  const loaded = jsyaml.load(fs.readFileSync(path.join(configPath), 'utf-8')) as ConfigFile;
  return normalizeConfig(loaded);
}

export function saveConfig(config: Config, configPath = 'config/config.yaml') {
  fs.writeFileSync(
    path.join(configPath),
    jsyaml.dump(toConfigFile(normalizeConfig(config)), {
      noRefs: true,
      lineWidth: 120,
      sortKeys: false,
    }),
    'utf-8',
  );
}

function normalizeConfig(config: ConfigFile): Config {
  return {
    subscriptions: (config.subscriptions ?? []).map(normalizeSubscription),
    qbittorrent: normalizeQbittorrent(config.qbittorrent),
    library: normalizeLibrary(config.library),
  };
}

function normalizeSubscription(subscription: SubscriptionConfigFile): SubscriptionConfig {
  return {
    rss: subscription.rss,
    title: subscription.title,
    season: subscription.season ?? 1,
    filters: subscription.filters?.filter((filter) => filter.length > 0) || undefined,
  };
}

function normalizeQbittorrent(config: PartialQbittorrentConfig | undefined): QbittorrentConfig {
  return {
    ...defaultQbittorrentConfig,
    ...config,
    fileServer:
      config?.fileServer === null
        ? undefined
        : {
            ...defaultFileServerConfig,
            ...config?.fileServer,
          },
  };
}

function normalizeLibrary(library: ConfigFile['library']): LibraryConfig {
  if (typeof library === 'string') {
    return { root: library };
  }

  return {
    root: library?.root ?? '',
  };
}

function toConfigFile(config: Config): ConfigFile {
  return {
    subscriptions: config.subscriptions.map((subscription) => ({
      title: subscription.title,
      ...(subscription.season === 1 ? {} : { season: subscription.season }),
      rss: subscription.rss,
      ...(subscription.filters?.length ? { filters: subscription.filters } : {}),
    })),
    ...(isDefaultQbittorrent(config.qbittorrent) ? {} : { qbittorrent: config.qbittorrent }),
    library: config.library.root,
  };
}

function isDefaultQbittorrent(config: QbittorrentConfig) {
  return JSON.stringify(config) === JSON.stringify(defaultQbittorrentConfig);
}

export interface Config {
  subscriptions: SubscriptionConfig[];
  qbittorrent: QbittorrentConfig;
  library: LibraryConfig;
}

interface ConfigFile {
  subscriptions?: SubscriptionConfigFile[];
  qbittorrent?: PartialQbittorrentConfig;
  library?: string | Partial<LibraryConfig>;
}

interface SubscriptionConfigFile {
  rss: string;
  title: string;
  season?: number;
  filters?: string[];
}

export interface SubscriptionConfig {
  rss: string;
  title: string;
  season: number;
  filters?: string[];
}

type PartialQbittorrentConfig = Partial<Omit<QbittorrentConfig, 'fileServer'>> & {
  fileServer?: Partial<FileServerConfig> | null;
};

export interface QbittorrentConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  downloadPath: string;
  fileServer?: FileServerConfig;
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

export interface LibraryConfig {
  root: string;
}
