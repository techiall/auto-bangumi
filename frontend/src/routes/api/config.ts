import { createFileRoute } from '@tanstack/react-router';
import { loadConfig } from '~/server/config';

export const Route = createFileRoute('/api/config')({
  server: {
    handlers: {
      GET: async () => Response.json(loadConfig()),
    },
  },
});
