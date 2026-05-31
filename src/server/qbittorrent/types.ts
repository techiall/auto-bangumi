import type { TorrentState } from '@ctrl/shared-torrent';
import type { QbittorrentDownloadStatus } from '../../shared/api-types.js';

export interface QBittorrentTorrent {
  torrentHash: string;
  state: TorrentState;
  rawState: string;
  downloadPath: string;

  canMove(): boolean;
  canCleanupDownloadedFiles(): boolean;
}

export type QBittorrentTorrentStatus = QbittorrentDownloadStatus;
