import { Sparkles } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

export function PageHero() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[1.45fr_0.85fr] md:p-8">
        <div className="space-y-4">
          <Badge variant="outline" className="w-fit border-cyan-800 bg-cyan-950 text-cyan-100">
            Bangumi Manager
          </Badge>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-slate-50 md:text-5xl">订阅管理</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">搜索番组，选择字幕组，确认后写入订阅。</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-950 p-3 text-cyan-200">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">当前流程</div>
              <div className="text-sm text-slate-400">先搜番组，再选字幕组，最后确认写入。</div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm text-slate-400">
            <div>1. 查看已有订阅，避免重复添加。</div>
            <div>2. 搜索番组或浏览本季列表。</div>
            <div>3. 选定字幕组，确认 RSS 和过滤条件。</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
