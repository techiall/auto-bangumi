import type { QBittorrentTorrentStatus } from '../qbittorrent/types.js';
import type { ActiveEpisode, CompletedEpisode, MoveJobRecord } from '../state/db.js';

export interface DownloadState {
  active: Record<string, ActiveEpisodeWithStatus>;
  moveJobs: Record<string, MoveJobWithStatus>;
  completed: Record<string, CompletedEpisodeWithStatus>;
}

export type ActiveEpisodeWithStatus = ActiveEpisode & {
  qbit?: QBittorrentTorrentStatus;
  qbitError?: string;
};

export type CompletedEpisodeWithStatus = CompletedEpisode & {
  qbit?: QBittorrentTorrentStatus;
  qbitError?: string;
};

export type MoveJobWithStatus = MoveJobRecord & {
  qbit?: QBittorrentTorrentStatus;
  qbitError?: string;
};

export type QbittorrentStatuses =
  | { statuses: Map<string, QBittorrentTorrentStatus>; error?: never }
  | { statuses?: never; error: string };

export interface DownloadWebSocketOptions {
  dbPath: string;
  path?: string;
  intervalMs?: number;
}
