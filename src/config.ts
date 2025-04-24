import path from 'node:path';
import * as fs from 'node:fs';
import jsyaml from 'js-yaml';

export function loadConfig(configPath: string | undefined = 'config/config.yaml'): Config {
  return jsyaml.load(fs.readFileSync(path.join(configPath), 'utf-8')) as Config;
}

export interface Config {
  seasons: SeasonConfig[],
  download: DownloadConfig
  move: MoveConfig
}

export interface SeasonConfig {
  rss: string,
  title: string,
  alias: string[]
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
