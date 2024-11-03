import { QBittorrent } from "@ctrl/qbittorrent";
import { DownloadConfig } from "./config.js";
import { TorrentState } from "@ctrl/shared-torrent";
import * as fs from "node:fs";
import { Episode } from "./episode.js";
import { fetchWithRetry } from "./retry.js";
import { logger } from "./config/winston.js";

export interface QBittorrentTorrent {
    torrentHash: string
    state: TorrentState
    downloadPath: string

    canMove(): boolean
}

export class QBittorrentApi {
    private readonly client: QBittorrent

    constructor(config: DownloadConfig) {
        this.client = this.createApiClient(config)
    }

    private createApiClient(config: DownloadConfig) {
        const client =  new QBittorrent({
            baseUrl: `${config.qBittorrent.ssl ? "https" : "http"}://${config.qBittorrent.host}:${config.qBittorrent.port}`,
            username: config.qBittorrent.username,
            password: config.qBittorrent.password
        })
        client.getApiVersion().then(version => {
            logger.info(`Connected to qBittorrent ${version}`)
        })
        return client
    }

    async findByTorrent(hash: string) {
        try {
            const torrent = await this.client.getTorrent(hash)
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

    getTorrent(hash: string) {
        return this.client.getTorrent(hash)
    }

    private async fetchEnclosure(torrentUrl: string) {
        const buffer = await fetchWithRetry(torrentUrl).then(response => response.arrayBuffer())
        return new Uint8Array(buffer)
    }

    async download(episode: Episode) {
        try {
            await this.client.getTorrent(episode.torrent)
        } catch (e) {
            if ((e as Error).message === 'Torrent not found') {
                await this.client.addTorrent(await this.fetchEnclosure(episode.enclosureUrl))
            }
        }
        logger.warn(`Episode ${episode.numberDisplayString()} already downloaded`)
    }
}

export class TorrentManager {
    torrents: string[]
    private readonly configPath: string

    constructor(configPath: string | undefined = "torrents.json") {
        this.torrents = this.load(configPath)
        this.configPath = configPath
    }

    private load(configPath: string) {
        return JSON.parse(fs.readFileSync(configPath, "utf-8")) as string[]
    }

    push(torrent: string) {
        this.torrents.push(torrent)
    }

    export() {
        fs.writeFileSync(this.configPath, JSON.stringify(Array.from(new Set(this.torrents)), null, 2))
    }
}


