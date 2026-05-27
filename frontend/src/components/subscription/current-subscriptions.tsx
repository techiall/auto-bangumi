import { ExternalLink, Layers3, LoaderCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { StateBox } from '~/components/subscription/shared';
import { inferMikanBangumiUrl } from '~/lib/subscription';
import type { SeasonConfig } from '~/types';

interface CurrentSubscriptionsProps {
  seasons: Array<{ season: SeasonConfig; index: number }>;
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (index: number) => void;
}

export function CurrentSubscriptions({ seasons, isLoading, onRefresh, onDelete }: CurrentSubscriptionsProps) {
  return (
    <Card className="p-5">
      <CardHeader className="mb-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Step 3</p>
          <CardTitle>当前订阅</CardTitle>
          <CardDescription>最新添加的订阅会显示在最前面。</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="mr-2 size-4" />
          刷新
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <StateBox icon={<LoaderCircle className="size-4 animate-spin" />} text="正在读取配置..." />
        ) : !seasons.length ? (
          <StateBox icon={<Layers3 className="size-4" />} text="当前还没有订阅。" />
        ) : (
          seasons.map(({ season, index }) => (
            <SubscriptionCard key={`${season.rss}-${index}`} season={season} index={index} onDelete={onDelete} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  season,
  index,
  onDelete,
}: {
  season: SeasonConfig;
  index: number;
  onDelete: (index: number) => void;
}) {
  const mikanUrl = inferMikanBangumiUrl(season.rss);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 space-y-2">
          {mikanUrl ? (
            <a
              href={mikanUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-slate-100 hover:text-cyan-200"
            >
              {season.title}
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <div className="font-medium text-slate-100">{season.title}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">Season {season.seasonNumber}</Badge>
            {season.match?.title?.length ? <Badge variant="outline">过滤 {season.match.title.join(' / ')}</Badge> : null}
          </div>
          <a
            href={season.rss}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
          >
            查看 RSS
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        <Button variant="danger" size="sm" className="w-fit whitespace-nowrap" onClick={() => onDelete(index)}>
          <Trash2 className="mr-2 size-4" />
          删除
        </Button>
      </div>
    </div>
  );
}
