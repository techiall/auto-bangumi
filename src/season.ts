import { Episode, EpisodeParse } from "./episode.js";
import { SeasonConfig } from "./config.js";
import Parser from "rss-parser";
import { fetchWithRetry } from "./retry.js";

export interface Season {
    title: string
    alias: string[]
    number: number
    episodes: Episode[]
}

export class SeasonParse {
    private readonly season: SeasonConfig

    constructor(season: SeasonConfig) {
        this.season = season
    }

    async parse() {
        const rssParser = new Parser();
        let feed = await rssParser.parseString(await fetchWithRetry(this.season.rss).then(it => it.text()));

        const episodes = await Promise.all(
            feed.items
                .filter(episode => this.matchEpisode(episode.title ?? ""))
                .map(episode => new EpisodeParse(episode).parse())
        )
        return {
            title: this.season.title,
            alias: this.season.alias,
            number: this.season.seasonNumber,
            episodes: episodes.filter(episode => episode !== undefined) as Episode[]
        } as Season
    }

    private matchEpisode(title: string): boolean {
        if (!this.season.match || !this.season.match.title) return true
        return this.season.match.title.every(match => title.includes(match))
    }
}

