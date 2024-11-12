import { loadConfig } from "./config.js";
import { SeasonParse } from "./season.js";
import { QBittorrentApi, TorrentManager } from "./download.js";
import { moveTask } from "./move.js";
import { logger } from "./config/winston.js";


async function main() {
    const manager = new TorrentManager()
    const config = loadConfig();
    const api = new QBittorrentApi(config.download);

    const seasons = await Promise.all(
        config.seasons.map(season => new SeasonParse(season).parse())
    )

    for (const season of seasons) {
        for (let episode of season.episodes) {
            if (manager.torrents.includes(episode.torrent)) {
                logger.warn(`${season.displayString()}E${episode.numberDisplayString()}(${episode.torrent}) already downloaded`)
                continue
            }
            await api.download(episode)
            logger.info(`Downloaded ${season.displayString()}E${episode.numberDisplayString()} from ${episode.torrent}`)

            const torrent = await api.findByTorrent(episode.torrent)
            if (!torrent) continue

            manager.push(torrent.torrentHash)
        }
    }
    manager.export()

    await moveTask()
}

main().catch(logger.error)


setInterval(moveTask, 10 * 1000 * 60) // 10 minutes

