import { EpisodeParse } from './episode.js';
import type { Episode } from './episode.js';
import type { SubscriptionConfig } from '../config/app-config.js';
import Parser from 'rss-parser';
import type { Item } from 'rss-parser';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';

const rssParser = new Parser();

export interface Season {
  title: string;
  folder: string;
  number: number;
  subscriptionRss: string;
  episodes: Episode[];
}

export class SeasonParse {
  private readonly subscription: SubscriptionConfig;

  constructor(subscription: SubscriptionConfig) {
    this.subscription = subscription;
  }

  async parse() {
    const feed = await rssParser.parseString(await fetchWithRetry(this.subscription.rss).then((it) => it.text()));

    const episodes = await Promise.all(
      feed.items.filter((episode) => this.matchEpisode(episode)).map((episode) => new EpisodeParse(episode).parse()),
    );
    return {
      title: this.subscription.title,
      folder: this.subscription.folder,
      number: this.subscription.season,
      subscriptionRss: this.subscription.rss,
      episodes: episodes.filter((episode): episode is Episode => episode !== undefined),
    } as Season;
  }

  private matchEpisode(episode: Item): boolean {
    if (!this.subscription.filters?.length) return true;
    return this.subscription.filters.every((match) => (episode.title ?? '').includes(match));
  }
}
