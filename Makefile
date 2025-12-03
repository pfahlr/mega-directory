# Mega Directory Makefile
# Convenient commands for development and deployment

.PHONY: help bootstrap env-check test build clean up down restart logs

# Default target
help:
	@echo "Mega Directory - Available Commands:"
	@echo ""
	@echo "  make bootstrap        - Setup environment for first time"
	@echo "  make env-check        - Validate environment configuration"
	@echo "  make env-check-strict - Validate with strict mode (warnings = errors)"
	@echo ""
	@echo "  make up               - Start all services (Docker)"
	@echo "  make down             - Stop all services"
	@echo "  make restart          - Restart all services"
	@echo "  make rebuild          - Rebuild and restart services"
	@echo "  make logs             - Show logs from all services"
	@echo "  make logs-api         - Show API logs only"
	@echo "  make logs-web         - Show web logs only"
	@echo ""
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database with sample data"
	@echo "  make db-reset         - Reset database (migrate + seed)"
	@echo ""
	@echo "  make test             - Run all tests"
	@echo "  make test-api         - Run API tests"
	@echo "  make test-web         - Run web tests"
	@echo "  make lint             - Run linters"
	@echo ""
	@echo "  make clean            - Clean build artifacts"
	@echo "  make build            - Build all services"

# Bootstrap: First-time setup
bootstrap:
	@echo "Setting up Mega Directory..."
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "⚠ Please edit .env and set required variables!"; \
	else \
		echo "✓ .env already exists"; \
	fi
	@./scripts/env-check.sh || true
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env and set required variables (JWT_SECRET, CRAWLER_BEARER_TOKEN, etc.)"
	@echo "  2. Run 'make env-check' to validate configuration"
	@echo "  3. Run 'make up' to start services"
	@echo "  4. Run 'make db-migrate' to apply database migrations"
	@echo "  5. Run 'make db-seed' to load sample data"

# Environment validation
env-check:
	@./scripts/env-check.sh

env-check-strict:
	@./scripts/env-check.sh --strict

# Docker commands
up:
	@echo "Starting services..."
	@docker-compose up -d
	@echo "✓ Services started"
	@docker-compose ps

down:
	@echo "Stopping services..."
	@docker-compose down
	@echo "✓ Services stopped"

restart: down up

rebuild:
	@echo "Rebuilding and restarting services..."
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d
	@echo "✓ Services rebuilt and started"
	@docker-compose ps

logs:
	@docker-compose logs -f

logs-api:
	@docker-compose logs -f api

logs-web:
	@docker-compose logs -f web

logs-db:
	@docker-compose logs -f db

# Database commands
db-migrate:
	@echo "Running database migrations..."
	@docker-compose exec api sh -c "cd /app && npx prisma migrate deploy --schema=db/schema.prisma"
	@echo "✓ Migrations applied"

db-seed:
	@echo "Seeding database..."
	@docker-compose exec api sh -c "cd /app && npm run seed"
	@echo "✓ Database seeded"

db-reset: db-migrate db-seed
	@echo "✓ Database reset complete"

db-studio:
	@echo "Opening Prisma Studio..."
	@docker-compose exec api sh -c "cd /app && npx prisma studio --schema=db/schema.prisma"

# Testing commands
test:
	@echo "Running all tests..."
	@npm run test

test-api:
	@echo "Running API tests..."
	@npm run test --workspace=apps/api

test-web:
	@echo "Running web tests..."
	@npm run test --workspace=apps/web

test-admin:
	@echo "Running admin tests..."
	@npm run test --workspace=apps/admin

lint:
	@echo "Running linters..."
	@npm run lint

lint-fix:
	@echo "Running linters with auto-fix..."
	@npm run lint:fix

# Build commands
build:
	@echo "Building all services..."
	@npm run build

build-api:
	@echo "Building API..."
	@npm run build --workspace=apps/api

build-web:
	@echo "Building web..."
	@npm run build --workspace=apps/web

# Clean commands
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf apps/api/dist
	@rm -rf apps/web/dist
	@rm -rf apps/web/.astro
	@rm -rf node_modules/.cache
	@echo "✓ Cleaned"

clean-all: clean
	@echo "Cleaning node_modules..."
	@rm -rf node_modules
	@rm -rf apps/*/node_modules
	@echo "✓ Deep clean complete"
