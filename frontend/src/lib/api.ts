import type {
  AddSeasonPayload,
  AppConfig,
  DownloadState,
  MikanBangumiDetail,
  MikanSearchResult,
  RssRefreshResult,
  UpdateSeasonPayload,
} from '~/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export function fetchConfig() {
  return request<AppConfig>('/api/config');
}

export function searchMikan(query: string) {
  return request<MikanSearchResult[]>(`/api/mikan/search?q=${encodeURIComponent(query)}`);
}

export function browseSeason() {
  return request<MikanSearchResult[]>('/api/mikan/search');
}

export function fetchBangumiDetail(id: number) {
  return request<MikanBangumiDetail>(`/api/mikan/bangumi/${id}`);
}

export function addSeason(payload: AddSeasonPayload) {
  return request<AppConfig>('/api/seasons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteSeason(index: number) {
  return request<AppConfig>(`/api/seasons/${index}`, {
    method: 'DELETE',
  });
}

export function updateSeason(index: number, payload: UpdateSeasonPayload) {
  return request<AppConfig>(`/api/seasons/${index}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function refreshRssFeeds() {
  return request<RssRefreshResult>('/api/rss/refresh', {
    method: 'POST',
  });
}

export function fetchDownloads() {
  return request<DownloadState>('/api/downloads');
}
