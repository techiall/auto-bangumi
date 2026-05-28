export interface SubscriptionConfig {
  rss: string;
  title: string;
  folder: string;
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
    trackers?: string[];
    trackerUrls?: string[];
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
  folder: string;
  url: string;
  rss: string;
  groups: MikanBangumiGroup[];
}

export interface AddSeasonPayload {
  rss: string;
  title: string;
  folder: string;
  season: number;
  filters: string[];
}

export interface UpdateSeasonPayload {
  folder: string;
  season: number;
  filters: string[];
}

export interface ActiveDownload {
  torrent: string;
  title: string;
  folder?: string;
  season: number;
  subscriptionRss?: string;
  number: number;
  enclosureUrl: string;
  qbit?: QbittorrentDownloadStatus;
  qbitError?: string;
}

export interface CompletedDownload {
  title: string;
  folder?: string;
  season: number;
  number: number;
  movedAt: string;
  qbitRemovedAt?: string;
  targetPath?: string;
}

export interface DownloadState {
  active: Record<string, ActiveDownload>;
  completed: Record<string, CompletedDownload>;
}

export interface QbittorrentDownloadStatus {
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number;
  state: string;
  stateMessage: string;
  connectedSeeds: number;
  connectedPeers: number;
  totalSeeds: number;
  totalPeers: number;
  totalSize: number;
}
