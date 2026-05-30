import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
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

  registerMoverRoutes(app, moverJobs, moverToken);

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
  const moverToken = readMoverApiToken({ requireExplicit: true });

  app.use(express.json());
  registerMoverRoutes(app, moverJobs, moverToken);
  app.use('/api', apiErrorHandler);

  return app;
}

function registerMoverRoutes(app: express.Express, moverJobs: MoverJobService, moverToken: string) {
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

  app.get('/api/mover/jobs/:hash/source', async (request, response, next) => {
    if (!isAuthorizedMoverRequest(request, moverToken)) {
      response.status(401).json({ message: 'Unauthorized mover request.' });
      return;
    }

    try {
      const source = await moverJobs.openSource(request.params.hash);
      if (!source.body) throw new HttpError(502, 'Download source returned an empty body.');

      const contentType = source.headers.get('content-type');
      const contentLength = source.headers.get('content-length');
      if (contentType) response.setHeader('content-type', contentType);
      if (contentLength) response.setHeader('content-length', contentLength);

      await pipeline(Readable.fromWeb(source.body as ReadableStream), response);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/mover/jobs/:hash/fail', (request, response, next) => {
    if (!isAuthorizedMoverRequest(request, moverToken)) {
      response.status(401).json({ message: 'Unauthorized mover request.' });
      return;
    }

    moverJobs.fail(request.params.hash, request.body).then((result) => response.json(result), next);
  });
}

function apiErrorHandler(
  error: unknown,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const status = error instanceof HttpError ? error.status : 500;
  response.status(status).json({ message });
}

function readRssQuery(request: express.Request) {
  const rss = String(request.query.rss ?? '').trim();
  if (!rss) throw new HttpError(400, 'RSS is required.');
  return rss;
}

function readMoverApiToken(options: { requireExplicit?: boolean } = {}) {
  const token = process.env.MOVER_API_TOKEN?.trim();

  if (token?.startsWith('replace-with-')) {
    throw new Error('MOVER_API_TOKEN must be changed from the placeholder value.');
  }

  if (options.requireExplicit && !token) {
    throw new Error('MOVER_API_TOKEN is required for the mover API.');
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
