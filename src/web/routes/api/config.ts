import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/config')({
  server: {
    handlers: {
      GET: async ({ request }) => forwardToServer('/api/config', request),
    },
  },
});
