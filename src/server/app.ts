import express from 'express';
import { readServerCredentials, requireBasicAuth } from './auth/basic-auth.js';
import { logger } from './config/logger.js';
import { getBangumiDetail, searchBangumi } from './mikan/api.js';
import { DownloadService } from './downloads.js';
import { HttpError } from './http-error.js';
import { MoverJobService } from './mover-jobs.js';
import { registerMoverRoutes } from './mover/routes.js';
import { SubscriptionService } from './subscriptions.js';
import { downloadTask } from './tasks/download-task.js';
import type { AppOptions } from './app/types.js';

export function createApp(options: AppOptions = {}) {
  const app = express();
  const dbPath = options.dbPath ?? 'db/state.sqlite';
  const subscriptions = new SubscriptionService(dbPath);
  const downloads = new DownloadService(dbPath);
  const moverJobs = new MoverJobService(dbPath);

  app.use(express.json());
  app.use('/api', requireBasicAuth(readServerCredentials()));

  app.get('/api/config', async (_request, response) => {
    response.json(await subscriptions.list());
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

  registerMoverRoutes(app, moverJobs);

  app.post('/api/rss/refresh', async (_request, response) => {
    response.json(await downloadTask({ dbPath }));
  });

  app.post('/api/seasons', async (request, response) => {
    const config = await subscriptions.add(request.body);
    response.status(201).json(config);

    void downloadTask({ dbPath }).catch((error: unknown) => {
      logger.warn(`Immediate subscription scan failed: ${(error as Error).message}`);
    });
  });

  app.patch('/api/seasons', async (request, response) => {
    response.json(await subscriptions.update(readRssQuery(request), request.body));
  });

  app.delete('/api/seasons', async (request, response) => {
    response.json(await subscriptions.delete(readRssQuery(request)));
  });

  app.use('/api', apiErrorHandler);

  return app;
}

export function createMoverApp(options: AppOptions = {}) {
  const app = express();
  const dbPath = options.dbPath ?? 'db/state.sqlite';
  const moverJobs = new MoverJobService(dbPath);

  app.use(express.json());
  app.use('/api', requireBasicAuth(readServerCredentials()));
  registerMoverRoutes(app, moverJobs);
  app.use('/api', apiErrorHandler);

  return app;
}

function apiErrorHandler(
  error: unknown,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  if (response.headersSent) return;

  const message = error instanceof Error ? error.message : 'Unknown error';
  const status = error instanceof HttpError ? error.status : 500;
  response.status(status).json({ message });
}

function readRssQuery(request: express.Request) {
  const rss = String(request.query.rss ?? '').trim();
  if (!rss) throw new HttpError(400, 'RSS is required.');
  return rss;
}
