import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/mover/jobs/claim')({
  server: {
    handlers: {
      POST: async ({ request }) => forwardToServer(`/api/mover/jobs/claim${new URL(request.url).search}`, request),
    },
  },
});
