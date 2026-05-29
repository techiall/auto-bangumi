import { Check, LoaderCircle, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import type { MikanSearchResult } from '~/types';

interface SearchPanelProps {
  query: string;
  results: MikanSearchResult[];
  selectedBangumiId?: number;
  loadingBangumiId: number | null;
  isSearchLoading: boolean;
  isBrowseLoading: boolean;
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
  selectedBangumiId,
  loadingBangumiId,
  isSearchLoading,
  isBrowseLoading,
  settingsSlot,
  onQueryChange,
  onSearch,
  onBrowse,
  onChoose,
  onClearSelection,
}: SearchPanelProps) {
  return (
    <Card className="overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/88 p-4 backdrop-blur md:p-5">
        <CardHeader className="mb-3 flex-col sm:flex-row sm:items-start md:mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <CardTitle>Find Bangumi</CardTitle>
            {results.length ? <span className="text-sm text-slate-500">{results.length} results</span> : null}
          </div>
          {selectedBangumiId ? (
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="mr-2 size-4" />
              Clear
            </Button>
          ) : null}
        </CardHeader>
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(0,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by title, e.g. Ave Mujica"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isSearchLoading || isBrowseLoading}>
            {isSearchLoading ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : (
              <Search className="mr-2 size-4" />
            )}
            Search
          </Button>
          <Button
            variant="outline"
            type="button"
            className="lg:col-span-2 2xl:col-span-1"
            onClick={onBrowse}
            disabled={isSearchLoading || isBrowseLoading}>
            {isBrowseLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            Current Season
          </Button>
        </form>
      </div>

      <CardContent className="p-4 md:p-5">
        <div
          className={cn(
            'min-h-[30rem] overflow-y-auto pr-1 md:min-h-[36rem] xl:min-h-[calc(100vh-13.5rem)]',
            selectedBangumiId
              ? 'max-h-[48rem] md:max-h-[58rem] xl:max-h-[calc(100vh-13.5rem)]'
              : 'max-h-[36rem] md:max-h-[46rem] xl:max-h-[calc(100vh-13.5rem)]',
          )}>
          {results.length ? (
            <div className="grid gap-3">
              {results.map((item) => (
                <div key={item.id} className="grid gap-3">
                  <SearchResultItem
                    item={item}
                    active={selectedBangumiId === item.id}
                    loading={loadingBangumiId === item.id}
                    onChoose={() => onChoose(item)}
                  />
                  {selectedBangumiId === item.id && settingsSlot ? <div>{settingsSlot}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="grid min-h-[20rem] place-items-center rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/34 px-6"
              aria-label="No search results">
              <Search className="size-6 text-slate-700" aria-hidden="true" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
  return (
    <div
      className={cn(
        'cursor-pointer rounded-2xl border px-4 py-3 transition-colors',
        '[contain-intrinsic-size:4rem] [content-visibility:auto]',
        active
          ? 'border-cyan-500/90 bg-cyan-950/64 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
          : 'border-slate-800 bg-slate-900/52 hover:border-slate-700 hover:bg-slate-900',
      )}
      role="button"
      tabIndex={0}
      onClick={onChoose}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onChoose();
        }
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center rounded-lg font-medium text-slate-100 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-400"
            onClick={(event) => event.stopPropagation()}>
            <span className="truncate">{item.title}</span>
          </a>
          <div className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            ID {item.id}
          </div>
        </div>
        {loading ? <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-cyan-200" /> : null}
        {active ? (
          <Badge variant="outline" className="shrink-0 border-cyan-700 bg-cyan-950 text-cyan-100">
            <Check className="size-3.5" />
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
