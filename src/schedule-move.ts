import { loadConfig } from "./config.js";
import { SeasonParse } from "./season.js";
import { Move } from "./move.js";
import { QBittorrentApi } from "./download.js";

async function move() {
    const config = loadConfig();

    const api = new QBittorrentApi(config.download);

    const seasons = await Promise.all(
        config.seasons.map(season => new SeasonParse(season).parse())
    );

    for (const season of seasons) {
        await new Move(config, api, season).move()
    }
}

// setTimeout(move, 10 * 1000 * 60) // 10 minutes

move().catch(console.error)
