import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/**
 * Shared ioredis connection options for BullMQ and the domain throttle.
 * Set REDIS_TLS=true for TLS-only providers like Upstash (rediss://).
 */
export function getRedisConnectionOptions(
  configService: ConfigService,
): RedisOptions {
  return {
    host: configService.get<string>('REDIS_HOST') ?? '127.0.0.1',
    port: Number(configService.get<string>('REDIS_PORT') ?? 6379),
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
    tls: configService.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
  };
}
