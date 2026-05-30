import type {
  CompletedDownloadRow,
  DownloadRow,
  DownloadSummary,
  MoveJobDownloadRow,
  SubscriptionDownloadSummary,
} from '~/components/downloads/download-types';
import type { DownloadState, SubscriptionConfig } from '~/types';

export function buildDownloadRows(data: DownloadState): DownloadRow[] {
  const moveJobHashes = new Set(Object.keys(data.moveJobs ?? {}));
  const completedHashes = new Set(Object.keys(data.completed));
  const activeRows = Object.entries(data.active)
    .filter(([hash]) => !moveJobHashes.has(hash) && !completedHashes.has(hash))
    .map(([hash, episode]): DownloadRow => ({
      ...episode,
      hash,
      state: 'active',
    }));

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
  const activeRows = rows.filter((row) => row.state === 'active' && !isAttentionRow(row) && !isQbSeedingRow(row));
  const moveJobRows = rows.filter((row): row is MoveJobDownloadRow => row.state === 'moveJob' && !isAttentionRow(row));
  const seedingRows = rows.filter(isSeedingRow);
  const historyRows = rows.filter(
    (row): row is CompletedDownloadRow => row.state === 'completed' && !isSeedingRow(row),
  );

  return { attentionRows, activeRows, moveJobRows, seedingRows, historyRows };
}

export function summarizeDownloadRows(rows: DownloadRow[]): DownloadSummary {
  const qbitItems = rows.filter((item) => item.qbit);

  return {
    activeCount: rows.filter((row) => row.state === 'active' && !isAttentionRow(row) && !isQbSeedingRow(row)).length,
    moveJobCount: rows.filter((row) => row.state === 'moveJob').length,
    attentionCount: rows.filter(isAttentionRow).length,
    completedCount: rows.filter((row) => row.state === 'completed' && !isSeedingRow(row)).length,
    seedingCount: rows.filter(isSeedingRow).length,
    downloadSpeed: qbitItems.reduce((sum, item) => sum + (item.qbit?.downloadSpeed ?? 0), 0),
    uploadSpeed: qbitItems.reduce((sum, item) => sum + (item.qbit?.uploadSpeed ?? 0), 0),
  };
}

export function filterRowsBySubscription(rows: DownloadRow[], subscriptionRss: string | undefined) {
  if (!subscriptionRss) return rows;
  return rows.filter((row) => row.subscriptionRss === subscriptionRss);
}

export function buildSubscriptionDownloadSummaries(
  subscriptions: SubscriptionConfig[],
  rows: DownloadRow[],
): Map<string, SubscriptionDownloadSummary> {
  return new Map(
    subscriptions.map((subscription) => {
      const subscriptionRows = filterRowsBySubscription(rows, subscription.rss);
      return [
        subscription.rss,
        {
          ...summarizeDownloadRows(subscriptionRows),
          subscription,
          latestActivityAt: latestActivityAt(subscriptionRows),
        },
      ];
    }),
  );
}

export function isAttentionRow(row: DownloadRow) {
  if (row.qbitError) return true;
  if (row.state === 'moveJob' && row.status === 'failed') return true;
  if (row.state === 'active' && !row.qbit) return true;
  return false;
}

function isSeedingRow(row: DownloadRow) {
  return !isAttentionRow(row) && isQbSeedingRow(row);
}

export function isQbSeedingRow(row: DownloadRow) {
  if (!row.qbit) return false;
  if (row.state === 'completed' && row.qbitRemovedAt) return false;

  const stateText = `${row.qbit.state} ${row.qbit.stateMessage}`.toLowerCase();
  return row.qbit.progress >= 1 || stateText.includes('seed');
}

function latestActivityAt(rows: DownloadRow[]) {
  return rows
    .map((row) => {
      if (row.state === 'completed') return row.movedAt;
      if (row.state === 'moveJob') return row.updatedAt;
      return undefined;
    })
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => second.localeCompare(first))[0];
}
