#!/usr/bin/env bash

# Database Initialization Script
# Runs migrations and optionally seeds the database

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-mega_directory}"

# Build DATABASE_URL if not set
if [ -z "${DATABASE_URL:-}" ]; then
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Initialization             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo

# Check if database is accessible
echo "1. Checking database connectivity..."
if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database is accessible"
    else
        echo -e "${RED}✗${NC} Cannot connect to database at $DB_HOST:$DB_PORT"
        echo
        echo "Please ensure PostgreSQL is running:"
        echo "  - Docker: docker compose up -d db"
        echo "  - Local: sudo systemctl start postgresql"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC} pg_isready not found, skipping connectivity check"
fi

echo

# Generate Prisma Client
echo "2. Generating Prisma Client..."
if npx prisma generate --schema=db/schema.prisma; then
    echo -e "${GREEN}✓${NC} Prisma Client generated"
else
    echo -e "${RED}✗${NC} Failed to generate Prisma Client"
    exit 1
fi

echo

# Run migrations
echo "3. Running database migrations..."
if npx prisma migrate deploy --schema=db/schema.prisma; then
    echo -e "${GREEN}✓${NC} Migrations applied successfully"
else
    echo -e "${RED}✗${NC} Failed to apply migrations"
    exit 1
fi

echo

# Ask about seeding
echo "4. Database seeding (optional)"
echo
read -p "Do you want to seed the database with sample data? [y/N] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo
    echo "Seeding database..."

    # Seed geographic data
    echo "  → Seeding geographic data..."
    if npx ts-node db/scripts/seedGeography.ts; then
        echo -e "  ${GREEN}✓${NC} Geographic data seeded"
    else
        echo -e "  ${YELLOW}⚠${NC} Geographic seeding failed (non-critical)"
    fi

    echo

    # Seed sample data
    echo "  → Seeding sample data (categories, directories, listings)..."
    if npx ts-node db/seed.ts; then
        echo -e "  ${GREEN}✓${NC} Sample data seeded"
    else
        echo -e "  ${YELLOW}⚠${NC} Sample data seeding failed"
    fi

    echo
    echo -e "${GREEN}✓${NC} Database initialization complete with sample data"
else
    echo
    echo -e "${GREEN}✓${NC} Database initialization complete (no seeding)"
fi

echo
echo "Next steps:"
echo "  - Start services: make dev (or ./scripts/dev-bootstrap.sh)"
echo "  - View database: make db-studio"
echo "  - Health check: make health"
