import { exportSubmitTorrents, findTorrentByHash, loadSubmitTorrents } from "./download.js";
import { seasonParse } from "./season.js";
import { downloadEpisode } from "./episode.js";
import { moveSeason } from "./move.js";
import { config } from "./config.js";


async function main() {
    const torrents = loadSubmitTorrents()

    const seasons = await Promise.all(config.seasons.map(seasonParse))

    for (const season of seasons) {
        for (let episode of season.episodes) {
            if (torrents.includes(episode.torrentHash)) continue
            await downloadEpisode(episode)

            const torrent = await findTorrentByHash(episode.torrentHash)
            if (!torrent) continue

            torrents.push(torrent.torrentHash)
        }
    }
    exportSubmitTorrents(torrents)

    for (const season of seasons) {
        await moveSeason(season)
    }
}

main().catch(console.error)

