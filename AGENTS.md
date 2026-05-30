# Agent Notes

## Shape

- Download-side code lives in `src/server/` and `src/web/`.
- Library-side mover code lives in `agent/`.
- Runtime state lives in `db/state.sqlite`.
- Root `compose.yaml` is the image-based single-machine deployment.
- Split-machine deployment lives in `deploy/server/` and `deploy/agent/`.

## Rules

- Image-based single-machine startup should be `cp .env.example .env` then `docker compose up -d`.
- `.env.example` and `agent/.env.example` must be safe to copy directly for local use.
- `db/state.sqlite` is the only source of truth for subscriptions and download state.
- Do not add compatibility for legacy `db/db.json` or `config/config.yaml`.
- Do not reintroduce the old `seasons` plus `manager` database shape.
- Do not expose qBittorrent ports unless explicitly requested.
- Do not expose qBittorrent credentials or `MOVER_API_TOKEN` to the browser.
- Keep root npm scripts minimal: `build`, `dev`, `check`, and targeted helpers only.
- Keep Dockerfiles under `docker/` with `*.Dockerfile` names.
- Keep Docker images on Node 26 unless explicitly changed.

## Key Files

- `src/server/config/app-config.ts`: server config and qBittorrent defaults.
- `src/server/state/db.ts`: SQLite state store.
- `src/server/tasks/download-task.ts`: RSS polling and qB add logic.
- `src/server/move-job-sync.ts`: move-job sync and qB cleanup.
- `src/server/qbittorrent/api.ts`: qBittorrent API wrapper.
- `src/server/mikan/`: Mikan search, RSS parsing, and episode parsing.
- `src/web/`: React + TanStack Start web UI.
- `agent/src/agent.ts`: library mover loop.
- `agent/src/env.ts`: agent env loader.
- `docker/app.Dockerfile`: combined server and web image.
- `docker/agent.Dockerfile`: mover agent image.
- `docker/qbittorrent.Dockerfile`: qBittorrent plus internal file-server image.

## Behavior To Preserve

- `season` is optional in API payloads and defaults to `1`.
- Active downloads keep enough metadata to create move jobs.
- Move jobs keep enough metadata for the agent to copy files.
- Completed history stays compact and must not keep `enclosureUrl`.
- After a successful agent copy, the server must call `removeTorrent(hash, true)` so qBittorrent deletes both the task and source file.

## Verification

Run the relevant checks after meaningful changes:

```bash
npm run check
docker compose config
docker compose build qbittorrent server agent
```

For root TypeScript-only changes, `npm run build` is enough. For web-only changes, `npm run build:web` is enough.

Use `import type` for type-only imports in root TypeScript. Root TypeScript uses `NodeNext` module settings.
