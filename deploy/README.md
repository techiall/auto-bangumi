# Split-Machine Deployment

Use this when downloads run on one machine and the media library lives on another.

Do this only on a trusted LAN or VPN. Do not publish qBittorrent or the internal file server directly to the internet. Both machines need a full checkout of this repository because the compose files build from the project root.

## Download Server

The download server runs qBittorrent and the combined server/web app. qBittorrent uses the project defaults from the custom image.

```bash
cd deploy/server
cp .env.example .env
```

Edit `.env`:

```env
MOVER_API_TOKEN=z2HRn3D4ZvcmK27VJ32qAT8M1PV7VMSbOow7OpuKqV4
SERVER_API_BIND=127.0.0.1
```

Generate one token and use the exact same value on both machines. For example:

```bash
openssl rand -base64 32
```

Use a private LAN or VPN address for `SERVER_API_BIND` when the library agent runs on another machine. Point the agent's `DOWNLOAD_SERVER_URL` at that same address and host port.

Start it:

```bash
docker compose up -d --build
```

The web UI listens on `http://localhost:3000`. The mover API listens on `SERVER_API_BIND:3001`.

The split download server stores its SQLite state in `deploy/server/db/`, separate from the root single-machine `db/` folder.

If you want to open the web UI from another machine, change the `3000` port binding in `deploy/server/compose.yaml` from `127.0.0.1:3000:3000` to a private LAN/VPN address.

## Library Agent

The library agent runs near the media library and pulls completed files from the download server.

```bash
cd agent/deploy
cp .env.example .env
```

Edit `.env`:

```env
MOVER_API_TOKEN=z2HRn3D4ZvcmK27VJ32qAT8M1PV7VMSbOow7OpuKqV4
DOWNLOAD_SERVER_URL=http://download-server:3001
HOST_LIBRARY_ROOT=/media/Bangumi
```

Use the same `MOVER_API_TOKEN` from the download server. The split-machine containers reject empty or placeholder token values.

Start it:

```bash
docker compose up -d --build
```

Keep qBittorrent and the internal file server private. Only publish the server API through a trusted network boundary.
