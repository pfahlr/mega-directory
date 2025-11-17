# Database Migration Guide

This document provides guidelines for managing database migrations in the Mega Directory API.

## Overview

We use Prisma Migrate for database schema management. Prisma Migrate creates migration files based on changes to the `schema.prisma` file and applies them to the database.

## Migration Workflow

### Creating a New Migration

1. **Modify the Prisma schema** (`apps/api/prisma/schema.prisma`)
   - Add, modify, or remove models
   - Update fields, relations, or constraints

2. **Create a migration**
   ```bash
   npm run db:migrate:create
   ```
   This will:
   - Generate SQL migration files
   - Prompt you for a migration name (use descriptive names like `add_featured_slots_table`)
   - Apply the migration to your development database

3. **Review the generated SQL**
   - Check `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`
   - Ensure the SQL matches your intentions
   - Look for potential data loss warnings

4. **Commit the migration**
   ```bash
   git add apps/api/prisma/migrations
   git add apps/api/prisma/schema.prisma
   git commit -m "feat(db): <description of migration>"
   ```

### Applying Migrations

#### Development Environment
```bash
npm run db:migrate:dev
```
This command:
- Creates new migrations if schema changed
- Applies pending migrations
- Regenerates Prisma Client

#### Production/Staging Environment
```bash
npm run db:migrate:deploy
```
This command:
- Applies pending migrations
- Does NOT create new migrations
- Safe for production use

### Checking Migration Status

```bash
npm run db:migrate:status
```
Shows:
- Applied migrations
- Pending migrations
- Database connection status

### Resetting the Database

⚠️ **WARNING: This will delete all data!**

```bash
npm run db:migrate:reset
```
This command:
- Drops the database
- Creates a new database
- Applies all migrations
- Runs seed scripts

## Migration Best Practices

### Naming Conventions

Use descriptive names that explain the change:
- ✅ `add_user_email_index`
- ✅ `remove_deprecated_status_field`
- ✅ `add_listing_categories_relation`
- ❌ `update_schema`
- ❌ `fix_stuff`
- ❌ `migration_001`

### Schema Changes

1. **Additive Changes** (Safe)
   - Adding new tables
   - Adding nullable columns
   - Adding indexes
   - These can be deployed without downtime

2. **Modifying Columns** (Caution)
   - Changing column types
   - Making columns non-nullable
   - May require data migration script
   - Test thoroughly before deploying

3. **Removing Columns** (Dangerous)
   - Always deprecate first in separate deployment
   - Ensure no code references the column
   - Remove in subsequent deployment
   - Consider keeping data for backup

### Data Migrations

For complex migrations that require data transformation:

1. Create the schema migration first
2. Create a separate data migration script
3. Test the script on a copy of production data
4. Run during low-traffic period
5. Have a rollback plan

Example data migration script:
```typescript
// scripts/migrations/migrate-old-status-to-new.ts
import { prisma } from '../src/db';

async function migrateData() {
  // Transform old status values to new ones
  await prisma.$executeRaw`
    UPDATE listings
    SET status = 'ACTIVE'
    WHERE old_status = 'published';
  `;
}

migrateData()
  .then(() => console.log('Migration complete'))
  .catch((e) => console.error('Migration failed:', e))
  .finally(() => prisma.$disconnect());
```

### Handling Conflicts

If you encounter migration conflicts:

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Check migration status**
   ```bash
   npm run db:migrate:status
   ```

3. **If migrations conflict, create a new migration**
   ```bash
   npm run db:migrate:create
   ```

4. **Merge any conflicting changes** into your new migration

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate:dev` | Create and apply migrations (dev) |
| `npm run db:migrate:create` | Create migration without applying |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:migrate:status` | Show migration status |
| `npm run db:migrate:reset` | Reset database and reapply all migrations |
| `npm run db:push` | Push schema changes without creating migration (dev only) |
| `npm run db:seed` | Run seed scripts |
| `npm run db:studio` | Open Prisma Studio GUI |

## Rollback Strategy

Prisma Migrate doesn't support automatic rollbacks. If you need to rollback:

1. **Revert the problematic migration commit**
   ```bash
   git revert <commit-hash>
   ```

2. **Create a new migration** that undoes the changes
   ```bash
   npm run db:migrate:create
   ```

3. **Manual rollback** (if needed):
   - Identify the migration SQL file
   - Write inverse SQL commands
   - Apply manually or create a rollback script

4. **For production emergencies**:
   - Have database backups ready
   - Test rollback procedure in staging first
   - Document the rollback steps

## Seed Data

Seed scripts are located in `apps/api/prisma/seed.ts` and run with:

```bash
npm run db:seed
```

Seed data should be:
- Idempotent (safe to run multiple times)
- Representative of real data
- Useful for development and testing

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run database migrations
  run: npm run db:migrate:deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Pre-deployment Checklist

- [ ] All migrations tested locally
- [ ] Migrations reviewed by team
- [ ] Database backup created
- [ ] Migration tested on staging
- [ ] Downtime window scheduled (if needed)
- [ ] Rollback plan documented

## Troubleshooting

### Migration Failed to Apply

1. Check database connection
2. Review migration SQL for errors
3. Check database permissions
4. Look for conflicting constraints

### Schema Drift Detected

If Prisma detects schema drift:
```bash
npm run db:push
```
Or create a migration to align:
```bash
npm run db:migrate:dev
```

### Out of Sync Migrations

If your local migrations are out of sync:
```bash
npm run db:migrate:reset
```
This resets your local database to match migrations.

## Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Best Practices](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate)
