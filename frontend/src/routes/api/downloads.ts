import { createFileRoute } from '@tanstack/react-router';
import { forwardToBackend } from '~/server/backend-api';

export const Route = createFileRoute('/api/downloads')({
  server: {
    handlers: {
      GET: async ({ request }) => forwardToBackend('/api/downloads', request),
    },
  },
});
