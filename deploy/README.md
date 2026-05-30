# Split-Machine Deployment

Chinese documentation: [README.zh-CN.md](README.zh-CN.md).

Use this when qBittorrent and the web UI should run on one machine, but completed files should be written on another machine that owns the media library.

Use the root `compose.yaml` for a normal single-machine image-based setup. Use this split deployment only when the download server and media library live on different machines. The compose files here pull published GHCR images and do not build from local source.

## Layout

- `deploy/server/`: download server machine. Runs qBittorrent plus the web/API server.
- `deploy/agent/`: library machine. Runs only the mover agent and mounts the host media folder at `/library`.
- `MOVER_API_TOKEN`: shared secret. Use the same value on both machines.

Only expose the server API on a trusted LAN or VPN. Do not publish qBittorrent or its internal file server.

## 1. Download Server Machine

```bash
cd deploy/server
cp .env.example .env
```

Edit `.env`:

```env
MOVER_API_TOKEN=<same-secret-on-both-machines>
SERVER_API_BIND=<private-lan-or-vpn-address>
```

Generate a token:

```bash
openssl rand -base64 32
```

Start:

```bash
docker compose up -d
```

Endpoints:

- Web UI: `http://localhost:3000`
- Agent API: `http://SERVER_API_BIND:3001`
- SQLite state: `deploy/server/db/state.sqlite`

If another machine must open the web UI, change the `3000` bind in `deploy/server/compose.yaml` from `127.0.0.1` to a trusted LAN/VPN address.

## 2. Library Agent Machine

```bash
cd deploy/agent
cp .env.example .env
```

Edit `.env`:

```env
MOVER_API_TOKEN=<same-secret-on-both-machines>
DOWNLOAD_SERVER_URL=http://<download-server-private-address>:3001
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
