export interface SeasonConfig {
  rss: string;
  title: string;
  seasonNumber: number;
  match?: {
    title?: string[];
  };
}

export interface AppConfig {
  seasons: SeasonConfig[];
  download: {
    path: string;
    qBittorrent: {
      host: string;
      port: number;
      username: string;
      password: string;
      ssl: boolean;
    };
  };
  move: {
    root: string;
  };
}

export interface MikanSearchResult {
  id: number;
  title: string;
  url: string;
  imageUrl?: string;
}

export interface MikanBangumiGroup {
  id: number;
  name: string;
  rss: string;
}

export interface MikanBangumiDetail {
  id: number;
  title: string;
  url: string;
  rss: string;
  groups: MikanBangumiGroup[];
}

export interface AddSeasonPayload {
  rss: string;
  title: string;
  seasonNumber: number;
  matchTitle: string[];
}
