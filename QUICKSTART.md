# Quick Start Guide

Get Mega Directory running in minutes with these streamlined instructions.

## TL;DR

```bash
# 1. Clone and install
git clone https://github.com/your-org/mega-directory.git
cd mega-directory
make install

# 2. Start database (choose one)
docker compose up -d db              # Option A: Docker
# OR configure local PostgreSQL      # Option B: Local

# 3. Initialize database
make db-setup

# 4. Start development environment
make dev
```

Visit:
- **API**: http://localhost:3030/health
- **Web**: http://localhost:3000
- **Admin**: http://localhost:4000

## Detailed Steps

### 1. Prerequisites Check

Verify you have required tools installed:

```bash
make check-deps
```

Required:
- Node.js 18+
- Python 3.10+
- PostgreSQL (or Docker)

### 2. Install Dependencies

```bash
make install
```

This installs both Node.js and Python dependencies.

### 3. Database Setup

#### Option A: Docker (Recommended)

```bash
# Start PostgreSQL in Docker
docker compose up -d db

# Wait for database to be ready
docker compose logs -f db
# Press Ctrl+C when you see "database system is ready to accept connections"
```

#### Option B: Local PostgreSQL

```bash
# Create database
createdb mega_directory

# Set environment variable
export DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory"
```

#### Option C: Custom Port (Multiple Instances)

```bash
# Start second database instance on different port
DB_PORT=5433 DB_NAME=mega_directory_2 docker compose up -d db

# Set environment for this instance
export DB_PORT=5433
export DB_NAME=mega_directory_2
```

### 4. Initialize Database

```bash
make db-setup
```

This will:
1. Run migrations
2. Generate Prisma Client
3. Optionally seed sample data

### 5. Start Development Services

```bash
make dev
```

This starts:
- API server (port 3030)
- Web frontend (port 3000)
- Admin interface (port 4000)
- Background crawler (optional)

**Alternative commands:**
```bash
make dev-no-crawler    # Skip crawler
make dev-quick         # Skip dependency checks
```

## Verify Everything Works

```bash
# Check service health
make health

# Test API
curl http://localhost:3030/health

# Test Web (in browser)
open http://localhost:3000
```

## Common Commands

```bash
make help              # Show all available commands
make dev               # Start development services
make dev-stop          # Stop all services
make health            # Check service health
make db-migrate        # Run database migrations
make db-studio         # Open database GUI
make test              # Run tests
make docker-up         # Start with Docker Compose
```

## Environment Configuration

### Using .env file

```bash
cp .env.example .env
# Edit .env with your settings
source .env
make dev
```

### Quick Custom Ports

```bash
# Run second instance with different ports
DB_PORT=5433 DB_NAME=mega_directory_2 \
API_PORT=3031 ASTRO_PORT=3001 ADMIN_PORT=4001 \
make dev
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3030

# Kill the process
kill $(lsof -t -i :3030)

# Or use different ports
API_PORT=3031 make dev
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check Docker database
docker compose ps db
docker compose logs db

# Restart database
docker compose restart db
```

### Dependencies Not Found

```bash
# Reinstall everything
make clean
make install
```

### Build Failures

```bash
# Clean build artifacts
make dev-clean

# Rebuild
make build
make dev
```

## Next Steps

- **Documentation**: See [DEVOPS.md](./DEVOPS.md) for complete deployment guide
- **Development**: See [docs/development/setup.md](./docs/development/setup.md)
- **Testing**: Run `make test` to execute test suite
- **Database GUI**: Run `make db-studio` to open Prisma Studio

## Getting Help

```bash
make help              # List all available commands
make check-deps        # Verify dependencies
make health            # Check service status
```

For issues, see [Troubleshooting section in DEVOPS.md](./DEVOPS.md#troubleshooting)
