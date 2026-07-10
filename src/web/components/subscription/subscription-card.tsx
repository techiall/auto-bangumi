import { Activity, Archive, Check, ChevronDown, RotateCcw, Rss, Trash2, X } from 'lucide-react';
import { memo, useEffect, useId, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import type { SubscriptionDownloadSummary } from '~/components/downloads/download-types';
import { Field } from '~/components/subscription/shared';
import { useI18n } from '~/lib/i18n';
import { inferMikanBangumiUrl, splitCommaList } from '~/lib/subscription';
import type { SubscriptionConfig, UpdateSeasonPayload } from '~/types';

interface SubscriptionCardProps {
  subscription: SubscriptionConfig;
  subscriptionKey: string;
  isPending: boolean;
  downloadSummary?: SubscriptionDownloadSummary;
  onDelete: (subscriptionKey: string) => void;
  onUpdate: (subscriptionKey: string, payload: UpdateSeasonPayload) => void;
  onViewDownloads: (subscriptionKey: string) => void;
}

export const SubscriptionCard = memo(function SubscriptionCard({
  subscription,
  subscriptionKey,
  isPending,
  downloadSummary,
  onDelete,
  onUpdate,
  onViewDownloads,
}: SubscriptionCardProps) {
  const { t } = useI18n();
  const mikanUrl = inferMikanBangumiUrl(subscription.rss);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [folder, setFolder] = useState(subscription.folder);
  const [season, setSeason] = useState(String(subscription.season));
  const [filters, setFilters] = useState(subscription.filters?.join(', ') ?? '');
  const formId = useId();
  const seasonId = `${formId}-season`;
  const folderId = `${formId}-folder`;
  const filtersId = `${formId}-filters`;
  const panelId = `${formId}-panel`;

  useEffect(() => {
    setFolder(subscription.folder);
    setSeason(String(subscription.season));
    setFilters(subscription.filters?.join(', ') ?? '');
    setSeasonError(null);
    setConfirmDelete(false);
  }, [subscription.filters, subscription.folder, subscription.season]);

  useEffect(() => {
    if (!expanded) {
      setConfirmDelete(false);
      setSeasonError(null);
    }
  }, [expanded]);

  function resetForm() {
    setFolder(subscription.folder);
    setSeason(String(subscription.season));
    setFilters(subscription.filters?.join(', ') ?? '');
    setSeasonError(null);
    setConfirmDelete(false);
  }

  function save() {
    const nextSeason = Number(season);
    if (!Number.isInteger(nextSeason) || nextSeason <= 0) {
      setSeasonError(t('subscriptions.invalidSeason'));
      return;
    }

    setSeasonError(null);
    onUpdate(subscriptionKey, {
      folder: folder.trim() || subscription.title,
      season: nextSeason,
      filters: splitCommaList(filters),
      archived: subscription.archived,
    });
    setExpanded(false);
  }

  function toggleArchive() {
    onUpdate(subscriptionKey, {
      folder: subscription.folder,
      season: subscription.season,
      filters: subscription.filters ?? [],
      archived: !subscription.archived,
    });
    setExpanded(false);
  }

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors [contain-intrinsic-size:9rem] [content-visibility:auto] ${
        subscription.archived
          ? 'border-amber-900/70 bg-amber-950/14 hover:border-amber-800/80 hover:bg-amber-950/20'
          : 'border-slate-800 bg-slate-900/48 hover:border-slate-700 hover:bg-slate-900/70'
      }`}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            {mikanUrl ? (
              <a
                href={mikanUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate font-medium text-slate-100 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-400">
                <span className="truncate">{subscription.title}</span>
              </a>
            ) : (
              <div className="min-w-0 truncate font-medium text-slate-100">{subscription.title}</div>
            )}
            <a
              href={subscription.rss}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-800 bg-cyan-950/70 px-2.5 py-0.5 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-500 hover:bg-cyan-900 hover:text-cyan-50">
              <Rss className="size-3.5" />
              {t('common.rss')}
            </a>
          </div>
          <SubscriptionMeta subscription={subscription} />
          {downloadSummary ? <SubscriptionDownloadStrip summary={downloadSummary} /> : null}
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-fit rounded-full px-2.5 text-xs"
            onClick={() => onViewDownloads(subscriptionKey)}>
            <Activity className="mr-1.5 size-3.5" />
            {t('subscriptions.downloads')}
          </Button>
          {subscription.archived ? (
            <div className="rounded-full border border-amber-800/70 bg-amber-950/80 px-2.5 py-0.5 text-xs font-medium text-amber-200">
              {t('common.archived')}
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-full px-2.5 text-xs text-slate-400 hover:text-slate-100"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((value) => !value)}>
            {t('common.edit')}
            <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div id={panelId} className="mt-4 rounded-xl border border-slate-800 bg-slate-950/64 p-3">
          <div className="grid gap-3 md:grid-cols-[7rem_1fr]">
            <Field id={seasonId} label={t('common.season')}>
              <Input
                id={seasonId}
                type="number"
                min="1"
                value={season}
                aria-invalid={seasonError ? true : undefined}
                onChange={(event) => {
                  setSeason(event.target.value);
                  setSeasonError(null);
                }}
              />
              {seasonError ? <p className="mt-1 text-xs text-rose-300">{seasonError}</p> : null}
            </Field>
            <Field id={folderId} label={t('common.folder')}>
              <Input id={folderId} value={folder} onChange={(event) => setFolder(event.target.value)} />
            </Field>
            <Field id={filtersId} label={t('subscriptions.titleFilters')}>
              <Input
                id={filtersId}
                value={filters}
                onChange={(event) => setFilters(event.target.value)}
                placeholder={t('subscriptions.titleFiltersHint')}
                className="h-12 text-base"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            {confirmDelete ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-sm text-rose-200">{t('subscriptions.confirmDelete', { title: subscription.title })}</p>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-fit whitespace-nowrap"
                  disabled={isPending}
                  onClick={() => onDelete(subscriptionKey)}>
                  <Trash2 className="mr-2 size-4" />
                  {t('common.confirmDelete')}
                </Button>
                <Button variant="outline" size="sm" className="w-fit whitespace-nowrap" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                className="w-fit whitespace-nowrap"
                disabled={isPending}
                onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 size-4" />
                {t('common.delete')}
              </Button>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-fit whitespace-nowrap"
                disabled={isPending}
                onClick={toggleArchive}>
                {subscription.archived ? <RotateCcw className="mr-2 size-4" /> : <Archive className="mr-2 size-4" />}
                {subscription.archived ? t('common.restore') : t('common.archive')}
              </Button>
              <Button variant="soft" size="sm" className="w-fit whitespace-nowrap" disabled={isPending} onClick={save}>
                <Check className="mr-2 size-4" />
                {t('common.save')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-fit whitespace-nowrap"
                onClick={() => {
                  resetForm();
                  setExpanded(false);
                }}>
                <X className="mr-2 size-4" />
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

function SubscriptionMeta({ subscription }: { subscription: SubscriptionConfig }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
      <span>
        <span className="text-slate-500">{t('common.season')}</span>{' '}
        <span className="font-medium text-slate-200">{subscription.season}</span>
      </span>
      <span>
        <span className="text-slate-500">{t('common.folder')}</span>{' '}
        <span className="font-medium text-slate-200">{subscription.folder}</span>
      </span>
      {subscription.filters?.length ? (
        <span>
          <span className="text-slate-500">{t('common.filters')}</span>{' '}
          <span className="font-medium text-slate-200">{subscription.filters.join(' / ')}</span>
        </span>
      ) : null}
    </div>
  );
}

function SubscriptionDownloadStrip({ summary }: { summary: SubscriptionDownloadSummary }) {
  const { t } = useI18n();
  const hasAttention = summary.attentionCount > 0;
  const hasActivity = summary.activeCount + summary.moveJobCount + summary.seedingCount > 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {hasAttention ? (
        <Badge variant="warning">
          {t('downloads.needsAttention')} {summary.attentionCount}
        </Badge>
      ) : null}
      {hasActivity ? (
        <>
          <Badge variant="muted">
            {t('downloads.active')} {summary.activeCount}
          </Badge>
          <Badge variant="muted">
            {t('downloads.moveJobs')} {summary.moveJobCount}
          </Badge>
          <Badge variant="muted">
            {t('downloads.seeding')} {summary.seedingCount}
          </Badge>
        </>
      ) : summary.completedCount ? (
        <Badge variant="outline">
          {t('downloads.moved')} {summary.completedCount}
        </Badge>
      ) : (
        <Badge variant="outline">{t('subscriptions.noDownloads')}</Badge>
      )}
    </div>
  );
}
