# 分机器部署

当下载机运行 qBittorrent 和 Web UI，但最终媒体库在 NAS 或另一台机器上时，使用这个部署方式。Agent 运行在媒体库机器上，从下载节点拉取完成文件，并写入本机媒体库目录。

单机部署优先使用根目录 `compose.yaml`。

## 目录

- `deploy/server/`：下载机，运行 qBittorrent 和 Web/API server。
- `deploy/agent/`：媒体库机器，只运行 mover agent。
- `SERVER_USERNAME` 和 `SERVER_PASSWORD` 都可以自定义，但两端必须一致。

Web/API 只建议暴露在可信 LAN 或 VPN 内。不要暴露 qBittorrent 或内部文件服务。

## 下载机

```bash
cd deploy/server
cp .env.example .env
```

编辑 `.env`：

```env
SERVER_USERNAME=<两端共用用户名>
SERVER_PASSWORD=<两端共用密码>
```

启动：

```bash
docker compose up -d
```

Web UI 和 Agent API 都使用 `http://<下载机地址>:3000`。

## 媒体库机器

```bash
cd deploy/agent
cp .env.example .env
```

编辑 `.env`：

```env
SERVER_USERNAME=<两端共用用户名>
SERVER_PASSWORD=<两端共用密码>
DOWNLOAD_SERVER_URL=http://<下载机地址>:3000
HOST_LIBRARY_ROOT=/media/Bangumi
```

启动：

```bash
docker compose up -d
docker compose logs -f agent
```

文件入库后，qBittorrent 会继续做种；达到分享率或做种时间限制并停止后，下载节点再删除 qBittorrent 任务和源文件。
