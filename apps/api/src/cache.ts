/**
 * Redis cache client and utilities
 */
import Redis from 'ioredis';
import type { Logger } from './logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  enabled?: boolean;
}

let redisClient: Redis | null = null;
let cacheEnabled = false;

/**
 * Initialize Redis connection
 */
export function initializeRedis(config: CacheConfig, logger?: Logger): Redis | null {
  if (!config.enabled) {
    logger?.info('Redis caching is disabled');
    cacheEnabled = false;
    return null;
  }

  try {
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'mega-directory:',
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (error) => {
      logger?.error({ error }, 'Redis connection error');
    });

    redisClient.on('connect', () => {
      logger?.info('Redis connected successfully');
      cacheEnabled = true;
    });

    redisClient.on('ready', () => {
      logger?.info('Redis ready to accept commands');
    });

    return redisClient;
  } catch (error) {
    logger?.error({ error }, 'Failed to initialize Redis');
    cacheEnabled = false;
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if caching is enabled and client is ready
 */
export function isCacheEnabled(): boolean {
  return cacheEnabled && redisClient !== null && redisClient.status === 'ready';
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    cacheEnabled = false;
  }
}

/**
 * Get value from cache
 */
export async function get<T = any>(key: string): Promise<T | null> {
  if (!isCacheEnabled()) {
    return null;
  }

  try {
    const value = await redisClient!.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with optional TTL (in seconds)
 */
export async function set(key: string, value: any, ttl?: number): Promise<void> {
  if (!isCacheEnabled()) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redisClient!.setex(key, ttl, serialized);
    } else {
      await redisClient!.set(key, serialized);
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete key(s) from cache
 */
export async function del(key: string | string[]): Promise<void> {
  if (!isCacheEnabled()) {
    return;
  }

  try {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length > 0) {
      await redisClient!.del(...keys);
    }
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function deletePattern(pattern: string): Promise<void> {
  if (!isCacheEnabled()) {
    return;
  }

  try {
    const keys = await redisClient!.keys(pattern);
    if (keys.length > 0) {
      await redisClient!.del(...keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}

/**
 * Clear all cache (use with caution)
 */
export async function flushAll(): Promise<void> {
  if (!isCacheEnabled()) {
    return;
  }

  try {
    await redisClient!.flushdb();
  } catch (error) {
    console.error('Cache flush error:', error);
  }
}

// Cache key generators
export const CacheKeys = {
  listing: (id: number) => `listing:${id}`,
  listings: (page?: number, limit?: number) =>
    `listings:page:${page || 1}:limit:${limit || 20}`,

  category: (id: number) => `category:${id}`,
  categories: (page?: number, limit?: number) =>
    `categories:page:${page || 1}:limit:${limit || 20}`,

  directory: (id: number) => `directory:${id}`,
  directoryBySlug: (slug: string) => `directory:slug:${slug}`,
  directories: (page?: number, limit?: number) =>
    `directories:page:${page || 1}:limit:${limit || 20}`,
  activeDirectories: (page?: number, limit?: number) =>
    `directories:active:page:${page || 1}:limit:${limit || 20}`,

  address: (id: number) => `address:${id}`,
  addresses: (page?: number, limit?: number) =>
    `addresses:page:${page || 1}:limit:${limit || 20}`,
};

// Default TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
};

// Cache invalidation helpers
export const CacheInvalidation = {
  /**
   * Invalidate all listing-related caches
   */
  async listings(): Promise<void> {
    await deletePattern('listings:*');
    await deletePattern('listing:*');
  },

  /**
   * Invalidate specific listing cache
   */
  async listing(id: number): Promise<void> {
    await del(CacheKeys.listing(id));
    await deletePattern('listings:*');
  },

  /**
   * Invalidate all category-related caches
   */
  async categories(): Promise<void> {
    await deletePattern('categories:*');
    await deletePattern('category:*');
  },

  /**
   * Invalidate specific category cache
   */
  async category(id: number): Promise<void> {
    await del(CacheKeys.category(id));
    await deletePattern('categories:*');
  },

  /**
   * Invalidate all directory-related caches
   */
  async directories(): Promise<void> {
    await deletePattern('directories:*');
    await deletePattern('directory:*');
  },

  /**
   * Invalidate specific directory cache
   */
  async directory(id: number, slug?: string): Promise<void> {
    await del(CacheKeys.directory(id));
    if (slug) {
      await del(CacheKeys.directoryBySlug(slug));
    }
    await deletePattern('directories:*');
  },

  /**
   * Invalidate all address-related caches
   */
  async addresses(): Promise<void> {
    await deletePattern('addresses:*');
    await deletePattern('address:*');
  },

  /**
   * Invalidate specific address cache
   */
  async address(id: number): Promise<void> {
    await del(CacheKeys.address(id));
    await deletePattern('addresses:*');
  },

  /**
   * Invalidate all route-based caches
   */
  async routes(): Promise<void> {
    await deletePattern('route:*');
  },
};
