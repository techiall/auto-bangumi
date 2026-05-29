# Auto Bangumi

Auto Bangumi watches Mikan RSS subscriptions, adds new episodes to qBittorrent, and coordinates moving completed files into a media library.

It includes a web UI for managing Mikan subscriptions without editing files by hand.

## Quick Start

Prerequisite: Docker Desktop or Docker Engine with Compose.

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

The default media library folder is `./library` from `.env.example`. Change `HOST_LIBRARY_ROOT` in `.env` when you want to write completed files somewhere else.

## What It Does

- Searches Mikan bangumi and stores subscriptions in SQLite.
- Polls subscribed RSS feeds and sends new torrents to qBittorrent.
- Streams download progress to the web UI over WebSocket, with HTTP kept as a fallback endpoint.
- Creates library transfer jobs when qBittorrent finishes an episode.
- Lets a separate library agent pull files through qBittorrent's bundled internal file server.
- Removes the qBittorrent task and downloaded source file after a successful move.

## Services

`compose.yaml` defines three services:

- `server`: combined web UI, HTTP API, RSS polling, qB coordination, and move-job queue.
- `agent`: library-side mover built from `docker/agent.Dockerfile`; it pulls ready files from the download server and writes them to `/library`.
- `qbittorrent`: custom qBittorrent image with WebUI credentials and an internal read-only download file server.

The qBittorrent WebUI is not exposed by default. The server talks to it over the Docker network.

## Security Defaults

- The default compose stack keeps `server`, `agent`, and qBittorrent on the same private Docker network.
- qBittorrent and its internal file server are intentionally not published to the host. Keep them private unless you put them behind your own trusted network boundary.
- The web UI only receives subscription data from `/api/config`; qBittorrent credentials stay server-side.

## Configuration

Subscriptions are stored in SQLite at `db/state.sqlite`.

`season` defaults to `1`, so first-season subscriptions can omit it.

Default qBittorrent connection settings are built in. Compose reads `.env` for the host library path:

```bash
cp .env.example .env
```

- qBittorrent: `qbittorrent:8080`
- qB download file server: `qbittorrent:8081`
- qB download path: `/downloads`
- tracker list URL: `https://cf.trackerslist.com/all.txt`

The qBittorrent image writes runtime defaults into its `/config` volume on startup. These values also come from env:

- WebUI credentials: `admin / adminadmin`
- active download limit: `20`
- seeding limits: ratio `3.0` or `60` minutes, then pause

After the agent reports a successful library move, the server removes the qBittorrent task and source files.

Tracker sources can be overridden with `QBITTORRENT_TRACKER_URLS` and `QBITTORRENT_TRACKERS`.

## Run With Docker

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

The browser talks to the combined `server` service on `http://localhost:3000`. Inside that container, TanStack Start forwards `/api/*` HTTP requests and `/api/downloads/ws` WebSocket traffic to the local coordinator on port `3001`.

The server mounts the `db/` runtime state directory. The agent mounts the media library only: compose mounts `${HOST_LIBRARY_ROOT}` to `/library`, and the agent writes completed files there.

By default, `.env.example` sets `HOST_LIBRARY_ROOT=./library`. Override it in `.env` if your host media folder is somewhere else:

```bash
HOST_LIBRARY_ROOT=D:/Media/Bangumi
docker compose up -d --build
```

## Run Locally

Install dependencies:

```bash
npm install
npm --prefix agent install
cp .env.example .env
```

Start the server and web UI for development:

```bash
npm run dev
```

Run the production server locally after building:

```bash
npm run build
node dist/server/server.js
```

Run a local library agent after building:

```bash
cd agent
export DOWNLOAD_SERVER_URL=http://localhost:3001
export LIBRARY_CONTAINER_ROOT=D:/Media/Bangumi
node dist/agent.js
```

In Docker, `server` starts RSS polling and move-job sync automatically. The downloads page receives progress over WebSocket, and each state refresh also asks the server to refresh move jobs so completed items become available to the agent promptly.

For split-machine deployment, see `deploy/split/README.md`.

Build everything:

```bash
npm run build
npm run build:web
npm --prefix agent run build
```

## State

Runtime state is stored in SQLite at `db/state.sqlite`.

The SQLite schema separates subscriptions, active downloads, move jobs, and completed history:

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
  "moveJobs": {
    "<torrentHash>": {
      "status": "ready",
      "number": 1,
      "targetRelativePath": "Example Show/Season 01/01.mkv",
      "sourceRemotePath": "/downloads/example.mkv",
      "createdAt": "2026-05-28T00:00:00.000Z",
      "updatedAt": "2026-05-28T00:00:00.000Z",
      "attempts": 0
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

`db/state.sqlite` is the source of truth for subscriptions, processing state, move-job state, and completed history.

## Verification

Useful checks before committing:

```bash
npm run build
npm run build:web
docker compose config
docker compose build qbittorrent server agent
```
