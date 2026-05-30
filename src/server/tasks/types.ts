export interface DownloadTaskOptions {
  dbPath?: string;
}

export interface MoveJobSyncOptions {
  dbPath?: string;
}

export interface SubscriptionScanResult {
  subscriptionCount: number;
  activeSubscriptionCount: number;
  archivedSubscriptionCount: number;
  parsedSubscriptionCount: number;
  queuedCount: number;
}
