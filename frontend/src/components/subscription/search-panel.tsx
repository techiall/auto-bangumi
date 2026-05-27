import { Check, ExternalLink, LoaderCircle, Search } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
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
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onBrowse: () => void;
  onChoose: (item: MikanSearchResult) => void;
}

export function SearchPanel({
  query,
  results,
  selectedBangumiId,
  loadingBangumiId,
  isSearchLoading,
  isBrowseLoading,
  onQueryChange,
  onSearch,
  onBrowse,
  onChoose,
}: SearchPanelProps) {
  return (
    <Card className="p-5">
      <CardHeader className="mb-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Step 1</p>
          <CardTitle>找番组</CardTitle>
          <CardDescription>先搜索，再从结果里选一个番组继续。</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="输入番名，例如 Ave Mujica"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isSearchLoading || isBrowseLoading}>
            {isSearchLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
            搜索
          </Button>
          <Button variant="outline" type="button" onClick={onBrowse} disabled={isSearchLoading || isBrowseLoading}>
            {isBrowseLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            查看本季番组
          </Button>
        </form>

        <div className={cn('overflow-y-auto pr-1', selectedBangumiId ? 'max-h-72' : 'max-h-[34rem]')}>
          <div className="grid gap-4 xl:grid-cols-2">
            {results.map((item) => (
              <SearchResultItem
                key={item.id}
                item={item}
                active={selectedBangumiId === item.id}
                loading={loadingBangumiId === item.id}
                onChoose={() => onChoose(item)}
              />
            ))}
          </div>
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
        'cursor-pointer rounded-2xl border p-4 transition-colors',
        active ? 'border-cyan-500 bg-cyan-950/70' : 'border-slate-800 bg-slate-900/70 hover:bg-slate-800',
      )}
      role="button"
      tabIndex={0}
      onClick={onChoose}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onChoose();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 font-medium text-slate-100 hover:text-cyan-200"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="truncate">{item.title}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
          <div className="text-sm text-slate-500">Bangumi ID: {item.id}</div>
        </div>
        {loading ? <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-cyan-200" /> : null}
        {active ? (
          <Badge variant="outline" className="shrink-0 border-cyan-700 bg-cyan-950 text-cyan-100">
            <Check className="mr-1 size-3.5" />
            已选
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
