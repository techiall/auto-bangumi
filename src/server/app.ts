import express from 'express';
import { loadConfig, saveConfig } from '../config/app-config.js';
import { getBangumiDetail, searchBangumi } from '../mikan/api.js';
import { HttpError } from './http-error.js';
import { parseSeasonPayload, type SeasonPayload } from './season-payload.js';

export interface AppOptions {
  configPath?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const configPath = options.configPath ?? 'config/config.yaml';

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
    const season = parseSeasonPayload(request.body as SeasonPayload);
    const config = loadConfig(configPath);

    if (config.subscriptions.some((existing) => existing.rss === season.rss)) {
      response.status(409).json({ message: 'This RSS already exists in config.' });
      return;
    }

    config.subscriptions.push(season);
    saveConfig(config, configPath);
    response.status(201).json(config);
  });

  app.delete('/api/seasons/:index', (request, response) => {
    const index = Number(request.params.index);
    const config = loadConfig(configPath);

    if (!Number.isInteger(index) || index < 0 || index >= config.subscriptions.length) {
      response.status(404).json({ message: 'Subscription not found.' });
      return;
    }

    config.subscriptions.splice(index, 1);
    saveConfig(config, configPath);
    response.json(config);
  });

  app.use(
    '/api',
    (error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = error instanceof HttpError ? error.status : 500;
      response.status(status).json({ message });
    },
  );

  return app;
}
