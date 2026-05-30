# Library Agent Deployment

Use this on the machine that owns the final media library folder.

The agent does not need access to qBittorrent or its download volume. It only talks to the download server API, claims ready move jobs, downloads the completed file through the server, and writes it into `/library` inside the container.

## Configure

```bash
cd agent/deploy
cp .env.example .env
```

Edit `.env`:

```env
MOVER_API_TOKEN=DbDB3qugLcPaaT6prcmavVPy8eQkUxGmN46a3mrzotM
DOWNLOAD_SERVER_URL=http://download-server:3001
HOST_LIBRARY_ROOT=/media/Bangumi
```

- `MOVER_API_TOKEN` must match the token on the download server.
- `DOWNLOAD_SERVER_URL` must point to the download server API from this machine.
- `HOST_LIBRARY_ROOT` is the host folder mounted into the agent container as `/library`.

## Start

```bash
docker compose up -d --build
```

The container path is intentionally fixed to `/library`; only the host-side folder changes.

## Check Logs

```bash
docker compose logs -f agent
```

Successful moves are reported back to the download server. After that, the download server removes the qBittorrent task and source file.
