import { useDeferredValue, useMemo, useState } from 'react';
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
import { retryMoveJob } from '~/lib/api';
import { asMessage } from '~/lib/subscription';
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
  const [retryingMoveHashes, setRetryingMoveHashes] = useState<Set<string>>(() => new Set());
  const [retryError, setRetryError] = useState<string | null>(null);
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

  async function retryMove(hash: string) {
    if (retryingMoveHashes.has(hash)) return;

    setRetryError(null);
    setRetryingMoveHashes((current) => new Set(current).add(hash));

    try {
      await retryMoveJob(hash);
      await downloads.refresh({ silent: true });
    } catch (caught) {
      setRetryError(asMessage(caught));
    } finally {
      setRetryingMoveHashes((current) => {
        const next = new Set(current);
        next.delete(hash);
        return next;
      });
    }
  }

  async function refreshDownloads() {
    setRetryError(null);
    await downloads.refresh();
  }

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
        error={downloads.error ?? retryError}
        lastUpdatedAt={downloads.lastUpdatedAt}
        selectedSubscriptionTitle={
          subscriptions.find((subscription) => subscription.rss === selectedSubscriptionRss)?.title
        }
        onRefresh={() => void refreshDownloads()}
        onRetryMove={(hash) => void retryMove(hash)}
        retryingMoveHashes={retryingMoveHashes}
      />

      <DownloadStatusNotes />
    </div>
  );
}
