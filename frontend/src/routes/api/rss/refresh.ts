import { createFileRoute } from '@tanstack/react-router';
import { forwardToBackend } from '~/server/backend-api';

export const Route = createFileRoute('/api/rss/refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => forwardToBackend('/api/rss/refresh', request),
    },
  },
});
