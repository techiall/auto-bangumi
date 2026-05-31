import type { Item } from 'rss-parser';
import type { Episode } from './types.js';

export class EpisodeParse {
  private readonly episode: Item;

  constructor(episode: Item) {
    this.episode = episode;
  }

  async parse(): Promise<Episode | undefined> {
    const title = this.episode.title;
    if (!title) return undefined;

    const number = this.parseEpisodeNumber(title);
    if (!number) return undefined;

    const enclosureUrl = this.episode.enclosure?.url;
    if (!enclosureUrl) return undefined;

    const torrent = this.getTorrentHash(enclosureUrl);
    if (!torrent) return undefined;

    return {
      torrent,
      number,
      enclosureUrl,
    };
  }

  private parseEpisodeNumber(title: string) {
    const seasonEpisode = title.match(/\bS\d{1,2}E(\d{1,3})\b/i);
    if (seasonEpisode?.[1]) return Number(seasonEpisode[1]);

    const dashEpisode = title.match(/\s[-–—]\s*(\d{1,3})(?!\.\d)(?=\s*(?:\[|$))/u);
    if (dashEpisode?.[1]) return Number(dashEpisode[1]);

    const bracketTokens = [...title.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]?.trim() ?? '');
    if (bracketTokens.some((token) => /^\d{1,3}\s*-\s*\d{1,3}$/.test(token))) return undefined;

    const bracketEpisode = bracketTokens.find((token) => /^\d{1,3}$/.test(token));
    if (bracketEpisode) return Number(bracketEpisode);

    return undefined;
  }

  private getTorrentHash(torrentUrl: string) {
    return torrentUrl.split('/').pop()?.split('.')[0];
  }
}
