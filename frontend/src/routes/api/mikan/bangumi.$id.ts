import { createFileRoute } from '@tanstack/react-router';
import { getBangumiDetail } from '~/server/mikan';

export const Route = createFileRoute('/api/mikan/bangumi/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = Number(params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return Response.json({ message: 'Invalid bangumi id.' }, { status: 400 });
        }

        return Response.json(await getBangumiDetail(id));
      },
    },
  },
});
