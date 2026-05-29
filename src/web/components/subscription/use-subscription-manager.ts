import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { Notice } from '~/components/subscription/notice-banner';
import type { SubscriptionFormState } from '~/components/subscription/subscription-settings';
import {
  addSeason,
  browseSeason,
  deleteSeason,
  fetchBangumiDetail,
  fetchConfig,
  refreshRssFeeds,
  searchMikan,
  updateSeason,
} from '~/lib/api';
import { asMessage, splitCommaList } from '~/lib/subscription';
import type { AddSeasonPayload, AppConfig, MikanBangumiDetail, MikanSearchResult, UpdateSeasonPayload } from '~/types';

const emptyForm: SubscriptionFormState = {
  title: '',
  folder: '',
  season: '1',
  filters: '',
  rss: '',
};

export function useSubscriptionManager() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MikanSearchResult[]>([]);
  const [selectedBangumi, setSelectedBangumi] = useState<MikanBangumiDetail | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [isRssRefreshing, setIsRssRefreshing] = useState(false);
  const [loadingBangumiId, setLoadingBangumiId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState<SubscriptionFormState>(emptyForm);

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

  const displayedSubscriptions = useMemo(
    () => (config?.subscriptions ?? []).map((subscription) => ({ subscription, key: subscription.rss })).reverse(),
    [config],
  );

  useEffect(() => {
    if (!selectedBangumi) return;
    setForm({
      title: selectedBangumi.title,
      folder: selectedBangumi.folder,
      season: '1',
      filters: '',
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

  async function refreshRss() {
    setIsRssRefreshing(true);
    try {
      const result = await refreshRssFeeds();
      showNotice(formatRssRefreshMessage(result), 'success');
    } catch (error) {
      showNotice(asMessage(error), 'error');
    } finally {
      setIsRssRefreshing(false);
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
      clearSelection();
      return;
    }

    setLoadingBangumiId(item.id);
    try {
      const detail = await fetchBangumiDetail(item.id);
      setSelectedBangumi(detail);
      setSelectedGroupId(detail.groups[0]?.id ?? null);
    } catch (error) {
      showNotice(asMessage(error), 'error');
    } finally {
      setLoadingBangumiId(null);
    }
  }

  async function handleDelete(rss: string) {
    try {
      setConfig(await deleteSeason(rss));
      showNotice('Subscription removed.', 'success');
    } catch (error) {
      showNotice(asMessage(error), 'error');
    }
  }

  async function handleUpdate(rss: string, payload: UpdateSeasonPayload) {
    try {
      setConfig(await updateSeason(rss, payload));
      showNotice('Subscription updated.', 'success');
    } catch (error) {
      showNotice(asMessage(error), 'error');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload: AddSeasonPayload = {
      title: form.title.trim(),
      folder: form.folder.trim() || form.title.trim(),
      season: Number(form.season),
      filters: splitCommaList(form.filters),
      rss: form.rss.trim(),
    };

    try {
      setConfig(await addSeason(payload));
      showNotice('Subscription saved.', 'success');
      setSelectedBangumi(null);
      setSelectedGroupId(null);
      setForm(emptyForm);
    } catch (error) {
      showNotice(asMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearSelection() {
    setSelectedBangumi(null);
    setSelectedGroupId(null);
    setNotice(null);
    setForm(emptyForm);
  }

  function showNotice(message: string, kind: Notice['kind']) {
    setNotice({ kind, message });
  }

  return {
    displayedSubscriptions,
    form,
    isBrowseLoading,
    isConfigLoading,
    isRssRefreshing,
    isSearchLoading,
    isSubmitting,
    loadingBangumiId,
    notice,
    query,
    results,
    selectedBangumi,
    selectedGroup,
    selectedGroupId,
    chooseBangumi,
    handleDelete,
    handleSubmit,
    handleUpdate,
    refreshConfig,
    refreshRss,
    runSearch,
    setForm,
    setQuery,
    setSelectedGroupId,
    clearSelection,
  };
}

function formatRssRefreshMessage(result: { queuedCount: number; archivedSubscriptionCount: number }) {
  const archivedSuffix = result.archivedSubscriptionCount
    ? ` Skipped ${result.archivedSubscriptionCount} archived subscription${
        result.archivedSubscriptionCount === 1 ? '' : 's'
      }.`
    : '';

  if (result.queuedCount > 0) {
    return `RSS refreshed. Queued ${result.queuedCount} new episode${result.queuedCount === 1 ? '' : 's'}.${archivedSuffix}`;
  }

  return `RSS refreshed. No new episodes found.${archivedSuffix}`;
}
