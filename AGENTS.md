# Agent Notes

This repository has two runtime parts:

- Download-side app code in `src/server/` and `src/web/`.
- Library-side mover code in `agent/`.

## Project Rules

- Default compose startup should need only `cp .env.example .env` before `docker compose up -d --build`.
- `.env.example` must be safe to copy directly to `.env` for single-machine Docker startup.
- `agent/.env.example` must be safe to copy directly to `agent/.env` for local agent runs.
- `MOVER_API_TOKEN` must not be exposed to the browser; default compose can use the built-in local fallback because the server API is not published.
- `/api/config` must not return qBittorrent credentials or other server-side secrets.
- Keep advanced download-server split-machine overrides under `deploy/server/`.
- Keep advanced library-agent split-machine overrides under `agent/deploy/`.
- Treat `db/state.sqlite` as runtime state only.
- Treat `db/state.sqlite` as the source of truth for subscriptions and download state.
- Do not add runtime compatibility for legacy `db/db.json` or `config/config.yaml` formats.
- Do not reintroduce the old `seasons` plus `manager` db shape.
- Do not expose qBittorrent ports unless the user asks for direct host access.
- Prefer service name `server` for the combined download-side app and `agent` for the library-side mover.
- Keep root npm scripts project-level and minimal: `build`, `dev`, and targeted helper scripts only.

## Important Files

- `src/server/config/app-config.ts`: server config loader and qBittorrent defaults.
- `src/server/config/env.ts`: dotenv loader for download-side server env.
- `agent/src/env.ts`: dotenv loader for library-side agent env.
- `agent/.env.example`: local library-agent env example.
- `src/web/`: React + TanStack Start web UI and web-side API proxy.
- `src/server/state/db.ts`: SQLite state store.
- `src/server/tasks/download-task.ts`: RSS polling and qB add logic.
- `src/server/`: download-side API, RSS refresh endpoint, download status, and move-job queue.
- `agent/src/agent.ts`: library-side mover that claims move jobs and writes files to `/library`.
- `src/server/move-job-sync.ts`: move-job sync and qB cleanup after successful agent reports.
- `src/server/files/file-transfer.ts`: qB bundled file-server URL creation and HTTP streaming.
- `src/server/qbittorrent/api.ts`: qBittorrent API wrapper.
- `src/server/mikan/`: Mikan search, RSS parsing, and episode parsing.
- `compose.yaml`: runtime services.
- `deploy/server/compose.yaml`: download-side split-machine services.
- `deploy/server/.env.example`: download-side split-machine env example.
- `agent/deploy/compose.yaml`: library-side split-machine agent.
- `agent/deploy/.env.example`: library-side split-machine env example.
- `deploy/README.md`: split-machine deployment guide.
- `docker/app.Dockerfile`: combined download-side server and web image.
- `docker/agent.Dockerfile`: library-side agent image.
- `docker/qbittorrent.Dockerfile`: custom qBittorrent plus internal download file server image.

## Current Config Shape

Subscriptions live in `db/state.sqlite`. `season` is optional in API payloads and defaults to `1`.

## Current DB Shape

`db/state.sqlite` should stay split into active work, move jobs, and completed history:

```json
{
  "active": {
    "<torrentHash>": {
      "torrent": "<torrentHash>",
      "number": 1,
      "enclosureUrl": "https://mikanani.me/Download/...",
      "title": "Example",
      "season": 1
    }
  },
  "moveJobs": {
    "<torrentHash>": {
      "status": "ready",
      "number": 1,
      "targetRelativePath": "Example/Season 01/01.mkv",
      "sourceRemotePath": "/downloads/example.mkv",
      "createdAt": "2026-05-28T00:00:00.000Z",
      "updatedAt": "2026-05-28T00:00:00.000Z",
      "attempts": 0
    }
  },
  "completed": {
    "<torrentHash>": {
      "title": "Example",
      "season": 1,
      "number": 1,
      "movedAt": "2026-05-28T00:00:00.000Z"
    }
  }
}
```

Active entries need enough metadata to create move jobs. Move jobs need enough metadata for an agent to copy files. Completed entries should stay compact and should not keep `enclosureUrl`.

## qB Cleanup Behavior

After an agent reports success, the server intentionally calls:

```ts
await api.removeTorrent(hash, true);
```

The `true` means qBittorrent deletes both the torrent task and downloaded source files. This call must stay after a successful copy/HTTP transfer.

## Verification

Run these after meaningful server, agent, web, Docker, config, or db changes:

```bash
npm run build
npm run build:web
npm --prefix agent run check
docker compose config
docker compose build qbittorrent server agent
```

If only root TypeScript changed, `npm run build` is the minimum.

If only web UI changed, `npm run build:web` is the minimum.

## Style

- Use `import type` for type-only imports in root TypeScript.
- Root TypeScript uses `module` and `moduleResolution` set to `NodeNext`.
- Keep Docker images on Node 24 unless the user asks otherwise.
- Keep Dockerfiles under `docker/` with `*.Dockerfile` names.
