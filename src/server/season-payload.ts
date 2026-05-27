import { type SubscriptionConfig } from '../config/app-config.js';
import { HttpError } from './http-error.js';

export interface SeasonPayload {
  rss?: unknown;
  title?: unknown;
  season?: unknown;
  filters?: unknown;
}

export function parseSeasonPayload(payload: SeasonPayload): SubscriptionConfig {
  const rss = String(payload.rss ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const season = Number(payload.season);
  const filters = normalizeStringArray(payload.filters);

  if (!rss) throw new HttpError(400, 'RSS is required.');
  if (!title) throw new HttpError(400, 'Title is required.');
  if (!Number.isInteger(season) || season <= 0) {
    throw new HttpError(400, 'Season must be a positive integer.');
  }

  return {
    rss,
    title,
    season,
    filters: filters.length ? filters : undefined,
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
}
