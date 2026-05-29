import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/rss/refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => forwardToServer('/api/rss/refresh', request),
    },
  },
});
