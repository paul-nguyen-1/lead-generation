import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import robotsParser from 'robots-parser';

const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ROBOTS_FETCH_TIMEOUT_MS = 5000;

interface CacheEntry {
  robots: ReturnType<typeof robotsParser>;
  expiresAt: number;
}

/**
 * Fetches and caches robots.txt per origin, and answers whether our
 * configured user-agent is allowed to fetch a given URL / what crawl-delay
 * to respect. If robots.txt cannot be retrieved, sites are treated as fully
 * allowed (the standard convention for a missing robots.txt).
 */
@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly userAgent: string;
  private readonly defaultCrawlDelayMs: number;

  constructor(private readonly configService: ConfigService) {
    this.userAgent =
      this.configService.get<string>('SCRAPER_USER_AGENT') ?? 'LeadGenBot/1.0';
    this.defaultCrawlDelayMs = Number(
      this.configService.get<string>('SCRAPER_DEFAULT_CRAWL_DELAY_MS') ?? 2000,
    );
  }

  async isAllowed(url: string): Promise<boolean> {
    try {
      const robots = await this.getRobots(url);
      return robots.isAllowed(url, this.userAgent) ?? true;
    } catch (err) {
      this.logger.warn(`robots.txt check failed for ${url}: ${String(err)}`);
      return false;
    }
  }

  async getCrawlDelayMs(url: string): Promise<number> {
    try {
      const robots = await this.getRobots(url);
      const delaySec = robots.getCrawlDelay(this.userAgent);
      if (delaySec) {
        return Math.max(delaySec * 1000, this.defaultCrawlDelayMs);
      }
    } catch (err) {
      this.logger.warn(
        `robots.txt crawl-delay lookup failed for ${url}: ${String(err)}`,
      );
    }
    return this.defaultCrawlDelayMs;
  }

  private async getRobots(
    url: string,
  ): Promise<ReturnType<typeof robotsParser>> {
    const origin = new URL(url).origin;
    const cached = this.cache.get(origin);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.robots;
    }

    const robotsUrl = `${origin}/robots.txt`;
    let body = '';
    try {
      const res = await axios.get<string>(robotsUrl, {
        timeout: ROBOTS_FETCH_TIMEOUT_MS,
        headers: { 'User-Agent': this.userAgent },
        responseType: 'text',
        validateStatus: () => true,
      });
      if (
        res.status >= 200 &&
        res.status < 300 &&
        typeof res.data === 'string'
      ) {
        body = res.data;
      }
    } catch (err) {
      this.logger.debug(`Could not fetch ${robotsUrl}: ${String(err)}`);
    }

    const robots = robotsParser(robotsUrl, body);
    this.cache.set(origin, {
      robots,
      expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS,
    });
    return robots;
  }
}
