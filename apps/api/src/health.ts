/**
 * Health Check Module
 *
 * Provides comprehensive health checks for the API including:
 * - Database connectivity
 * - Cache (Redis) connectivity
 * - System resources
 * - Application status
 */

import { prisma } from './db';
import { get, isCacheEnabled } from './cache';
import type { Logger } from './logger';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthStatus;
    cache: HealthStatus;
    system: SystemHealth;
  };
  timestamp: string;
  uptime: number;
  version?: string;
  environment?: string;
}

export interface HealthStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

/**
 * Check database health
 */
async function checkDatabase(logger?: Logger): Promise<HealthStatus> {
  const start = Date.now();
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;

    // Warn if database response is slow
    if (responseTime > 1000) {
      logger?.warn({ responseTime }, 'Database health check slow');
      return {
        status: 'degraded',
        responseTime,
        message: 'Database responding slowly'
      };
    }

    return {
      status: 'up',
      responseTime,
      message: 'Database connected'
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger?.error({ error, responseTime }, 'Database health check failed');
    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database connection failed'
    };
  }
}

/**
 * Check Redis cache health
 */
async function checkCache(logger?: Logger): Promise<HealthStatus> {
  const start = Date.now();

  // If cache is disabled, return not applicable
  if (!isCacheEnabled()) {
    return {
      status: 'up',
      message: 'Cache disabled'
    };
  }

  try {
    // Try a simple get operation
    await get('health_check_ping');
    const responseTime = Date.now() - start;

    // Warn if cache response is slow
    if (responseTime > 500) {
      logger?.warn({ responseTime }, 'Cache health check slow');
      return {
        status: 'degraded',
        responseTime,
        message: 'Cache responding slowly'
      };
    }

    return {
      status: 'up',
      responseTime,
      message: 'Cache connected'
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    logger?.error({ error, responseTime }, 'Cache health check failed');
    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Cache connection failed'
    };
  }
}

/**
 * Check system resources
 */
function checkSystem(): SystemHealth {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Degraded if memory usage > 80%
  if (memoryPercentage > 80) {
    status = 'degraded';
  }

  // Unhealthy if memory usage > 95%
  if (memoryPercentage > 95) {
    status = 'unhealthy';
  }

  return {
    status,
    memory: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(memoryPercentage)
    },
    uptime: Math.round(process.uptime())
  };
}

/**
 * Determine overall health status
 */
function determineOverallStatus(
  dbStatus: HealthStatus,
  cacheStatus: HealthStatus,
  systemHealth: SystemHealth
): 'healthy' | 'degraded' | 'unhealthy' {
  // Unhealthy if database is down
  if (dbStatus.status === 'down') {
    return 'unhealthy';
  }

  // Unhealthy if system is unhealthy
  if (systemHealth.status === 'unhealthy') {
    return 'unhealthy';
  }

  // Degraded if any service is degraded or cache is down
  if (
    dbStatus.status === 'degraded' ||
    cacheStatus.status === 'degraded' ||
    cacheStatus.status === 'down' ||
    systemHealth.status === 'degraded'
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(logger?: Logger): Promise<HealthCheckResult> {
  const [database, cache] = await Promise.all([
    checkDatabase(logger),
    checkCache(logger)
  ]);

  const system = checkSystem();

  const status = determineOverallStatus(database, cache, system);

  return {
    status,
    checks: {
      database,
      cache,
      system
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || process.env.APP_VERSION,
    environment: process.env.NODE_ENV || 'development'
  };
}

/**
 * Simple readiness check (for load balancers)
 * Returns true if the application is ready to serve traffic
 */
export async function isReady(): Promise<boolean> {
  try {
    // Only check database for readiness
    const dbCheck = await checkDatabase();
    return dbCheck.status === 'up' || dbCheck.status === 'degraded';
  } catch (error) {
    return false;
  }
}

/**
 * Simple liveness check (for orchestrators)
 * Returns true if the application is alive (even if degraded)
 */
export function isAlive(): boolean {
  // Application is alive if the process is running
  // Could add additional checks here (e.g., event loop lag)
  return true;
}
