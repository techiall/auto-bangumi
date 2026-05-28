import { JSONFilePreset } from 'lowdb/node';
import type { Episode } from '../mikan/episode.js';
import type { Season } from '../mikan/season.js';

interface EpisodeMetadataFallback {
  title?: string;
  folder?: string;
  season?: number;
}

// db.json is a runtime state file, not a config mirror.
// Torrent hashes are stored as map keys, while title/folder/season are resolved
// from config.yaml through subscriptionRss so config edits do not require a db migration.
// The optional metadata fields only preserve display context for legacy or orphaned records.
export interface ActiveEpisodeRecord extends Omit<Episode, 'torrent'>, EpisodeMetadataFallback {
  subscriptionRss?: string;
}

export interface ActiveEpisode extends Episode {
  title: string;
  folder: string;
  season: number;
  subscriptionRss?: string;
}

export interface CompletedEpisodeRecord extends EpisodeMetadataFallback {
  number: number;
  movedAt: string;
  qbitRemovedAt?: string;
  targetPath?: string;
  subscriptionRss?: string;
}

export interface CompletedEpisode extends CompletedEpisodeRecord {
  title: string;
  folder: string;
  season: number;
}

export interface Data {
  active: Record<string, ActiveEpisodeRecord>;
  completed: Record<string, CompletedEpisodeRecord>;
}

interface EpisodeRecord extends ActiveEpisodeRecord, EpisodeMetadataFallback {
  torrent: string;
  state: 'downloading' | 'moved';
}

interface EpisodeStateData {
  episodes?: Record<string, EpisodeRecord>;
}

interface LegacyData {
  seasons?: Array<Season & { alias?: string[] }>;
  manager?: Array<{
    episode: Episode;
    state: 'downloading' | 'moved';
  }>;
}

export function createDefaultData(): Data {
  return {
    active: {},
    completed: {},
  };
}

export async function createDb(dbPath = 'db/db.json') {
  const db = await JSONFilePreset<Data | EpisodeStateData | LegacyData>(dbPath, createDefaultData());
  db.data = normalizeData(db.data);
  return db as Awaited<ReturnType<typeof JSONFilePreset<Data>>>;
}

export type AppDb = Awaited<ReturnType<typeof createDb>>;

export function isTracked(data: Data, torrent: string) {
  return torrent in data.active || torrent in data.completed;
}

export function completeEpisode(data: Data, torrent: string, targetPath?: string, movedAt = new Date()) {
  const episode = data.active[torrent];
  if (!episode) return;

  data.completed[torrent] = {
    number: episode.number,
    movedAt: movedAt.toISOString(),
    ...(episode.subscriptionRss ? { subscriptionRss: episode.subscriptionRss } : fallbackMetadata(episode)),
    ...(targetPath ? { targetPath } : {}),
  };
  delete data.active[torrent];
}

export function markQbittorrentRemoved(data: Data, torrent: string, removedAt = new Date()) {
  const episode = data.completed[torrent];
  if (!episode) return;

  episode.qbitRemovedAt = removedAt.toISOString();
}

function normalizeData(data: Data | EpisodeStateData | LegacyData): Data {
  if ('active' in data && 'completed' in data) {
    return {
      active: Object.fromEntries(
        Object.entries(data.active ?? {}).map(([torrent, episode]) => [torrent, normalizeActiveEpisode(episode)]),
      ),
      completed: Object.fromEntries(
        Object.entries(data.completed ?? {}).map(([torrent, episode]) => [torrent, normalizeCompletedEpisode(episode)]),
      ),
    };
  }

  if ('episodes' in data && data.episodes) {
    return migrateEpisodeStateData(data);
  }

  return migrateLegacyData(data as LegacyData);
}

function migrateEpisodeStateData(data: EpisodeStateData): Data {
  const next = createDefaultData();

  for (const [torrent, episode] of Object.entries(data.episodes ?? {})) {
    if (episode.state === 'moved') {
      next.completed[torrent] = {
        number: episode.number,
        movedAt: new Date(0).toISOString(),
        ...fallbackMetadata(episode),
      };
    } else {
      next.active[torrent] = normalizeActiveEpisode(episode);
    }
  }

  return next;
}

function migrateLegacyData(data: LegacyData): Data {
  const next = createDefaultData();
  const seasonIndex = indexLegacySeasons(data.seasons ?? []);

  for (const manager of data.manager ?? []) {
    const season = seasonIndex.get(manager.episode.torrent);
    const episode = {
      ...manager.episode,
      title: season?.title ?? 'Unknown',
      folder: season?.folder ?? season?.title ?? 'Unknown',
      season: season?.season ?? 1,
    };

    if (manager.state === 'moved') {
      next.completed[episode.torrent] = {
        number: episode.number,
        movedAt: new Date(0).toISOString(),
        ...fallbackMetadata(episode),
      };
    } else {
      next.active[episode.torrent] = normalizeActiveEpisode(episode);
    }
  }

  return next;
}

function normalizeActiveEpisode(episode: ActiveEpisodeRecord | EpisodeRecord | ActiveEpisode): ActiveEpisodeRecord {
  return {
    number: episode.number,
    enclosureUrl: episode.enclosureUrl,
    ...(episode.subscriptionRss ? { subscriptionRss: episode.subscriptionRss } : fallbackMetadata(episode)),
  };
}

function normalizeCompletedEpisode(episode: CompletedEpisodeRecord | CompletedEpisode): CompletedEpisodeRecord {
  return {
    number: episode.number,
    movedAt: episode.movedAt,
    ...(episode.qbitRemovedAt ? { qbitRemovedAt: episode.qbitRemovedAt } : {}),
    ...(episode.targetPath ? { targetPath: episode.targetPath } : {}),
    ...(episode.subscriptionRss ? { subscriptionRss: episode.subscriptionRss } : fallbackMetadata(episode)),
  };
}

function fallbackMetadata(episode: EpisodeMetadataFallback): Required<EpisodeMetadataFallback> {
  const title = episode.title ?? 'Unknown';
  return {
    title,
    folder: episode.folder ?? title,
    season: episode.season ?? 1,
  };
}

function indexLegacySeasons(seasons: LegacyData['seasons']) {
  const index = new Map<string, Required<EpisodeMetadataFallback>>();

  for (const season of seasons ?? []) {
    for (const episode of season.episodes) {
      index.set(episode.torrent, {
        title: season.alias?.[0] ?? season.title,
        folder: season.alias?.[0] ?? season.title,
        season: season.number,
      });
    }
  }

  return index;
}
