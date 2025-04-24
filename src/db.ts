import { Season } from './season.js';
import { Episode } from './episode.js';
import { JSONFilePreset } from 'lowdb/node';


export enum State {
  DOWNLOADING = 'downloading',
  MOVED = 'moved'
}

export interface SeasonEpisodeManager {
  episode: Episode,
  state: State,
}

export type Data = {
  seasons: Season[],
  manager: SeasonEpisodeManager[]
}

export const db = await JSONFilePreset<Data>('db/db.json', {
  seasons: [],
  manager: [],
});
