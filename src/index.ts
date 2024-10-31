import { loadConfig } from "./config.js";
import { SeasonParse } from "./season.js";
import { QBittorrentApi, TorrentManager } from "./download.js";


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
                console.warn(`Season ${season.title}(${season.alias}) ${episode.number} already downloaded`)
                continue
            }
            await api.download(episode)
            console.log(`Downloaded ${season.title}(${season.alias}) ${episode.number} from ${episode.torrent}`)

            const torrent = await api.findByTorrent(episode.torrent)
            if (!torrent) continue

            manager.push(torrent.torrentHash)
        }
    }
    manager.export()
}

main().catch(console.error)

