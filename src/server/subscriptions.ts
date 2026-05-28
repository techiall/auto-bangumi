import { loadConfig, saveConfig } from '../config/app-config.js';
import type { Config } from '../config/app-config.js';
import { HttpError } from './http-error.js';
import {
  parseSeasonPayload,
  parseSeasonUpdatePayload,
  type SeasonPayload,
  type SeasonUpdatePayload,
} from './season-payload.js';

export class SubscriptionService {
  constructor(private readonly configPath: string) {}

  list(): Config {
    return loadConfig(this.configPath);
  }

  add(payload: SeasonPayload): Config {
    const season = parseSeasonPayload(payload);
    const config = this.list();

    if (config.subscriptions.some((existing) => existing.rss === season.rss)) {
      throw new HttpError(409, 'This RSS already exists in config.');
    }

    config.subscriptions.push(season);
    return this.save(config);
  }

  update(index: number, payload: SeasonUpdatePayload): Config {
    const config = this.list();
    const current = this.find(config, index);

    config.subscriptions[index] = {
      ...current,
      ...parseSeasonUpdatePayload(payload, current),
    };

    return this.save(config);
  }

  delete(index: number): Config {
    const config = this.list();
    this.find(config, index);
    config.subscriptions.splice(index, 1);
    return this.save(config);
  }

  private find(config: Config, index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= config.subscriptions.length) {
      throw new HttpError(404, 'Subscription not found.');
    }

    return config.subscriptions[index];
  }

  private save(config: Config) {
    saveConfig(config, this.configPath);
    return config;
  }
}
