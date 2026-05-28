import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';

export function PageHero() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="space-y-4">
          <Badge variant="outline" className="w-fit border-cyan-800 bg-cyan-950 text-cyan-100">
            Auto Bangumi
          </Badge>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-slate-50 md:text-5xl">控制台</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">订阅管理和下载状态。</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
