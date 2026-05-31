import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/mikan/bangumi/$id')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = Number(params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return Response.json({ message: 'Invalid bangumi id.' }, { status: 400 });
        }

        return forwardToServer(`/api/mikan/bangumi/${id}`, request);
      },
    },
  },
});
