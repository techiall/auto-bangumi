import path from 'node:path';
import * as fs from 'node:fs';
import jsyaml from 'js-yaml';

export function loadConfig(configPath: string | undefined = 'config/config.yaml'): Config {
  const loaded = jsyaml.load(fs.readFileSync(path.join(configPath), 'utf-8')) as Config;
  return normalizeConfig(loaded);
}

export function saveConfig(config: Config, configPath: string | undefined = 'config/config.yaml') {
  fs.writeFileSync(path.join(configPath), jsyaml.dump(normalizeConfig(config), {
    noRefs: true,
    lineWidth: 120,
  }), 'utf-8');
}

function normalizeConfig(config: Config): Config {
  return {
    ...config,
    seasons: (config.seasons ?? []).map(season => ({
      ...season,
      match: season.match?.title?.length ? season.match : undefined,
    })),
  };
}

export interface Config {
  seasons: SeasonConfig[],
  download: DownloadConfig
  move: MoveConfig
}

export interface SeasonConfig {
  rss: string,
  title: string,
  seasonNumber: number
  match: SeasonMatchConfig | undefined
}

export interface SeasonMatchConfig {
  title: string[] | undefined;
}

export interface DownloadConfig {
  path: string;
  qBittorrent: QbittorrentConfig;
}

export interface QbittorrentConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
}

export interface MoveConfig {
  root: string;
}
