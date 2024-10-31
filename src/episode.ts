import { Item } from "rss-parser";

export interface Episode {
    torrent: string
    number: number
    enclosureUrl: string
}

export class EpisodeParse {
    private readonly episode: Item

    constructor(episode: Item) {
        this.episode = episode
    }

    async parse() {
        const title = this.episode.title;
        if (!title) return undefined

        const number = this.getEpisodeNumber(title)
        if (!number) return undefined

        const enclosureUrl = this.episode.enclosure?.url
        if (!enclosureUrl) return undefined

        return {
            torrent: this.getTorrentHash(enclosureUrl),
            number,
            enclosureUrl
        } as Episode
    }

    private episodeNumberRegex = /\[(\d{2})\\]|\b(\d{2})\b/

    private getEpisodeNumber(title: string) {
        return Number(title.match(this.episodeNumberRegex)?.[0]) ?? undefined
    }

    private getTorrentHash(torrentUrl: string) {
        return torrentUrl.split("/").pop()?.split(".")[0]
    }
}


