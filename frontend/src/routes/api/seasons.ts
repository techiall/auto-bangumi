import { createFileRoute } from '@tanstack/react-router';
import { loadConfig, saveConfig, type SubscriptionConfig } from '~/server/config';

interface SeasonPayload {
  rss?: unknown;
  title?: unknown;
  season?: unknown;
  filters?: unknown;
}

export const Route = createFileRoute('/api/seasons')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = (await request.json()) as SeasonPayload;
        const season = parseSeasonPayload(payload);
        const config = loadConfig();

        if (config.subscriptions.some((existing) => existing.rss === season.rss)) {
          return Response.json({ message: 'This RSS already exists in config.' }, { status: 409 });
        }

        config.subscriptions.push(season);
        saveConfig(config);
        return Response.json(config, { status: 201 });
      },
    },
  },
});

function parseSeasonPayload(payload: SeasonPayload): SubscriptionConfig {
  const rss = String(payload.rss ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const season = Number(payload.season);
  const filters = normalizeStringArray(payload.filters);

  if (!rss) throw new Error('RSS is required.');
  if (!title) throw new Error('Title is required.');
  if (!Number.isInteger(season) || season <= 0) {
    throw new Error('Season must be a positive integer.');
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
