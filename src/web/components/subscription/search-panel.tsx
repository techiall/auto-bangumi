import { Check, ChevronDown, ExternalLink, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import type { SearchResultMode } from '~/components/subscription/use-subscription-manager';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';
import type { MikanDayOfWeek, MikanSearchResult, MikanSeasonBrowse, MikanSeasonDayGroup } from '~/types';

const WEEKDAY_LABEL_KEYS: Record<MikanDayOfWeek, string> = {
  0: 'weekday.sun',
  1: 'weekday.mon',
  2: 'weekday.tue',
  3: 'weekday.wed',
  4: 'weekday.thu',
  5: 'weekday.fri',
  6: 'weekday.sat',
  7: 'weekday.movie',
  8: 'weekday.ova',
};

interface SearchPanelProps {
  query: string;
  results: MikanSearchResult[];
  seasonBrowse: MikanSeasonBrowse | null;
  resultMode: SearchResultMode;
  resultCount: number;
  selectedBangumiId?: number;
  loadingBangumiId: number | null;
  isSearchLoading: boolean;
  isBrowseLoading: boolean;
  hasSearched: boolean;
  settingsSlot?: ReactNode;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onBrowse: () => void;
  onChoose: (item: MikanSearchResult) => void;
  onClearSelection: () => void;
}

export function SearchPanel({
  query,
  results,
  seasonBrowse,
  resultMode,
  resultCount,
  selectedBangumiId,
  loadingBangumiId,
  isSearchLoading,
  isBrowseLoading,
  hasSearched,
  settingsSlot,
  onQueryChange,
  onSearch,
  onBrowse,
  onChoose,
  onClearSelection,
}: SearchPanelProps) {
  const { t } = useI18n();
  const isLoading = isSearchLoading || isBrowseLoading;
  const hasResults = resultCount > 0;

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/88 p-4 backdrop-blur md:p-5">
        <CardHeader className="mb-3 flex-col sm:flex-row sm:items-start md:mb-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <CardTitle>{t('subscriptions.find')}</CardTitle>
            {hasResults ? (
              <span className="text-sm text-slate-500">{t('subscriptions.results', { count: resultCount })}</span>
            ) : null}
            {resultMode === 'season' && seasonBrowse?.seasonLabel ? (
              <span className="truncate text-sm text-slate-500">{seasonBrowse.seasonLabel}</span>
            ) : null}
          </div>
          {selectedBangumiId ? (
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="mr-2 size-4" />
              {t('common.clear')}
            </Button>
          ) : null}
        </CardHeader>
        <form
          className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}>
          <div className="relative col-span-2 min-w-0 md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t('subscriptions.placeholderSearch')}
              className="pl-9"
            />
          </div>
          <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
            {isSearchLoading ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : (
              <Search className="mr-2 size-4" />
            )}
            {t('common.search')}
          </Button>
          <Button variant="outline" type="button" className="w-full md:w-auto" onClick={onBrowse} disabled={isLoading}>
            {isBrowseLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            {t('subscriptions.currentSeason')}
          </Button>
        </form>
      </div>

      <CardContent className={cn(hasResults || selectedBangumiId ? 'p-4 md:p-5' : 'p-3 md:p-4')}>
        <div
          className={cn(
            'min-w-0 overflow-x-hidden overflow-y-auto pr-1',
            hasResults || selectedBangumiId
              ? 'min-h-[24rem] md:min-h-[30rem] xl:min-h-[calc(100vh-13.5rem)]'
              : 'min-h-0',
            selectedBangumiId
              ? 'max-h-[48rem] md:max-h-[58rem] xl:max-h-[calc(100vh-13.5rem)]'
              : hasResults
                ? 'max-h-[36rem] md:max-h-[46rem] xl:max-h-[calc(100vh-13.5rem)]'
                : 'max-h-none',
          )}>
          {resultMode === 'season' && seasonBrowse?.groups.length ? (
            <SeasonDayGroups
              groups={seasonBrowse.groups}
              selectedBangumiId={selectedBangumiId}
              loadingBangumiId={loadingBangumiId}
              settingsSlot={settingsSlot}
              onChoose={onChoose}
            />
          ) : results.length ? (
            <div className="grid min-w-0 gap-3">
              {results.map((item) => (
                <div key={item.id} className="grid min-w-0 gap-3">
                  <SearchResultItem
                    item={item}
                    active={selectedBangumiId === item.id}
                    loading={loadingBangumiId === item.id}
                    onChoose={() => onChoose(item)}
                  />
                  {selectedBangumiId === item.id && settingsSlot ? <div className="min-w-0">{settingsSlot}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <SearchEmptyState
              isSearchLoading={isSearchLoading}
              isBrowseLoading={isBrowseLoading}
              hasSearched={hasSearched}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SeasonDayGroups({
  groups,
  selectedBangumiId,
  loadingBangumiId,
  settingsSlot,
  onChoose,
}: {
  groups: MikanSeasonDayGroup[];
  selectedBangumiId?: number;
  loadingBangumiId: number | null;
  settingsSlot?: ReactNode;
  onChoose: (item: MikanSearchResult) => void;
}) {
  const today = useMemo(() => new Date().getDay() as MikanDayOfWeek, []);
  const [expandedDays, setExpandedDays] = useState<Set<MikanDayOfWeek>>(() => new Set([today]));

  useEffect(() => {
    setExpandedDays(new Set([today]));
  }, [groups, today]);

  useEffect(() => {
    if (!selectedBangumiId) return;
    const group = groups.find((entry) => entry.items.some((item) => item.id === selectedBangumiId));
    if (!group) return;
    setExpandedDays((current) => {
      if (current.has(group.dayOfWeek)) return current;
      const next = new Set(current);
      next.add(group.dayOfWeek);
      return next;
    });
  }, [groups, selectedBangumiId]);

  function toggleDay(dayOfWeek: MikanDayOfWeek) {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(dayOfWeek)) next.delete(dayOfWeek);
      else next.add(dayOfWeek);
      return next;
    });
  }

  return (
    <div className="grid min-w-0 gap-3">
      {groups.map((group) => (
        <SeasonDaySection
          key={group.dayOfWeek}
          group={group}
          isToday={group.dayOfWeek === today}
          expanded={expandedDays.has(group.dayOfWeek)}
          selectedBangumiId={selectedBangumiId}
          loadingBangumiId={loadingBangumiId}
          settingsSlot={settingsSlot}
          onToggle={() => toggleDay(group.dayOfWeek)}
          onChoose={onChoose}
        />
      ))}
    </div>
  );
}

function SeasonDaySection({
  group,
  isToday,
  expanded,
  selectedBangumiId,
  loadingBangumiId,
  settingsSlot,
  onToggle,
  onChoose,
}: {
  group: MikanSeasonDayGroup;
  isToday: boolean;
  expanded: boolean;
  selectedBangumiId?: number;
  loadingBangumiId: number | null;
  settingsSlot?: ReactNode;
  onToggle: () => void;
  onChoose: (item: MikanSearchResult) => void;
}) {
  const { t } = useI18n();
  const panelId = `season-day-${group.dayOfWeek}`;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border',
        isToday ? 'border-cyan-800/80 bg-cyan-950/20' : 'border-slate-800/90 bg-slate-950/28',
      )}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
          isToday ? 'hover:bg-cyan-950/30' : 'hover:bg-slate-900/40',
        )}
        onClick={onToggle}>
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn('truncate text-sm font-medium', isToday ? 'text-cyan-100' : 'text-slate-200')}>
            {t(WEEKDAY_LABEL_KEYS[group.dayOfWeek])}
          </span>
          {isToday ? (
            <Badge variant="outline" className="border-cyan-700 bg-cyan-950 text-cyan-100">
              {t('weekday.today')}
            </Badge>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500">
          {group.items.length}
          <ChevronDown className={cn('size-4 transition-transform', expanded ? 'rotate-180' : '')} aria-hidden="true" />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className="border-t border-slate-800/80 bg-slate-950/36 p-3">
          <div className="grid min-w-0 gap-3">
            {group.items.map((item) => (
              <div key={item.id} className="grid min-w-0 gap-3">
                <SearchResultItem
                  item={item}
                  active={selectedBangumiId === item.id}
                  loading={loadingBangumiId === item.id}
                  onChoose={() => onChoose(item)}
                />
                {selectedBangumiId === item.id && settingsSlot ? <div className="min-w-0">{settingsSlot}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SearchEmptyState({
  isSearchLoading,
  isBrowseLoading,
  hasSearched,
}: {
  isSearchLoading: boolean;
  isBrowseLoading: boolean;
  hasSearched: boolean;
}) {
  const { t } = useI18n();
  const isLoading = isSearchLoading || isBrowseLoading;
  const message = isSearchLoading
    ? t('subscriptions.searching')
    : isBrowseLoading
      ? t('subscriptions.browsing')
      : hasSearched
        ? t('subscriptions.noResults')
        : t('subscriptions.searchHint');
  const label = isLoading ? message : hasSearched ? t('subscriptions.noResults') : t('subscriptions.searchHint');

  return (
    <div
      className="grid min-h-24 place-items-center gap-2 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/34 px-6 py-6 text-center text-sm text-slate-500 md:min-h-28"
      aria-busy={isLoading || undefined}
      aria-live="polite"
      aria-label={label}>
      {isLoading ? (
        <LoaderCircle className="size-6 animate-spin text-cyan-300/80" aria-hidden="true" />
      ) : (
        <Search className="size-6 text-slate-700" aria-hidden="true" />
      )}
      <span>{message}</span>
    </div>
  );
}

function SearchResultItem({
  item,
  active,
  loading,
  onChoose,
}: {
  item: MikanSearchResult;
  active: boolean;
  loading: boolean;
  onChoose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex min-w-0 items-stretch gap-1 rounded-2xl border transition-colors',
        '[contain-intrinsic-size:4rem] [content-visibility:auto]',
        active
          ? 'border-cyan-500/90 bg-cyan-950/64 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
          : 'border-slate-800 bg-slate-900/52 hover:border-slate-700 hover:bg-slate-900',
      )}>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 focus-visible:ring-inset"
        onClick={onChoose}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium text-slate-100">{item.title}</span>
          <div className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            {t('common.id')} {item.id}
          </div>
        </div>
        {loading ? <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-cyan-200" /> : null}
        {active ? (
          <Badge variant="outline" className="shrink-0 border-cyan-700 bg-cyan-950 text-cyan-100">
            <Check className="size-3.5" />
          </Badge>
        ) : null}
      </button>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="grid shrink-0 place-items-center rounded-r-2xl px-3 text-slate-500 transition-colors hover:bg-slate-950/50 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 focus-visible:ring-inset"
        aria-label={t('common.openExternal')}
        title={t('common.openExternal')}>
        <ExternalLink className="size-4" />
      </a>
    </div>
  );
}
