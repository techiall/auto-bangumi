# 分机器部署

这个部署方式适合把下载和入库拆开：下载节点运行 qBittorrent 和 Web/API 服务，媒体库节点只运行 Agent，并把文件写入本机媒体库目录。

如果所有服务都在同一台机器上，优先使用根目录的 `compose.yaml`。这里的分机器部署只适合下载节点和媒体库节点不在同一台机器的场景。`deploy/` 下的 compose 文件会直接拉取已发布的 GHCR 镜像，不依赖本地源码构建。

## 目录说明

- `deploy/server/`：下载节点，运行 qBittorrent 和 Web/API 服务。
- `deploy/agent/`：媒体库节点，运行入库 Agent，并把宿主机媒体库目录挂载到容器内的 `/library`。
- `SERVER_USERNAME` 和 `SERVER_PASSWORD`：Web UI 和远程 Agent 共用的 Basic Auth 登录凭据。

只在可信的 LAN 或 VPN 内开放 Web/API 入口。不要把 qBittorrent 或它的内部文件服务直接暴露到公网。

## 1. 配置下载节点

```bash
cd deploy/server
cp .env.example .env
```

编辑 `.env`：

```env
SERVER_USERNAME=admin
SERVER_PASSWORD=<两端使用同一个密码>
```

可以用下面的命令生成一个随机密码：

```bash
openssl rand -base64 32
```

启动下载节点：

```bash
docker compose up -d
```

默认地址：

- Web UI：`http://localhost:3000`
- Agent API：复用 `http://<下载节点地址>:3000`，路径是 `/api/mover/*`
- SQLite 状态文件：`deploy/server/db/state.sqlite`

## 2. 配置媒体库节点

```bash
cd deploy/agent
cp .env.example .env
```

编辑 `.env`：

```env
SERVER_USERNAME=admin
SERVER_PASSWORD=<两端使用同一个密码>
DOWNLOAD_SERVER_URL=http://<下载节点地址>:3000
HOST_LIBRARY_ROOT=/media/Bangumi
```

启动媒体库节点：

```bash
docker compose up -d
```

查看日志：

```bash
docker compose logs -f agent
```

Agent 会向下载节点领取可迁移任务，从下载节点拉取已完成文件，并写入 `HOST_LIBRARY_ROOT` 对应的宿主机目录。容器内固定路径是 `/library`。Agent 回报成功后，下载节点会尝试通过 qBittorrent API 删除对应的任务和下载源文件。
