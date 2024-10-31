import { Season } from "./season.js";
import { Episode } from "./episode.js";
import { QBittorrentApi } from "./download.js";
import path from "node:path";
import fs from "node:fs";
import { Config } from "./config.js";

export class Move {
    private readonly config: Config
    private readonly api: QBittorrentApi
    private readonly season: Season

    constructor(config: Config, api: QBittorrentApi, season: Season) {
        this.config = config;
        this.api = api;
        this.season = season;
    }


    async move() {
        for (const episode of this.season.episodes) {
            await this.moveEpisode(episode);
        }
    }

    private async moveEpisode(episode: Episode) {
        const torrent = await this.api.findByTorrent(episode.torrent);
        if (!torrent) return;

        if (!torrent.canMove()) return;


        const target = path.join(this.config.move.root, this.season.title, `Season ${this.season.number}`);
        fs.mkdirSync(target, {recursive: true});

        const src = await this.api.getTorrent(episode.torrent).then(torrent => torrent.raw.content_path);
        const extname = path.extname(src);
        const targetPath = path.join(target, `${episode.number}${extname}`);

        console.log(`Will move ${torrent.downloadPath} to ${targetPath}`);

        fs.copyFileSync(src, targetPath, fs.constants.COPYFILE_FICLONE);
    }


}
