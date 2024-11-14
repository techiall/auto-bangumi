import { db, State } from "./db.js";
import { logger } from "./config/winston.js";
import { loadConfig } from "./config.js";
import { QBittorrentApi } from "./download.js";
import { SeasonParse } from "./season.js";


export async function downloadTask() {
    const config = loadConfig();
    const api = new QBittorrentApi(config.download);

    const seasons = await Promise.all(config.seasons.map(season => new SeasonParse(season).parse()))
    db.data.seasons = Array.from(new Set(seasons))
    await db.write()

    for (const season of seasons) {
        for (const episode of season.episodes) {
            const manager = db.data.manager.find(e => e.episode.torrent === episode.torrent)
            if (!manager) {
                logger.info(`Downloading ${season.title} S${season.number}E${episode.number}`)
                await api.download(episode)
                db.data.manager.push({episode, state: State.DOWNLOADING})
                await db.write()
            }
        }
    }
}

logger.info(`Starting download task`)
await downloadTask()
setInterval(downloadTask, 10 * 1000 * 60) // 10 minutes

