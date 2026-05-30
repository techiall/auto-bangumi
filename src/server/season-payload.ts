import { type SubscriptionConfig } from './config/app-config.js';
import { HttpError } from './http-error.js';

export interface SeasonPayload {
  rss?: unknown;
  title?: unknown;
  folder?: unknown;
  season?: unknown;
  filters?: unknown;
}

export interface SeasonUpdatePayload {
  folder?: unknown;
  season?: unknown;
  filters?: unknown;
  archived?: unknown;
}

export function parseSeasonPayload(payload: SeasonPayload): SubscriptionConfig {
  const rss = String(payload.rss ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const folder = String(payload.folder ?? title).trim();
  const season = normalizeSeason(payload.season, 1);
  const filters = normalizeStringArray(payload.filters);

  if (!rss) throw new HttpError(400, 'RSS is required.');
  if (!title) throw new HttpError(400, 'Title is required.');
  if (!Number.isInteger(season) || season <= 0) {
    throw new HttpError(400, 'Season must be a positive integer.');
  }

  return {
    rss,
    title,
    folder: folder || title,
    season,
    filters: filters.length ? filters : undefined,
    archived: false,
  };
}

export function parseSeasonUpdatePayload(
  payload: SeasonUpdatePayload,
  current: SubscriptionConfig,
): Pick<SubscriptionConfig, 'folder' | 'season' | 'filters' | 'archived'> {
  const season = normalizeSeason(payload.season, current.season);
  const folder = String(payload.folder ?? current.folder).trim();
  const filters = payload.filters === undefined ? current.filters : normalizeStringArray(payload.filters);
  const archived = normalizeOptionalBoolean(payload.archived, current.archived);

  if (!Number.isInteger(season) || season <= 0) {
    throw new HttpError(400, 'Season must be a positive integer.');
  }

  return {
    folder: folder || current.title,
    season,
    filters: filters?.length ? filters : undefined,
    archived,
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
}

function normalizeSeason(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') return fallback;
  return Number(value);
}

function normalizeOptionalBoolean(value: unknown, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === true;
}
