export interface SubscriptionConfig {
  rss: string;
  title: string;
  season: number;
  filters?: string[];
}

export interface AppConfig {
  subscriptions: SubscriptionConfig[];
  qbittorrent: {
    host: string;
    port: number;
    username: string;
    password: string;
    ssl: boolean;
    downloadPath: string;
  };
  library: {
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
  season: number;
  filters: string[];
}
