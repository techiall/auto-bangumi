import { Episode, EpisodeParse } from "./episode.js";
import { SeasonConfig } from "./config.js";
import Parser from "rss-parser";
import { fetchWithRetry } from "./retry.js";

export interface Season {
    title: string
    alias: string[]
    number: number
    episodes: Episode[]

    displayString(): string
    numberDisplayString(): string
}

export const createSeason = (
    title: string,
    alias: string[],
    number: number,
    episodes: Episode[]
): Season => ({
    title,
    alias,
    number,
    episodes,
    displayString() {
        return `${this.title}(${this.alias}) S${String(this.number).padStart(2, '0')}`
    },
    numberDisplayString(): string {
        return String(this.number).padStart(2, '0')
    }
});

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
        return createSeason(
            this.season.title,
            this.season.alias,
            this.season.seasonNumber,
            episodes.filter(episode => episode !== undefined) as Episode[]
        )
    }

    private matchEpisode(title: string): boolean {
        if (!this.season.match || !this.season.match.title) return true
        return this.season.match.title.every(match => title.includes(match))
    }
}

