import { QBittorrent } from "@ctrl/qbittorrent";
import { config, DownloadConfig } from "./config.js";
import { TorrentState } from "@ctrl/shared-torrent";
import * as fs from "node:fs";

export const apiClient = await createApiClient(config.download);

export interface QBittorrentTorrent {
    torrentHash: string
    state: TorrentState
    downloadPath: string

    canMove(): boolean
}

async function createApiClient(config: DownloadConfig) {
    const client = new QBittorrent({
        baseUrl: `${config.qbittorrent.ssl ? "https" : "http"}://${config.qbittorrent.host}:${config.qbittorrent.port}`,
        username: config.qbittorrent.username,
        password: config.qbittorrent.password
    })
    const apiVersion = await client.getApiVersion()
    console.log(`Connected to qBittorrent Web API v${apiVersion}`)
    return client
}

export async function findTorrentByHash(hash: string) {
    try {
        const torrent = await apiClient.getTorrent(hash)
        return {
            torrentHash: hash,
            state: torrent.state,
            downloadPath: torrent.raw.content_path,
            canMove(): boolean {
                return this.state === TorrentState.seeding || this.state === TorrentState.unknown
            }
        } as QBittorrentTorrent
    } catch (e) {
        if ((e as Error).message == "Torrent not found") return undefined

        throw e
    }
}

export function loadSubmitTorrents() {
    return JSON.parse(fs.readFileSync("torrents.json", "utf-8")) as string[]
}

export function exportSubmitTorrents(torrents: string[]) {
    fs.writeFileSync("torrents.json", JSON.stringify(Array.from(new Set(torrents)), null, 2))
}
