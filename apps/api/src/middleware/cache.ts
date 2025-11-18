/**
 * Caching middleware for API responses
 */
import { Request, Response, NextFunction } from 'express';
import { get, set, isCacheEnabled } from '../cache';

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const { method, path, query } = req;
  const queryString = Object.keys(query)
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join('&');

  return `route:${method}:${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Cache middleware for GET requests
 * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
export function cacheMiddleware(ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET' || !isCacheEnabled()) {
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      // Try to get from cache
      const cachedData = await get(cacheKey);

      if (cachedData) {
        // Set cache hit header
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (data: any) {
        // Cache the response asynchronously (don't await)
        set(cacheKey, data, ttl).catch((error) => {
          console.error('Failed to cache response:', error);
        });

        // Set cache miss header
        res.setHeader('X-Cache', 'MISS');

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}
