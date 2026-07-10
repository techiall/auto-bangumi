import { createFileRoute } from '@tanstack/react-router';
import { forwardApiRequest } from '~/server/server-api';

const proxy = async ({ request }: { request: Request }) => forwardApiRequest(request);

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
    },
  },
});
