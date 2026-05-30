export interface SubscriptionConfig {
  rss: string;
  title: string;
  folder: string;
  season: number;
  filters?: string[];
  archived: boolean;
}

export interface AppConfig {
  subscriptions: SubscriptionConfig[];
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
  archived?: boolean;
}

export interface UpdateSeasonPayload {
  folder: string;
  season: number;
  filters: string[];
  archived?: boolean;
}

export interface RssRefreshResult {
  subscriptionCount: number;
  activeSubscriptionCount: number;
  archivedSubscriptionCount: number;
  parsedSubscriptionCount: number;
  queuedCount: number;
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
  qbit?: QbittorrentDownloadStatus;
  qbitError?: string;
}

export interface MoveJobDownload {
  status: 'ready' | 'moving' | 'failed';
  title?: string;
  folder?: string;
  season?: number;
  number: number;
  subscriptionRss?: string;
  targetRelativePath: string;
  sourceRemotePath: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  error?: string;
  leaseExpiresAt?: string;
  qbit?: QbittorrentDownloadStatus;
  qbitError?: string;
}

export interface DownloadState {
  active: Record<string, ActiveDownload>;
  moveJobs: Record<string, MoveJobDownload>;
  completed: Record<string, CompletedDownload>;
}

export interface QbittorrentDownloadStatus {
  progress: number;
  ratio: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number;
  seedingTime: number;
  state: string;
  stateMessage: string;
  connectedSeeds: number;
  connectedPeers: number;
  totalSeeds: number;
  totalPeers: number;
  totalSize: number;
  totalUploaded: number;
}
