import type { ActiveDownload, CompletedDownload, DownloadState, MoveJobDownload } from '~/types';

export type DownloadRow =
  | ({ hash: string; state: 'active' } & ActiveDownload)
  | ({ hash: string; state: 'moveJob' } & MoveJobDownload)
  | ({ hash: string; state: 'completed' } & CompletedDownload);

export type CompletedDownloadRow = { hash: string; state: 'completed' } & CompletedDownload;
export type MoveJobDownloadRow = { hash: string; state: 'moveJob' } & MoveJobDownload;

export type DownloadPriority = 'attention' | 'active' | 'history';

export interface DownloadSummary {
  activeCount: number;
  moveJobCount: number;
  attentionCount: number;
  completedCount: number;
  seedingCount: number;
  downloadSpeed: number;
  uploadSpeed: number;
}

export type DownloadMessage = { type: 'state'; data: DownloadState } | { type: 'error'; message: string };
