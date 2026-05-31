import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/mover/jobs/$hash/fail')({
  server: {
    handlers: {
      POST: async ({ params, request }) =>
        forwardToServer(`/api/mover/jobs/${encodeURIComponent(params.hash)}/fail`, request),
    },
  },
});
