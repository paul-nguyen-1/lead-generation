import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../common/config/redis.config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Best-effort, Redis-backed per-domain pacing so distributed workers don't
 * hammer the same site faster than its robots.txt crawl-delay (or our
 * default minimum delay) allows.
 */
@Injectable()
export class DomainThrottleService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      ...getRedisConnectionOptions(this.configService),
      maxRetriesPerRequest: null,
    });
  }

  /** Resolves once it is this caller's turn to fetch from `domain`. */
  async waitForTurn(domain: string, delayMs: number): Promise<void> {
    const key = `scraper:throttle:${domain}`;
    for (;;) {
      const last = await this.redis.get(key);
      const now = Date.now();
      const elapsed = now - (last ? Number(last) : 0);
      if (elapsed >= delayMs) {
        await this.redis.set(key, now.toString(), 'PX', delayMs + 5000);
        return;
      }
      await sleep(delayMs - elapsed);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
