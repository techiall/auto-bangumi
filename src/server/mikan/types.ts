export type { MikanBangumiDetail, MikanBangumiGroup, MikanSearchResult } from '../../shared/api-types.js';

export interface Episode {
  torrent: string;
  number: number;
  enclosureUrl: string;
}

export interface Season {
  title: string;
  folder: string;
  number: number;
  subscriptionRss: string;
  episodes: Episode[];
}
