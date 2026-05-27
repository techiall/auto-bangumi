import { createFileRoute } from '@tanstack/react-router';
import { loadConfig, saveConfig } from '~/server/config';

export const Route = createFileRoute('/api/seasons/$index')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const index = Number(params.index);
        const config = loadConfig();

        if (!Number.isInteger(index) || index < 0 || index >= config.seasons.length) {
          return Response.json({ message: 'Season not found.' }, { status: 404 });
        }

        config.seasons.splice(index, 1);
        saveConfig(config);
        return Response.json(config);
      },
    },
  },
});
