# Agent Notes

This repository has two main parts:

- Root TypeScript worker code in `src/`.
- React + TanStack Start web UI in `frontend/`.

## Project Rules

- Keep `config/config.yaml` user-facing and small.
- Do not write qBittorrent defaults back into `config/config.yaml` unless the user explicitly wants custom qB settings.
- Treat `config/config.yaml` as subscription and library configuration.
- Treat `db/db.json` as runtime state only.
- Do not reintroduce the old `seasons` plus `manager` db shape.
- Do not expose qBittorrent ports unless the user asks for direct host access.
- Prefer service name `worker` for the background job. Avoid renaming it back to `download`.
- Keep root npm scripts project-level and minimal: `build`, `dev`, and targeted helper scripts only.

## Important Files

- `src/config/app-config.ts`: root worker config loader, defaults, and compact config writer.
- `frontend/src/server/config.ts`: frontend server-side config loader and compact config writer.
- `src/state/db.ts`: lowdb schema and legacy db migration.
- `src/tasks/download-task.ts`: RSS polling and qB add logic.
- `src/tasks/move-task.ts`: completed episode transfer, library move, and qB cleanup.
- `src/files/file-transfer.ts`: qB bundled file-server URL creation and HTTP streaming.
- `src/qbittorrent/api.ts`: qBittorrent API wrapper.
- `src/mikan/`: Mikan search, RSS parsing, and episode parsing.
- `compose.yaml`: runtime services.
- `docker/backend.Dockerfile`: backend API and background worker image.
- `docker/qbittorrent.Dockerfile`: custom qBittorrent plus internal download file server image.
- `docker/web.Dockerfile`: web UI image.

## Current Config Shape

`config/config.yaml` should stay close to:

```yaml
subscriptions:
  - title: Example
    rss: https://mikanani.me/RSS/Bangumi?bangumiId=1234&subgroupid=567
    filters:
      - 1080p

library: E:\Bangumi
```

`season` is optional and defaults to `1`.

## Current DB Shape

`db/db.json` should stay split into active work and completed history:

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

Active entries need enough metadata to move files. Completed entries should stay compact and should not keep `enclosureUrl`.

## qB Cleanup Behavior

`src/tasks/move-task.ts` intentionally calls:

```ts
await this.api.removeTorrent(episode.torrent, true);
```

The `true` means qBittorrent deletes both the torrent task and downloaded source files. This call must stay after a successful copy/HTTP transfer.

## Verification

Run these after meaningful backend, frontend, Docker, config, or db changes:

```bash
npm run build
npm --prefix frontend run build
docker compose config
docker compose build qbittorrent backend web
```

If only root TypeScript changed, `npm run build` is the minimum.

If only frontend changed, `npm --prefix frontend run build` is the minimum.

## Style

- Use `import type` for type-only imports in root TypeScript.
- Root TypeScript uses `module` and `moduleResolution` set to `NodeNext`.
- Keep Docker images on Node 24 unless the user asks otherwise.
- Keep Dockerfiles under `docker/` with `*.Dockerfile` names.
