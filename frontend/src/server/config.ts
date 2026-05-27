import fs from 'node:fs';
import path from 'node:path';
import jsyaml from 'js-yaml';

const configPath = resolveConfigPath();

export interface Config {
  seasons: SeasonConfig[];
  download: DownloadConfig;
  move: MoveConfig;
}

export interface SeasonConfig {
  rss: string;
  title: string;
  seasonNumber: number;
  match?: SeasonMatchConfig;
}

export interface SeasonMatchConfig {
  title?: string[];
}

export interface DownloadConfig {
  path: string;
  qBittorrent: {
    host: string;
    port: number;
    username: string;
    password: string;
    ssl: boolean;
  };
}

export interface MoveConfig {
  root: string;
}

export function loadConfig(): Config {
  const loaded = jsyaml.load(fs.readFileSync(configPath, 'utf-8')) as Config;
  return normalizeConfig(loaded);
}

export function saveConfig(config: Config) {
  fs.writeFileSync(
    configPath,
    jsyaml.dump(normalizeConfig(config), {
      noRefs: true,
      lineWidth: 120,
    }),
    'utf-8',
  );
}

function normalizeConfig(config: Config): Config {
  return {
    ...config,
    seasons: (config.seasons ?? []).map((season) => ({
      ...season,
      match: season.match?.title?.length ? season.match : undefined,
    })),
  };
}

function resolveConfigPath() {
  const candidates = [
    path.resolve(process.cwd(), 'config/config.yaml'),
    path.resolve(process.cwd(), '../config/config.yaml'),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error('Could not locate config/config.yaml.');
  }

  return resolved;
}
