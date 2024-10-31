import { Season } from "./season.js";
import { Episode } from "./episode.js";
import { apiClient, findTorrentByHash } from "./download.js";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";

export async function moveSeason(season: Season) {
    for (const episode of season.episodes) {
        await moveEpisode(episode, season);
    }
}

async function moveEpisode(episode: Episode, season: Season) {
    const torrent = await findTorrentByHash(episode.torrentHash)
    if (!torrent) return

    if (!torrent.canMove()) return

    const target = path.join(config.move.root, season.title, `Season ${season.number}`)
    fs.mkdirSync(target, {recursive: true})

    const src = await apiClient.getTorrent(episode.torrentHash).then(torrent => torrent.raw.content_path)
    const extname = path.extname(src)

    fs.copyFileSync(src, path.join(target, `${episode.number}${extname}`), fs.constants.COPYFILE_FICLONE)
}
