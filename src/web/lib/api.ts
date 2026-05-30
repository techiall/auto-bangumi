import type {
  AddSeasonPayload,
  AppConfig,
  DownloadState,
  MikanBangumiDetail,
  MikanSearchResult,
  RssRefreshResult,
  UpdateSeasonPayload,
} from '~/types';

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

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
    if (response.status === 401) throw new AuthenticationError(message);
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

export function deleteSeason(rss: string) {
  return request<AppConfig>(`/api/seasons?rss=${encodeURIComponent(rss)}`, {
    method: 'DELETE',
  });
}

export function updateSeason(rss: string, payload: UpdateSeasonPayload) {
  return request<AppConfig>(`/api/seasons?rss=${encodeURIComponent(rss)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function refreshRssFeeds() {
  return request<RssRefreshResult>('/api/rss/refresh', {
    method: 'POST',
  });
}

export function fetchDownloads(subscriptionRss?: string) {
  const query = subscriptionRss ? `?subscription=${encodeURIComponent(subscriptionRss)}` : '';
  return request<DownloadState>(`/api/downloads${query}`);
}

export function downloadsWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/downloads/ws`;
}

export function login(username: string, password: string) {
  return request<{ ok: true }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  });
}

export function fetchSession() {
  return request<{ authenticated: boolean }>('/api/auth/session');
}
