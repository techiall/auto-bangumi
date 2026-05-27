import { createFileRoute } from '@tanstack/react-router';
import { Check, ExternalLink, Layers3, LoaderCircle, RefreshCcw, Search, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { addSeason, browseSeason, deleteSeason, fetchBangumiDetail, fetchConfig, searchMikan } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import type { AddSeasonPayload, AppConfig, MikanBangumiDetail, MikanBangumiGroup, MikanSearchResult } from '~/types';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MikanSearchResult[]>([]);
  const [feedback, setFeedback] = useState('输入关键词后点搜索，或者直接浏览本季番组。');
  const [selectedBangumi, setSelectedBangumi] = useState<MikanBangumiDetail | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadingBangumiId, setLoadingBangumiId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState({
    title: '',
    seasonNumber: '1',
    matchTitle: '',
    rss: '',
  });

  useEffect(() => {
    void refreshConfig();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedGroup = useMemo(
    () => selectedBangumi?.groups.find((group) => group.id === selectedGroupId) ?? null,
    [selectedBangumi, selectedGroupId],
  );

  useEffect(() => {
    if (!selectedBangumi) return;
    setForm((current) => ({
      ...current,
      title: selectedBangumi.title,
      rss: selectedGroup?.rss ?? selectedBangumi.rss,
    }));
  }, [selectedBangumi, selectedGroup]);

  async function refreshConfig() {
    setIsConfigLoading(true);
    try {
      setConfig(await fetchConfig());
    } catch (error) {
      showToast(asMessage(error), 'error');
    } finally {
      setIsConfigLoading(false);
    }
  }

  async function runSearch(keyword: string) {
    setIsSearchLoading(true);
    try {
      const list = keyword.trim() ? await searchMikan(keyword) : await browseSeason();
      setResults(list);
      setFeedback(
        list.length
          ? `找到 ${list.length} 个结果。选一个番组继续。`
          : keyword.trim()
            ? '没有找到结果，换个关键词试试。'
            : '当前没有可展示的本季番组。',
      );
    } catch (error) {
      setResults([]);
      setFeedback(asMessage(error));
      showToast(asMessage(error), 'error');
    } finally {
      setIsSearchLoading(false);
    }
  }

  async function chooseBangumi(item: MikanSearchResult) {
    setIsDetailLoading(true);
    setLoadingBangumiId(item.id);
    try {
      const detail = await fetchBangumiDetail(item.id);
      setSelectedBangumi(detail);
      setSelectedGroupId(detail.groups[0]?.id ?? null);
      setFeedback(`已选择 ${detail.title}，请确认字幕组和写入内容。`);
    } catch (error) {
      showToast(asMessage(error), 'error');
    } finally {
      setIsDetailLoading(false);
      setLoadingBangumiId(null);
    }
  }

  async function handleDelete(index: number) {
    try {
      const next = await deleteSeason(index);
      setConfig(next);
      showToast('已从配置中移除。', 'success');
    } catch (error) {
      showToast(asMessage(error), 'error');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload: AddSeasonPayload = {
      title: form.title.trim(),
      seasonNumber: Number(form.seasonNumber),
      matchTitle: splitCommaList(form.matchTitle),
      rss: form.rss.trim(),
    };

    try {
      const next = await addSeason(payload);
      setConfig(next);
      showToast('已写入 config.yaml。', 'success');
    } catch (error) {
      showToast(asMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_24%),radial-gradient(circle_at_left_bottom,rgba(249,115,22,0.10),transparent_22%),#f7f4ee]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <Card className="overflow-hidden border-stone-200 bg-[linear-gradient(135deg,rgba(255,252,246,0.98),rgba(243,250,247,0.98))]">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1.45fr_0.85fr] md:p-8">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800">
                Bangumi Manager
              </Badge>
              <div className="space-y-2">
                <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">订阅管理</h1>
                <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">搜索番组，选择字幕组，确认后写入订阅。</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-900">当前流程</div>
                  <div className="text-sm text-stone-500">先搜番组，再选字幕组，最后确认写入。</div>
                </div>
              </div>
              <Separator />
              <div className="grid gap-2 text-sm text-stone-600">
                <div>1. 查看已有订阅，避免重复添加。</div>
                <div>2. 搜索番组或浏览本季列表。</div>
                <div>3. 选定字幕组，确认 RSS 和过滤条件。</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="mb-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Step 1</p>
              <CardTitle>找番组</CardTitle>
              <CardDescription>先搜索，再从结果里选一个番组继续。</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch(query);
              }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="输入番名，例如 Ave Mujica"
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={isSearchLoading}>
                {isSearchLoading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
                搜索
              </Button>
              <Button variant="outline" type="button" onClick={() => void runSearch('')} disabled={isSearchLoading}>
                查看本季番组
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
              <span className="font-medium text-stone-800">搜索状态</span>
              <span>{feedback}</span>
              {results.length ? <Badge variant="outline">结果 {results.length}</Badge> : null}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setResults([]);
                  setFeedback('结果已清空。重新搜索即可。');
                }}
              >
                清空结果
              </Button>
            </div>

            <div className="max-h-[34rem] overflow-y-auto pr-1">
              <div className="grid gap-4 xl:grid-cols-2">
              {results.length === 0 && !isSearchLoading ? (
                  <div className="xl:col-span-2">
                    <StateBox icon={<Search className="size-4" />} text="这里会显示搜索结果。" />
                  </div>
              ) : (
                results.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 sm:grid-cols-[112px_1fr]"
                  >
                    <div className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#dff1ec,#f5e7cf)]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="h-28 w-full object-cover sm:w-28" />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center text-stone-400 sm:w-28">
                          No Cover
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="font-medium text-stone-900">{item.title}</div>
                        <div className="text-sm text-stone-500">Bangumi ID: {item.id}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="soft" size="sm" onClick={() => void chooseBangumi(item)} disabled={isDetailLoading}>
                          {loadingBangumiId === item.id ? (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 size-4" />
                          )}
                          选择这个番组
                        </Button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'inline-flex h-9 items-center justify-center rounded-xl border border-stone-300 px-3 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50',
                          )}
                        >
                          打开蜜柑
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="p-5">
            <CardHeader className="mb-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Step 2</p>
                <CardTitle>当前订阅</CardTitle>
                <CardDescription>先看现有列表，避免重复写入同一条 RSS。</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => void refreshConfig()}>
                <RefreshCcw className="mr-2 size-4" />
                刷新
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isConfigLoading ? (
                <StateBox icon={<LoaderCircle className="size-4 animate-spin" />} text="正在读取配置..." />
              ) : !config?.seasons.length ? (
                <StateBox icon={<Layers3 className="size-4" />} text="当前还没有订阅。" />
              ) : (
                config.seasons.map((season, index) => (
                  <div key={`${season.rss}-${index}`} className="rounded-3xl border border-stone-200 bg-stone-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="font-medium text-stone-900">{season.title}</div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="muted">Season {season.seasonNumber}</Badge>
                          {season.match?.title?.length ? <Badge variant="outline">过滤 {season.match.title.join(' / ')}</Badge> : null}
                        </div>
                        <a
                          href={season.rss}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-emerald-800 hover:underline"
                        >
                          查看 RSS
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>

                      <Button variant="danger" size="sm" onClick={() => void handleDelete(index)}>
                        <Trash2 className="mr-2 size-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="p-5">
            <CardHeader className="mb-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Step 3</p>
                <CardTitle>确认并写入</CardTitle>
                <CardDescription>选定字幕组后，最后检查一下标题、季数和过滤词。</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedBangumi ? (
                <StateBox icon={<Sparkles className="size-4" />} text="先从中间选一个番组。" />
              ) : (
                <>
                  <div className="rounded-3xl border border-stone-200 bg-stone-50/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                          已选择番组
                        </Badge>
                        <div className="font-serif text-2xl font-bold text-stone-900">{selectedBangumi.title}</div>
                      </div>
                      <a
                        href={selectedBangumi.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-800 hover:underline"
                      >
                        打开详情
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-stone-900">字幕组</div>
                      <div className="mt-1 text-sm text-stone-500">
                        {selectedGroup ? `当前选中：${selectedGroup.name}` : '这个番组暂时没有解析到字幕组。'}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {selectedBangumi.groups.map((group) => (
                        <GroupOption
                          key={group.id}
                          group={group}
                          active={group.id === selectedGroupId}
                          onClick={() => setSelectedGroupId(group.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
                    <Field label="标题">
                      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    </Field>

                    <Field label="季数">
                      <Input
                        type="number"
                        min="1"
                        value={form.seasonNumber}
                        onChange={(event) => setForm({ ...form, seasonNumber: event.target.value })}
                      />
                    </Field>

                    <Field label="标题过滤">
                      <Input
                        value={form.matchTitle}
                        onChange={(event) => setForm({ ...form, matchTitle: event.target.value })}
                        placeholder="例如 1080p, 简中"
                      />
                    </Field>

                    <Field label="RSS">
                      <Input value={form.rss} readOnly />
                    </Field>

                    <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                      写入配置
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {toast ? (
        <div
          className={cn(
            'fixed bottom-4 right-4 rounded-2xl px-4 py-3 text-sm text-white shadow-lg',
            toast.kind === 'error' ? 'bg-rose-700' : 'bg-stone-900',
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );

  function showToast(message: string, kind: 'success' | 'error') {
    setToast({ kind, message });
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function GroupOption({
  group,
  active,
  onClick,
}: {
  group: MikanBangumiGroup;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid gap-2 rounded-2xl border px-4 py-3 text-left transition-colors',
        active ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 bg-white hover:bg-stone-50',
      )}
    >
      <div className="font-medium text-stone-900">{group.name}</div>
      <div className="break-all text-xs leading-5 text-stone-500">{group.rss}</div>
    </button>
  );
}

function StateBox({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function splitCommaList(input: string) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : '发生了未知错误。';
}
