import express from 'express';
import { logger } from '../config/logger.js';
import { getBangumiDetail, searchBangumi } from '../mikan/api.js';
import { DownloadService } from './downloads.js';
import { HttpError } from './http-error.js';
import { SubscriptionService } from './subscriptions.js';
import { downloadTask } from '../tasks/download-task.js';

export interface AppOptions {
  configPath?: string;
  dbPath?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const configPath = options.configPath ?? 'config/config.yaml';
  const dbPath = options.dbPath ?? 'db/db.json';
  const subscriptions = new SubscriptionService(configPath, dbPath);
  const downloads = new DownloadService(configPath, dbPath);

  app.use(express.json());

  app.get('/api/config', (_request, response) => {
    response.json(subscriptions.list());
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

  app.get('/api/downloads', async (_request, response) => {
    response.json(await downloads.state());
  });

  app.post('/api/rss/refresh', async (_request, response) => {
    response.json(await downloadTask({ configPath, dbPath }));
  });

  app.post('/api/seasons', (request, response) => {
    const config = subscriptions.add(request.body);
    response.status(201).json(config);

    void downloadTask({ configPath, dbPath }).catch((error: unknown) => {
      logger.warn(`Immediate subscription scan failed: ${(error as Error).message}`);
    });
  });

  app.patch('/api/seasons/:index', (request, response) => {
    const index = Number(request.params.index);
    response.json(subscriptions.update(index, request.body));
  });

  app.delete('/api/seasons/:index', async (request, response) => {
    const index = Number(request.params.index);
    response.json(await subscriptions.delete(index));
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
