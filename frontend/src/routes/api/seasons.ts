import { createFileRoute } from '@tanstack/react-router';
import { loadConfig, saveConfig, type SeasonConfig, type SeasonMatchConfig } from '~/server/config';

interface SeasonPayload {
  rss?: unknown;
  title?: unknown;
  seasonNumber?: unknown;
  matchTitle?: unknown;
}

export const Route = createFileRoute('/api/seasons')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = (await request.json()) as SeasonPayload;
        const season = parseSeasonPayload(payload);
        const config = loadConfig();

        if (config.seasons.some((existing) => existing.rss === season.rss)) {
          return Response.json({ message: 'This RSS already exists in config.' }, { status: 409 });
        }

        config.seasons.push(season);
        saveConfig(config);
        return Response.json(config, { status: 201 });
      },
    },
  },
});

function parseSeasonPayload(payload: SeasonPayload): SeasonConfig {
  const rss = String(payload.rss ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const seasonNumber = Number(payload.seasonNumber);
  const matchTitle = normalizeStringArray(payload.matchTitle);

  if (!rss) throw new Error('RSS is required.');
  if (!title) throw new Error('Title is required.');
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) {
    throw new Error('Season number must be a positive integer.');
  }

  return {
    rss,
    title,
    seasonNumber,
    match: createMatchConfig(matchTitle),
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function createMatchConfig(title: string[]): SeasonMatchConfig | undefined {
  if (!title.length) return undefined;
  return { title };
}
