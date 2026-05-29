import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { logger } from './config/logger.js';
import { getBangumiDetail, searchBangumi } from './mikan/api.js';
import { DownloadService } from './downloads.js';
import { HttpError } from './http-error.js';
import { MoverJobService } from './mover-jobs.js';
import { SubscriptionService } from './subscriptions.js';
import { downloadTask } from './tasks/download-task.js';

const DEFAULT_MOVER_API_TOKEN = 'auto-bangumi-local-mover-api-token';

export interface AppOptions {
  dbPath?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const dbPath = options.dbPath ?? 'db/state.sqlite';
  const subscriptions = new SubscriptionService(dbPath);
  const downloads = new DownloadService(dbPath);
  const moverJobs = new MoverJobService(dbPath);
  const moverToken = readMoverApiToken();

  app.use(express.json());

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

  app.get('/api/mover/jobs', (request, response, next) => {
    if (!isAuthorizedMoverRequest(request, moverToken)) {
      response.status(401).json({ message: 'Unauthorized mover request.' });
      return;
    }

    moverJobs.list().then((jobs) => response.json({ jobs }), next);
  });

  app.post('/api/mover/jobs/claim', (request, response, next) => {
    if (!isAuthorizedMoverRequest(request, moverToken)) {
      response.status(401).json({ message: 'Unauthorized mover request.' });
      return;
    }

    const limit = Number(request.query.limit ?? 1);
    moverJobs
      .claim(Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 1)
      .then((result) => response.json(result), next);
  });

  app.post('/api/mover/jobs/:hash/complete', (request, response, next) => {
    if (!isAuthorizedMoverRequest(request, moverToken)) {
      response.status(401).json({ message: 'Unauthorized mover request.' });
      return;
    }

    moverJobs.complete(request.params.hash, request.body).then((result) => response.json(result), next);
  });

  app.post('/api/mover/jobs/:hash/fail', (request, response, next) => {
    if (!isAuthorizedMoverRequest(request, moverToken)) {
      response.status(401).json({ message: 'Unauthorized mover request.' });
      return;
    }

    moverJobs.fail(request.params.hash, request.body).then((result) => response.json(result), next);
  });

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

  app.patch('/api/seasons/:index', async (request, response) => {
    const index = Number(request.params.index);
    response.json(await subscriptions.update(index, request.body));
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

function readMoverApiToken() {
  const token = process.env.MOVER_API_TOKEN?.trim();

  if (token?.startsWith('replace-with-')) {
    throw new Error('MOVER_API_TOKEN must be changed from the placeholder value.');
  }

  return token || DEFAULT_MOVER_API_TOKEN;
}

function isAuthorizedMoverRequest(request: express.Request, token: string) {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) return false;

  const supplied = header.slice('Bearer '.length);
  const expectedBuffer = Buffer.from(token);
  const suppliedBuffer = Buffer.from(supplied);

  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
