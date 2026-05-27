import { Check, ChevronDown, ExternalLink, Layers3, LoaderCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Field, GroupOption, StateBox } from '~/components/subscription/shared';
import { cn } from '~/lib/utils';
import type { MikanBangumiDetail, MikanBangumiGroup } from '~/types';

export interface SubscriptionFormState {
  title: string;
  season: string;
  filters: string;
  rss: string;
}

interface SubscriptionSettingsProps {
  bangumi: MikanBangumiDetail;
  selectedGroup: MikanBangumiGroup | null;
  selectedGroupId: number | null;
  form: SubscriptionFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  notice: { kind: 'success' | 'error'; message: string } | null;
  onToggleOpen: () => void;
  onGroupSelect: (groupId: number) => void;
  onFormChange: (form: SubscriptionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function SubscriptionSettings({
  bangumi,
  selectedGroup,
  selectedGroupId,
  form,
  isOpen,
  isSubmitting,
  notice,
  onToggleOpen,
  onGroupSelect,
  onFormChange,
  onSubmit,
}: SubscriptionSettingsProps) {
  return (
    <Card className="p-5">
      <CardHeader className="mb-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Step 2</p>
          <CardTitle>订阅设置</CardTitle>
          <CardDescription>{bangumi.title}</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onToggleOpen}>
          <ChevronDown className={cn('mr-2 size-4 transition-transform', isOpen ? 'rotate-180' : '')} />
          {isOpen ? '收起' : '展开'}
        </Button>
      </CardHeader>

      {isOpen ? (
        <CardContent className="space-y-5">
          <form className="grid gap-7" onSubmit={onSubmit}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <div className="min-w-0">
                <a
                  href={bangumi.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate font-medium text-slate-100 hover:text-cyan-200">
                  <span className="truncate">{bangumi.title}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
                <div className="mt-1 text-sm text-slate-500">Bangumi ID: {bangumi.id}</div>
              </div>
              <Badge variant="outline" className="border-cyan-800 bg-cyan-950 text-cyan-100">
                {selectedGroup ? selectedGroup.name : '未选择字幕组'}
              </Badge>
            </div>

            {notice ? (
              <div
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm',
                  notice.kind === 'error'
                    ? 'border-rose-900 bg-rose-950/70 text-rose-100'
                    : 'border-cyan-900 bg-cyan-950/70 text-cyan-100',
                )}>
                {notice.message}
              </div>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
              <div>
                <div className="text-sm font-medium text-slate-100">字幕组</div>
                <div className="mt-1 text-xs text-slate-500">选择一个字幕组后会自动更新 RSS。</div>
              </div>
              <div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
                {bangumi.groups.length ? (
                  bangumi.groups.map((group) => (
                    <GroupOption
                      key={group.id}
                      group={group}
                      active={group.id === selectedGroupId}
                      onClick={() => onGroupSelect(group.id)}
                    />
                  ))
                ) : (
                  <StateBox icon={<Layers3 className="size-4" />} text="没有解析到字幕组，会使用番组默认 RSS。" />
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div>
                <div className="text-sm font-medium text-slate-100">写入内容</div>
                <div className="mt-1 text-xs text-slate-500">确认标题、季数和过滤词后写入配置。</div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_8rem]">
                <Field label="标题">
                  <Input
                    value={form.title}
                    onChange={(event) => onFormChange({ ...form, title: event.target.value })}
                  />
                </Field>

                <Field label="季数">
                  <Input
                    type="number"
                    min="1"
                    value={form.season}
                    onChange={(event) => onFormChange({ ...form, season: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="标题过滤">
                <Input
                  value={form.filters}
                  onChange={(event) => onFormChange({ ...form, filters: event.target.value })}
                  placeholder="例如 1080p, 简中"
                />
              </Field>

              <div className="grid gap-2">
                <Label>RSS</Label>
                <div className="break-all rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-400">
                  {form.rss}
                </div>
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Check className="mr-2 size-4" />
                )}
                写入配置
              </Button>
            </section>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
