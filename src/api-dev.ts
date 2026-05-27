import express from 'express';
import { loadConfig, saveConfig, type SeasonConfig, type SeasonMatchConfig } from './config.js';
import { getBangumiDetail, searchBangumi } from './mikan.js';

interface SeasonPayload {
  rss?: unknown;
  title?: unknown;
  seasonNumber?: unknown;
  matchTitle?: unknown;
}

const app = express();
const port = Number(process.env.API_PORT ?? 3000);
const configPath = process.env.CONFIG_PATH ?? 'config/config.yaml';

app.use(express.json());

app.get('/api/config', (_request, response) => {
  response.json(loadConfig(configPath));
});

app.get('/api/mikan/search', async (request, response) => {
  const query = String(request.query.q ?? '').trim();
  response.json(await searchBangumi(query));
});

app.get('/api/mikan/bangumi/:id', async (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Invalid bangumi id.' });
    return;
  }

  response.json(await getBangumiDetail(id));
});

app.post('/api/seasons', (request, response) => {
  const payload = request.body as SeasonPayload;
  const season = parseSeasonPayload(payload);
  const config = loadConfig(configPath);

  if (config.seasons.some((existing) => existing.rss === season.rss)) {
    response.status(409).json({ message: 'This RSS already exists in config.' });
    return;
  }

  config.seasons.push(season);
  saveConfig(config, configPath);
  response.status(201).json(config);
});

app.delete('/api/seasons/:index', (request, response) => {
  const index = Number(request.params.index);
  const config = loadConfig(configPath);

  if (!Number.isInteger(index) || index < 0 || index >= config.seasons.length) {
    response.status(404).json({ message: 'Season not found.' });
    return;
  }

  config.seasons.splice(index, 1);
  saveConfig(config, configPath);
  response.json(config);
});

app.use('/api', (error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  response.status(500).json({ message });
});

app.listen(port, () => {
  console.log(`API dev server is running on http://localhost:${port}`);
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
