# Auto Bangumi

Auto Bangumi watches Mikan RSS subscriptions, adds new episodes to qBittorrent, and moves completed files into a local media library.

It includes a small web UI for managing Mikan subscriptions without editing `config/config.yaml` by hand.

## What It Does

- Searches Mikan bangumi and writes subscriptions to `config/config.yaml`.
- Polls subscribed RSS feeds and sends new torrents to qBittorrent.
- Reconciles completed qBittorrent tasks when the downloads page refreshes, with a background fallback watcher.
- Pulls completed files through qBittorrent's bundled internal file server instead of reading qBittorrent paths directly.
- Moves completed episodes to `library/<title>/Season NN/`.
- Removes the qBittorrent task and downloaded source file after a successful move.

## Services

`compose.yaml` defines three services:

- `web`: subscription management UI, exposed at `http://localhost:3000`.
- `backend`: HTTP API plus background RSS polling and completion watcher.
- `qbittorrent`: custom qBittorrent image with WebUI credentials and an internal read-only download file server.

The qBittorrent WebUI is not exposed by default. The backend talks to it over the Docker network.

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
```

`season` defaults to `1`, so first-season subscriptions can omit it.

Default qBittorrent settings are built into the app:

- qBittorrent: `qbittorrent:8080`
- qB download file server: `qbittorrent:8081`
- qB download path: `/downloads`
- qB credentials: `admin / adminadmin`
- tracker list URL: `https://cf.trackerslist.com/all.txt`
- seeding limits: ratio `1.0` or `60` minutes, then pause

The qBittorrent image writes the default WebUI credentials and global seeding limits into its `/config` volume on startup. After an episode has been moved to the library, paused completed torrents are removed from qBittorrent with their source files.

You can override qB tracker sources in `config/config.yaml`:

```yaml
qbittorrent:
  trackerUrls:
    - https://cf.trackerslist.com/all.txt
  trackers:
    - udp://tracker.example.com:6969/announce
```

## Run With Docker

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

The browser talks to the web service only. The web service forwards `/api/*` requests to the internal `backend` service.

The backend mounts `config/config.yaml`, `db/db.json`, and the media library. The media library is deployment config, not app config: compose mounts `${HOST_LIBRARY_ROOT:-E:/Bangumi}` to `/library`, and `LIBRARY_CONTAINER_ROOT=/library` tells the backend where to write from inside the container.

By default, compose mounts `${HOST_LIBRARY_ROOT:-E:/Bangumi}`. Override `HOST_LIBRARY_ROOT` if your host media folder is somewhere else:

```powershell
$env:HOST_LIBRARY_ROOT = 'D:/Media/Bangumi'
docker compose up -d --build
```

Docker writes through `/library`, but completed records show the host path from `HOST_LIBRARY_ROOT`. For local npm runs, set `HOST_LIBRARY_ROOT` to the folder you want to write to.

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

In Docker, `backend` starts a fallback move watcher automatically. The downloads page also triggers the same move reconciliation before returning progress, so completed items move promptly while the page is open. Override the fallback interval with `MOVE_INTERVAL_MS` if needed.

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
docker compose build qbittorrent backend web
```
