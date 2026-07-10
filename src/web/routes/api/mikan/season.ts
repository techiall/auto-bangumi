import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/mikan/season')({
  server: {
    handlers: {
      GET: async ({ request }) => forwardToServer('/api/mikan/season', request),
    },
  },
});
