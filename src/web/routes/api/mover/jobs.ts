import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/mover/jobs')({
  server: {
    handlers: {
      GET: async ({ request }) => forwardToServer('/api/mover/jobs', request),
    },
  },
});
