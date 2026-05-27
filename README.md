# Auto Bangumi

Auto Bangumi watches Mikan RSS subscriptions, adds new episodes to qBittorrent, and moves completed files into a local media library.

It includes a small web UI for managing Mikan subscriptions without editing `config/config.yaml` by hand.

## What It Does

- Searches Mikan bangumi and writes subscriptions to `config/config.yaml`.
- Polls subscribed RSS feeds and sends new torrents to qBittorrent.
- Pulls completed files through an internal file-export service instead of reading qBittorrent paths directly.
- Moves completed episodes to `library/<title>/Season NN/`.
- Removes the qBittorrent task and downloaded source file after a successful move.

## Services

`compose.yaml` defines four services:

- `web`: subscription management UI, exposed at `http://localhost:3000`.
- `worker`: background RSS polling and move task.
- `qbittorrent`: bundled qBittorrent instance.
- `file-export`: internal nginx file server used by `worker` to read qBittorrent downloads.

The qBittorrent WebUI is not exposed by default. The worker talks to it over the Docker network.

## Configuration

Main config lives at `config/config.yaml`.

```yaml
subscriptions:
  - title: Example Show
    rss: https://mikanani.me/RSS/Bangumi?bangumiId=1234&subgroupid=567
  - title: Example Show Season 2
    season: 2
    rss: https://mikanani.me/RSS/Bangumi?bangumiId=1235&subgroupid=567
    filters:
      - 1080p

library: E:\Bangumi
```

`season` defaults to `1`, so first-season subscriptions can omit it.

Default qBittorrent and file-export settings are built into the app:

- qBittorrent: `qbittorrent:8080`
- file export: `file-export:80`
- qB download path: `/downloads`
- qB credentials: `admin / adminadmin`

qBittorrent's initial config is stored in `config/qbittorrent/qBittorrent/qBittorrent.conf`.

## Run With Docker

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

The media library path in `config/config.yaml` must be valid from the `worker` container's point of view. On Docker Desktop with Windows bind paths, adjust the compose volume mapping if you want the worker to write directly to a host directory.

## Run Locally

Install dependencies:

```bash
npm install
npm --prefix frontend install
```

Start the web UI for development:

```bash
npm run dev
```

Run the move task once:

```bash
npm run build
node dist/tasks/move-once.js
```

Build everything:

```bash
npm run build
npm --prefix frontend run build
```

## State

Runtime state is stored in `db/db.json`.

It separates active downloads from completed history:

```json
{
  "active": {
    "<torrentHash>": {
      "torrent": "<torrentHash>",
      "number": 1,
      "enclosureUrl": "https://mikanani.me/Download/...",
      "title": "Example Show",
      "season": 1
    }
  },
  "completed": {
    "<torrentHash>": {
      "title": "Example Show",
      "season": 1,
      "number": 1,
      "movedAt": "2026-05-28T00:00:00.000Z"
    }
  }
}
```

`config/config.yaml` is the source of truth for subscriptions. `db/db.json` is only processing state and a completed-torrent ledger.

## Verification

Useful checks before committing:

```bash
npm run build
npm --prefix frontend run build
docker compose config
docker compose build worker web
```
