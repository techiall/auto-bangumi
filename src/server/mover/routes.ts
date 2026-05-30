import type express from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { HttpError } from '../http-error.js';
import { MoverJobService } from '../mover-jobs.js';

export function registerMoverRoutes(app: express.Express, moverJobs: MoverJobService) {
  app.get('/api/mover/jobs', (_request, response, next) => {
    moverJobs.list().then((jobs) => response.json({ jobs }), next);
  });

  app.post('/api/mover/jobs/claim', (request, response, next) => {
    const limit = Number(request.query.limit ?? 1);
    moverJobs
      .claim(Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 1)
      .then((result) => response.json(result), next);
  });

  app.post('/api/mover/jobs/:hash/complete', (request, response, next) => {
    moverJobs.complete(request.params.hash, request.body).then((result) => response.json(result), next);
  });

  app.get('/api/mover/jobs/:hash/source', async (request, response, next) => {
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
    moverJobs.fail(request.params.hash, request.body).then((result) => response.json(result), next);
  });
}
