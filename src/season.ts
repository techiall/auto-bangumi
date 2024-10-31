import { Episode, episodeParse } from "./episode.js";
import { SeasonConfig } from "./config.js";
import Parser from "rss-parser";

export interface Season {
    title: string
    alias: string[]
    number: number
    episodes: Episode[]
}

export async function seasonParse(season: SeasonConfig) {
    const parser = new Parser();
    let feed = await parser.parseURL(season.rss);

    const episodes = await Promise.all(
        feed.items
            .filter(episode => matchEpisode(episode.title ?? "", season))
            .map(episodeParse)
    )
    return {
        title: season.title,
        alias: season.alias,
        number: season.seasonNumber,
        episodes
    } as Season
}

/**
 * Check if the title matches the tv show
 */
function matchEpisode(title: string, season: SeasonConfig): boolean {
    if (!season.match || !season.match.title) return true
    return !season.match.title.every(match => title.includes(match))
}
