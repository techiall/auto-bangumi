import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { CurrentSubscriptions } from '~/components/subscription/current-subscriptions';
import { PageHero } from '~/components/subscription/page-hero';
import { SearchPanel } from '~/components/subscription/search-panel';
import { SubscriptionSettings, type SubscriptionFormState } from '~/components/subscription/subscription-settings';
import { addSeason, browseSeason, deleteSeason, fetchBangumiDetail, fetchConfig, searchMikan } from '~/lib/api';
import { asMessage, splitCommaList } from '~/lib/subscription';
import { cn } from '~/lib/utils';
import type { AddSeasonPayload, AppConfig, MikanBangumiDetail, MikanSearchResult } from '~/types';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MikanSearchResult[]>([]);
  const [selectedBangumi, setSelectedBangumi] = useState<MikanBangumiDetail | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [loadingBangumiId, setLoadingBangumiId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState<SubscriptionFormState>({
    title: '',
    seasonNumber: '1',
    matchTitle: '',
    rss: '',
  });

  useEffect(() => {
    void refreshConfig();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedGroup = useMemo(
    () => selectedBangumi?.groups.find((group) => group.id === selectedGroupId) ?? null,
    [selectedBangumi, selectedGroupId],
  );

  const displayedSeasons = useMemo(
    () => (config?.seasons ?? []).map((season, index) => ({ season, index })).reverse(),
    [config],
  );

  useEffect(() => {
    if (!selectedBangumi) return;
    setForm({
      title: selectedBangumi.title,
      seasonNumber: '1',
      matchTitle: '',
      rss: selectedBangumi.groups[0]?.rss ?? selectedBangumi.rss,
    });
  }, [selectedBangumi]);

  useEffect(() => {
    if (!selectedBangumi) return;
    setForm((current) => ({
      ...current,
      rss: selectedGroup?.rss ?? selectedBangumi.rss,
    }));
  }, [selectedBangumi, selectedGroup]);

  async function refreshConfig() {
    setIsConfigLoading(true);
    try {
      setConfig(await fetchConfig());
    } catch (error) {
      showNotice(asMessage(error), 'error');
    } finally {
      setIsConfigLoading(false);
    }
  }

  async function runSearch(keyword: string, source: 'search' | 'browse' = 'search') {
    const isBrowse = source === 'browse';
    if (isBrowse) {
      setIsBrowseLoading(true);
    } else {
      setIsSearchLoading(true);
    }

    try {
      const list = isBrowse || !keyword.trim() ? await browseSeason() : await searchMikan(keyword);
      setResults(list);
    } catch (error) {
      setResults([]);
      showNotice(asMessage(error), 'error');
    } finally {
      if (isBrowse) {
        setIsBrowseLoading(false);
      } else {
        setIsSearchLoading(false);
      }
    }
  }

  async function chooseBangumi(item: MikanSearchResult) {
    if (selectedBangumi?.id === item.id) {
      setSelectedBangumi(null);
      setSelectedGroupId(null);
      setNotice(null);
      setForm({
        title: '',
        seasonNumber: '1',
        matchTitle: '',
        rss: '',
      });
      return;
    }

    setLoadingBangumiId(item.id);
    try {
      const detail = await fetchBangumiDetail(item.id);
      setSelectedBangumi(detail);
      setSelectedGroupId(detail.groups[0]?.id ?? null);
      setIsSettingsOpen(true);
    } catch (error) {
      showNotice(asMessage(error), 'error');
    } finally {
      setLoadingBangumiId(null);
    }
  }

  async function handleDelete(index: number) {
    try {
      const next = await deleteSeason(index);
      setConfig(next);
      showNotice('已从配置中移除。', 'success');
    } catch (error) {
      showNotice(asMessage(error), 'error');
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
      showNotice('已写入 config.yaml。', 'success');
    } catch (error) {
      showNotice(asMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#020617,#0f172a_48%,#111827)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <PageHero />

        {notice && !selectedBangumi ? (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              notice.kind === 'error'
                ? 'border-rose-900 bg-rose-950/70 text-rose-100'
                : 'border-cyan-900 bg-cyan-950/70 text-cyan-100',
            )}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="grid gap-5">
          <SearchPanel
            query={query}
            results={results}
            selectedBangumiId={selectedBangumi?.id}
            loadingBangumiId={loadingBangumiId}
            isSearchLoading={isSearchLoading}
            isBrowseLoading={isBrowseLoading}
            onQueryChange={setQuery}
            onSearch={() => void runSearch(query)}
            onBrowse={() => void runSearch('', 'browse')}
            onChoose={(item) => void chooseBangumi(item)}
          />

          {selectedBangumi ? (
            <SubscriptionSettings
              bangumi={selectedBangumi}
              selectedGroup={selectedGroup}
              selectedGroupId={selectedGroupId}
              form={form}
              isOpen={isSettingsOpen}
              isSubmitting={isSubmitting}
              notice={notice}
              onToggleOpen={() => setIsSettingsOpen((open) => !open)}
              onGroupSelect={setSelectedGroupId}
              onFormChange={setForm}
              onSubmit={(event) => void handleSubmit(event)}
            />
          ) : null}
        </div>

        <CurrentSubscriptions
          seasons={displayedSeasons}
          isLoading={isConfigLoading}
          onRefresh={() => void refreshConfig()}
          onDelete={(index) => void handleDelete(index)}
        />
      </main>

    </div>
  );

  function showNotice(message: string, kind: 'success' | 'error') {
    setNotice({ kind, message });
  }
}
