# Database Connection Pooling Guide

This document explains how database connection pooling is configured and how to optimize it for your deployment.

## Overview

Connection pooling helps manage database connections efficiently by reusing existing connections instead of creating new ones for each request. This improves performance and prevents database connection exhaustion.

## Configuration

### Environment Variables

Configure connection pooling using these environment variables:

```bash
# Maximum number of connections in the pool (default: 10)
DB_CONNECTION_LIMIT=10

# Timeout in seconds for acquiring a connection (default: 20)
DB_POOL_TIMEOUT=20

# Example DATABASE_URL with pool parameters
DATABASE_URL="postgresql://user:password@localhost:5432/mega_directory?connection_limit=10&pool_timeout=20"
```

### Setting Connection Limits

Use this formula to determine the optimal connection limit:

```
connection_limit = (num_physical_cpus * 2) + num_effective_spindle_disks
```

**Recommended Values:**

| Environment | Connection Limit | Reasoning |
|-------------|------------------|-----------|
| Development | 5-10 | Single developer, low concurrent requests |
| Staging | 10-15 | Limited concurrent users, testing scenarios |
| Production (single instance) | 10-20 | Balance between performance and database limits |
| Production (multi-instance) | 5-10 per instance | Total connections = instances × limit per instance |

## Best Practices

### 1. Calculate Total Connections

If running multiple API instances, calculate total database connections:

```
Total DB Connections = Number of Instances × Connection Limit per Instance
```

**Example:**
- 3 API instances
- Each with connection_limit=10
- Total: 30 concurrent database connections

Ensure your database can handle this load!

### 2. PostgreSQL Connection Limits

Check your PostgreSQL max_connections setting:

```sql
SHOW max_connections;
```

Default is usually 100. Leave headroom for:
- Admin connections
- Monitoring tools
- Background jobs
- Other services

**Rule of thumb:** Use max 70-80% of max_connections for your application.

### 3. Connection Pool Timeout

The `pool_timeout` parameter controls how long Prisma waits for an available connection.

- **Too low (< 10s):** Requests may fail unnecessarily during traffic spikes
- **Too high (> 60s):** Requests hang for too long, poor user experience
- **Recommended:** 20-30 seconds for most applications

### 4. Monitoring Connection Usage

Monitor these metrics:

1. **Pool exhaustion rate**
   - If you see "Connection pool timeout" errors, increase the pool size
   - Or optimize queries to reduce connection hold time

2. **Average connection duration**
   - Long-running queries hold connections longer
   - Consider query optimization or read replicas

3. **Peak concurrent connections**
   - Monitor during high traffic periods
   - Adjust pool size based on actual usage

### 5. Serverless Deployments

For serverless environments (AWS Lambda, Vercel, etc.):

- **Problem:** Each function instance creates its own connection pool
- **Solution:** Use connection pooling proxy like PgBouncer or AWS RDS Proxy

```bash
# Example with PgBouncer
DATABASE_URL="postgresql://user:password@pgbouncer:6432/mega_directory?connection_limit=1&pool_timeout=10"
```

For serverless, use:
- `connection_limit=1` per function
- `pool_timeout=10` (shorter timeout)
- External connection pooler handles the real pooling

## Troubleshooting

### Error: "Connection pool timeout"

**Symptoms:**
```
Error: Can't reach database server at `localhost:5432`
Please make sure your database server is running at `localhost:5432`.
Details: Connection pool timeout
```

**Causes:**
1. Connection pool is too small for traffic
2. Slow queries holding connections too long
3. Database server overloaded

**Solutions:**
1. Increase `DB_CONNECTION_LIMIT`
2. Optimize slow queries
3. Add query timeout limits
4. Scale database resources

### Error: "Too many connections"

**Symptoms:**
```
FATAL: sorry, too many clients already
```

**Causes:**
1. Total connections exceed database max_connections
2. Connections not being released properly
3. Too many API instances

**Solutions:**
1. Reduce `DB_CONNECTION_LIMIT` per instance
2. Increase database max_connections
3. Use connection pooler (PgBouncer)
4. Fix connection leaks in code

### Slow Query Performance

**Symptoms:**
- Requests hang during traffic spikes
- Connection pool frequently exhausted

**Solutions:**
1. Add database indexes
2. Optimize N+1 queries
3. Use connection pooling proxy
4. Implement query caching
5. Add read replicas for read-heavy loads

## Connection Pool Lifecycle

### Initialization
```typescript
// On application start
import { initializePrisma } from './db';
await initializePrisma();
```

### Normal Operation
- Connections created on demand up to `connection_limit`
- Idle connections kept alive for reuse
- Busy connections queued with timeout

### Shutdown
```typescript
// On graceful shutdown
import { disconnectPrisma } from './db';
await disconnectPrisma();
```

## Performance Tips

### 1. Minimize Connection Hold Time

```typescript
// ❌ Bad: Long transaction holds connection
await prisma.$transaction(async (tx) => {
  const data = await fetchFromExternalAPI(); // Slow external call
  await tx.listing.create({ data });
});

// ✅ Good: Fetch data first, then use transaction
const data = await fetchFromExternalAPI();
await prisma.listing.create({ data });
```

### 2. Use Connection Efficiently

```typescript
// ❌ Bad: Sequential queries
const user = await prisma.user.findUnique({ where: { id: 1 } });
const posts = await prisma.post.findMany({ where: { userId: 1 } });

// ✅ Better: Parallel queries (when independent)
const [user, posts] = await Promise.all([
  prisma.user.findUnique({ where: { id: 1 } }),
  prisma.post.findMany({ where: { userId: 1 } })
]);

// ✅ Best: Single query with relations
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
});
```

### 3. Close Connections Properly

```typescript
// ❌ Bad: Connection leak risk
export const prisma = new PrismaClient();
// Never disconnected on shutdown

// ✅ Good: Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

## Advanced Configuration

### Read Replicas

For read-heavy workloads, use read replicas:

```typescript
// Write to primary
export const prismaWrite = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_PRIMARY } }
});

// Read from replica
export const prismaRead = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_REPLICA } }
});

// Usage
await prismaWrite.listing.create({ data });
const listings = await prismaRead.listing.findMany();
```

### Connection Pooler (PgBouncer)

For large-scale deployments:

1. **Setup PgBouncer**
   ```ini
   [databases]
   mega_directory = host=localhost port=5432 dbname=mega_directory

   [pgbouncer]
   pool_mode = transaction
   max_client_conn = 1000
   default_pool_size = 20
   ```

2. **Update DATABASE_URL**
   ```bash
   DATABASE_URL="postgresql://user:password@pgbouncer:6432/mega_directory"
   ```

## Monitoring

### Prisma Metrics

Enable Prisma metrics in production:

```typescript
export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### Database Monitoring

Monitor these PostgreSQL metrics:

```sql
-- Current connections
SELECT count(*) FROM pg_stat_activity;

-- Connection by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

## Resources

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
