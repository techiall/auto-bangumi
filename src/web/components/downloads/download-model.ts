import type {
  CompletedDownloadRow,
  DownloadRow,
  DownloadSummary,
  MoveJobDownloadRow,
} from '~/components/downloads/download-types';
import type { DownloadState } from '~/types';

export function buildDownloadRows(data: DownloadState): DownloadRow[] {
  const activeRows = Object.entries(data.active).map(
    ([hash, episode]): DownloadRow => ({
      ...episode,
      hash,
      state: 'active',
    }),
  );

  const completedRows = Object.entries(data.completed)
    .map(
      ([hash, episode]): CompletedDownloadRow => ({
        ...episode,
        hash,
        state: 'completed',
      }),
    )
    .sort((first, second) => second.movedAt.localeCompare(first.movedAt));

  const moveJobRows = Object.entries(data.moveJobs ?? {})
    .map(
      ([hash, job]): MoveJobDownloadRow => ({
        ...job,
        hash,
        state: 'moveJob',
      }),
    )
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  return [...activeRows, ...moveJobRows, ...completedRows];
}

export function splitDownloadRows(rows: DownloadRow[]) {
  const attentionRows = rows.filter(isAttentionRow);
  const activeRows = rows.filter((row) => row.state === 'active' && !isAttentionRow(row));
  const moveJobRows = rows.filter((row): row is MoveJobDownloadRow => row.state === 'moveJob' && !isAttentionRow(row));
  const seedingRows = rows.filter(isSeedingRow);
  const historyRows = rows.filter(
    (row): row is CompletedDownloadRow => row.state === 'completed' && !isSeedingRow(row),
  );

  return { attentionRows, activeRows, moveJobRows, seedingRows, historyRows };
}

export function summarizeDownloads(data: DownloadState, rows: DownloadRow[]): DownloadSummary {
  const qbitItems = [
    ...Object.values(data.active),
    ...Object.values(data.moveJobs ?? {}),
    ...Object.values(data.completed),
  ].filter((item) => item.qbit);

  return {
    activeCount: Object.keys(data.active).length,
    moveJobCount: Object.keys(data.moveJobs ?? {}).length,
    attentionCount: rows.filter(isAttentionRow).length,
    completedCount: Object.keys(data.completed).length,
    seedingCount: Object.values(data.completed).filter((item) => item.qbit && !item.qbitRemovedAt).length,
    downloadSpeed: qbitItems.reduce((sum, item) => sum + (item.qbit?.downloadSpeed ?? 0), 0),
    uploadSpeed: qbitItems.reduce((sum, item) => sum + (item.qbit?.uploadSpeed ?? 0), 0),
  };
}

export function isAttentionRow(row: DownloadRow) {
  if (row.qbitError) return true;
  if (row.state === 'moveJob' && row.status === 'failed') return true;
  if (row.state === 'active' && !row.qbit) return true;
  return false;
}

function isSeedingRow(row: DownloadRow): row is CompletedDownloadRow {
  return row.state === 'completed' && Boolean(row.qbit && !row.qbitRemovedAt);
}
