import { Item } from "rss-parser";
import { apiClient } from "./download.js";

export interface Episode {
    torrentHash: string
    number: number
    torrentArray: Uint8Array
}

export async function episodeParse(episode: Item) {
    const title = episode.title;
    if (!title) return undefined

    const number = getEpisodeNumber(title)
    if (!number) return undefined

    const enclosureUrl = episode.enclosure?.url
    if (!enclosureUrl) return undefined

    return {
        torrentHash: getTorrentHash(enclosureUrl),
        number,
        torrentArray: await downloadTorrent(enclosureUrl)
    } as Episode
}

export async function downloadEpisode(episode: Episode) {
    try {
        await apiClient.getTorrent(episode.torrentHash)
    } catch (e) {
        if ((e as Error).message === 'Torrent not found') {
            console.log(`Downloading episode ${episode.torrentHash}`)
            await apiClient.addTorrent(episode.torrentArray)
        }
    }
    console.log(`Episode ${episode.torrentHash} already downloaded`)
}


async function downloadTorrent(torrentUrl: string) {
    const buffer = await fetch(torrentUrl).then(response => response.arrayBuffer())
    return new Uint8Array(buffer)
}

const episodeNumberRegex = /\[(\d{2})\\]|\b(\d{2})\b/

function getEpisodeNumber(title: string) {
    return Number(title.match(episodeNumberRegex)?.[0]) ?? undefined
}

function getTorrentHash(torrentUrl: string) {
    return torrentUrl.split("/").pop()?.split(".")[0]
}
