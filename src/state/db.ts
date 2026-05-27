import { JSONFilePreset } from 'lowdb/node';
import type { Episode } from '../mikan/episode.js';
import type { Season } from '../mikan/season.js';

export interface ActiveEpisode extends Episode {
  title: string;
  season: number;
}

export interface CompletedEpisode {
  title: string;
  season: number;
  number: number;
  movedAt: string;
}

export interface Data {
  active: Record<string, ActiveEpisode>;
  completed: Record<string, CompletedEpisode>;
}

interface EpisodeRecord extends ActiveEpisode {
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

export function isTracked(data: Data, torrent: string) {
  return torrent in data.active || torrent in data.completed;
}

export function completeEpisode(data: Data, torrent: string, movedAt = new Date()) {
  const episode = data.active[torrent];
  if (!episode) return;

  data.completed[torrent] = {
    title: episode.title,
    season: episode.season,
    number: episode.number,
    movedAt: movedAt.toISOString(),
  };
  delete data.active[torrent];
}

function normalizeData(data: Data | EpisodeStateData | LegacyData): Data {
  if ('active' in data && 'completed' in data) {
    return {
      active: data.active ?? {},
      completed: data.completed ?? {},
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
        title: episode.title,
        season: episode.season,
        number: episode.number,
        movedAt: new Date(0).toISOString(),
      };
    } else {
      next.active[torrent] = {
        torrent: episode.torrent,
        number: episode.number,
        enclosureUrl: episode.enclosureUrl,
        title: episode.title,
        season: episode.season,
      };
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
      season: season?.season ?? 1,
    };

    if (manager.state === 'moved') {
      next.completed[episode.torrent] = {
        title: episode.title,
        season: episode.season,
        number: episode.number,
        movedAt: new Date(0).toISOString(),
      };
    } else {
      next.active[episode.torrent] = episode;
    }
  }

  return next;
}

function indexLegacySeasons(seasons: LegacyData['seasons']) {
  const index = new Map<string, Pick<ActiveEpisode, 'title' | 'season'>>();

  for (const season of seasons ?? []) {
    for (const episode of season.episodes) {
      index.set(episode.torrent, {
        title: season.alias?.[0] ?? season.title,
        season: season.number,
      });
    }
  }

  return index;
}

export const db = await createDb();
