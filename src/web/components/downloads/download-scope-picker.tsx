import { CheckCircle2, ChevronDown, Filter, Search, X } from 'lucide-react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import type { DownloadSummary, SubscriptionDownloadSummary } from '~/components/downloads/download-types';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

interface DownloadScopePickerProps {
  allSummary: DownloadSummary;
  summaries: SubscriptionDownloadSummary[];
  selectedSubscriptionRss?: string;
  onSelect: (subscriptionRss: string | undefined) => void;
}

export function DownloadScopePicker({
  allSummary,
  summaries,
  selectedSubscriptionRss,
  onSelect,
}: DownloadScopePickerProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const scopesPanelId = useId();
  const deferredQuery = useDeferredValue(query);
  const filteredSummaries = useMemo(() => filterSummaries(summaries, deferredQuery), [deferredQuery, summaries]);
  const selectedSummary = summaries.find((summary) => summary.subscription.rss === selectedSubscriptionRss);
  const currentSummary = selectedSummary ?? allSummary;

  function selectScope(subscriptionRss: string | undefined) {
    onSelect(subscriptionRss);
  }

  return (
    <Card className="p-5">
      <section className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/42">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            className="-m-2 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-slate-900/48 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
            aria-controls={scopesPanelId}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}>
            <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900/80 text-cyan-200">
              <Filter className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                {t('downloads.downloadScope')}
                {selectedSummary?.subscription.archived ? (
                  <Badge variant="warning">{t('common.archived')}</Badge>
                ) : null}
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="max-w-full truncate text-xl font-semibold tracking-tight text-slate-50">
                  {selectedSummary?.subscription.title ?? t('downloads.allSubscriptions')}
                </span>
                <span className="text-xs text-slate-500">{scopeText(currentSummary, t)}</span>
              </div>
              <div className="mt-0.5 truncate text-sm text-slate-500">
                {selectedSummary
                  ? selectedSummary.subscription.folder
                  : t('downloads.scopeCount', { count: summaries.length })}
              </div>
            </div>

            <span className="ml-auto hidden shrink-0 items-center gap-2 text-sm font-medium text-slate-400 sm:flex">
              {expanded ? t('downloads.hideScopes') : t('downloads.browseScopes')}
              <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </span>
          </button>

          <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
            {selectedSummary ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-fit whitespace-nowrap"
                onClick={() => selectScope(undefined)}>
                <X className="mr-2 size-4" />
                {t('common.clear')}
              </Button>
            ) : null}
            <button
              type="button"
              className="flex w-fit items-center gap-2 rounded-full border border-slate-800 px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200 sm:hidden"
              aria-controls={scopesPanelId}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}>
              {expanded ? t('downloads.hideScopes') : t('downloads.browseScopes')}
              <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {expanded ? (
          <div id={scopesPanelId} className="grid gap-3 border-t border-slate-800/80 bg-slate-950/36 p-3">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('downloads.filterScopes')}
                className="pl-9"
              />
            </div>

            <div className="max-h-[16rem] overflow-y-auto pr-1 [scrollbar-color:#334155_transparent]">
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                <ScopeButton
                  active={!selectedSubscriptionRss}
                  title={t('downloads.allSubscriptions')}
                  subtitle={scopeText(allSummary, t)}
                  summary={allSummary}
                  onClick={() => selectScope(undefined)}
                />
                {filteredSummaries.map((summary) => (
                  <ScopeButton
                    key={summary.subscription.rss}
                    active={summary.subscription.rss === selectedSubscriptionRss}
                    title={summary.subscription.title}
                    subtitle={scopeText(summary, t)}
                    summary={summary}
                    archived={summary.subscription.archived}
                    onClick={() => selectScope(summary.subscription.rss)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </Card>
  );
}

function ScopeButton({
  active,
  title,
  subtitle,
  summary,
  archived,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  summary: DownloadSummary;
  archived?: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const hasAttention = summary.attentionCount > 0;
  const hasActivity = summary.activeCount + summary.moveJobCount + summary.seedingCount > 0;

  return (
    <button
      type="button"
      className={cn(
        'min-w-0 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30',
        active
          ? 'border-cyan-500/90 bg-cyan-950/64 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
          : 'border-slate-800 bg-slate-900/52 hover:border-slate-700 hover:bg-slate-900',
      )}
      onClick={onClick}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-slate-100">{title}</div>
        {active ? <CheckCircle2 className="size-4 shrink-0 text-cyan-200" /> : null}
      </div>
      <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
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
        ) : (
          <Badge variant="outline">{t('downloads.idle')}</Badge>
        )}
        {archived ? <Badge variant="warning">{t('common.archived')}</Badge> : null}
      </div>
    </button>
  );
}

function scopeText(summary: DownloadSummary, t: (key: string, values?: Record<string, string | number>) => string) {
  if (summary.activeCount || summary.moveJobCount || summary.seedingCount) {
    return t('downloads.scopeText', {
      active: summary.activeCount,
      moving: summary.moveJobCount,
      seeding: summary.seedingCount,
    });
  }

  if (summary.completedCount) return t('downloads.scopeTextMoved', { count: summary.completedCount });
  return t('downloads.scopeTextEmpty');
}

function filterSummaries(summaries: SubscriptionDownloadSummary[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return summaries;

  return summaries.filter(({ subscription }) =>
    [subscription.title, subscription.folder, subscription.rss, subscription.filters?.join(' ')]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword)),
  );
}
