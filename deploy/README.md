# Split-Machine Deployment

Chinese documentation: [README.zh-CN.md](README.zh-CN.md).

Use this when qBittorrent and the web UI should run on one machine, but completed files should be written on another machine that owns the media library.

Use the root `compose.yaml` for a normal single-machine image-based setup. Use this split deployment only when the download server and media library live on different machines. The compose files here pull published GHCR images and do not build from local source.

## Layout

- `deploy/server/`: download server machine. Runs qBittorrent plus the web/API server.
- `deploy/agent/`: library machine. Runs only the mover agent and mounts the host media folder at `/library`.
- `SERVER_USERNAME` and `SERVER_PASSWORD`: Basic Auth credentials shared by the web UI and remote agent.

Only expose the web/API endpoint on a trusted LAN or VPN. Do not publish qBittorrent or its internal file server.

## 1. Download Server Machine

```bash
cd deploy/server
cp .env.example .env
```

Edit `.env`:

```env
SERVER_USERNAME=admin
SERVER_PASSWORD=<same-password-on-both-machines>
```

Generate a password:

```bash
openssl rand -base64 32
```

Start:

```bash
docker compose up -d
```

Endpoints:

- Web UI: `http://localhost:3000`
- Agent API: same `http://<download-server>:3000` endpoint, under `/api/mover/*`
- SQLite state: `deploy/server/db/state.sqlite`

## 2. Library Agent Machine

```bash
cd deploy/agent
cp .env.example .env
```

Edit `.env`:

```env
SERVER_USERNAME=admin
SERVER_PASSWORD=<same-password-on-both-machines>
DOWNLOAD_SERVER_URL=http://<download-server-private-address>:3000
HOST_LIBRARY_ROOT=/media/Bangumi
```

Start:

```bash
docker compose up -d
```

Check logs:

```bash
docker compose logs -f agent
```

The agent claims ready move jobs from the download server, pulls completed files through the server, writes them into the host folder configured by `HOST_LIBRARY_ROOT`, and reports success. Inside the container that folder is mounted at `/library`. After success, the download server attempts to remove the qBittorrent task and source file.
