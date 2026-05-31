# Split-Machine Deployment

Chinese documentation: [README.zh-CN.md](README.zh-CN.md).

Use this when the download box runs qBittorrent and the web UI, but the final media library lives on another machine such as a NAS. The agent runs on the library machine, pulls completed files from the download server, and writes them locally.

Use the root `compose.yaml` for single-machine deployments.

## Layout

- `deploy/server/`: download machine. Runs qBittorrent and the web/API server.
- `deploy/agent/`: library machine. Runs only the mover agent.
- `SERVER_USERNAME` and `SERVER_PASSWORD` can be any values, but they must match on both machines.

Expose the web/API server only on a trusted LAN or VPN. Do not expose qBittorrent or its internal file server.

## Download Machine

```bash
cd deploy/server
cp .env.example .env
```

Edit `.env`:

```env
SERVER_USERNAME=<shared-username>
SERVER_PASSWORD=<shared-password>
```

Start:

```bash
docker compose up -d
```

The web UI and agent API are both served from `http://<download-machine>:3000`.

## Library Machine

```bash
cd deploy/agent
cp .env.example .env
```

Edit `.env`:

```env
SERVER_USERNAME=<shared-username>
SERVER_PASSWORD=<shared-password>
DOWNLOAD_SERVER_URL=http://<download-machine>:3000
HOST_LIBRARY_ROOT=/media/Bangumi
```

Start:

```bash
docker compose up -d
docker compose logs -f agent
```

After a file is moved, qBittorrent keeps seeding until the configured ratio or time limit is reached. The download server then removes the qBittorrent task and source file.
