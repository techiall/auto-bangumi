import path from "node:path"
import * as fs from "node:fs"
import jsyaml from "js-yaml"

export const config = loadConfig();

function loadConfig(): Config {
    const configPath = path.join('config/config.yaml')
    return jsyaml.load(fs.readFileSync(configPath, 'utf-8')) as Config
}

export interface Config {
    seasons: SeasonConfig[],
    download: DownloadConfig
    move: MoveConfig
}

export interface SeasonConfig {
    rss: string,
    title: string,
    alias: string[]
    seasonNumber: number
    match: SeasonMatchConfig | undefined
}

export interface SeasonMatchConfig {
    title: string[] | undefined
}

export interface DownloadConfig {
    path: string
    qbittorrent: QbittorrentConfig
}

export interface QbittorrentConfig {
    host: string
    port: number
    username: string
    password: string
    ssl: boolean
}

export interface MoveConfig {
    root: string
}
