import { useDeferredValue, useMemo } from 'react';
import { DownloadActivityBoard } from '~/components/downloads/download-activity-board';
import { DownloadScopePicker } from '~/components/downloads/download-scope-picker';
import {
  buildDownloadRows,
  buildSubscriptionDownloadSummaries,
  filterRowsBySubscription,
  summarizeDownloadRows,
} from '~/components/downloads/download-model';
import { DownloadOverview } from '~/components/downloads/download-overview';
import { DownloadStatusNotes } from '~/components/downloads/download-status-notes';
import type { DownloadStateSnapshot } from '~/components/downloads/use-download-state';
import type { SubscriptionConfig } from '~/types';

interface DownloadProgressProps {
  downloads: DownloadStateSnapshot;
  subscriptions: SubscriptionConfig[];
  selectedSubscriptionRss?: string;
  onSelectSubscription: (subscriptionRss: string | undefined) => void;
}

export function DownloadProgress({
  downloads,
  subscriptions,
  selectedSubscriptionRss,
  onSelectSubscription,
}: DownloadProgressProps) {
  const rows = useMemo(() => buildDownloadRows(downloads.data), [downloads.data]);
  const deferredRows = useDeferredValue(rows);
  const scopedRows = useMemo(
    () => filterRowsBySubscription(deferredRows, selectedSubscriptionRss),
    [deferredRows, selectedSubscriptionRss],
  );
  const allSummary = useMemo(() => summarizeDownloadRows(rows), [rows]);
  const summary = useMemo(() => summarizeDownloadRows(scopedRows), [scopedRows]);
  const subscriptionSummaries = useMemo(
    () => [...buildSubscriptionDownloadSummaries(subscriptions, rows).values()],
    [rows, subscriptions],
  );

  return (
    <div className="grid gap-5">
      <DownloadScopePicker
        allSummary={allSummary}
        summaries={subscriptionSummaries}
        selectedSubscriptionRss={selectedSubscriptionRss}
        onSelect={onSelectSubscription}
      />

      <DownloadOverview summary={summary} loading={downloads.loading} />

      <DownloadActivityBoard
        rows={scopedRows}
        loading={downloads.loading}
        error={downloads.error}
        lastUpdatedAt={downloads.lastUpdatedAt}
        selectedSubscriptionTitle={
          subscriptions.find((subscription) => subscription.rss === selectedSubscriptionRss)?.title
        }
        onRefresh={() => void downloads.refresh()}
      />

      <DownloadStatusNotes />
    </div>
  );
}
