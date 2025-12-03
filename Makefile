.PHONY: help dev dev-stop dev-clean dev-logs health check-deps install build test db-setup db-migrate db-seed db-reset clean docker-up docker-down docker-logs sops-encryptkeys sops-updatekeys sops-decrypt sops-env-export

.DEFAULT_GOAL := help

##@ General

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

dev: check-deps ## Start all development services (API, Web, Admin, Crawler)
	@echo "🚀 Starting development environment..."
	@./scripts/dev-bootstrap.sh

dev-quick: ## Start development without dependency checks
	@echo "🚀 Starting development environment (quick mode)..."
	@./scripts/dev-bootstrap.sh

dev-no-crawler: ## Start development without crawler
	@echo "🚀 Starting development environment (no crawler)..."
	@SKIP_CRAWLER=1 ./scripts/dev-bootstrap.sh

dev-stop: ## Stop all development services
	@echo "🛑 Stopping development services..."
	@pkill -f "node.*dist/server.js" || true
	@pkill -f "node.*index.js" || true
	@pkill -f "astro dev" || true
	@pkill -f "dev_runner.py" || true
	@echo "✓ Development services stopped"

dev-clean: dev-stop ## Stop services and clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf apps/api/dist apps/web/dist apps/admin/dist
	@rm -rf apps/*/.astro
	@echo "✓ Clean complete"

dev-logs: ## Follow development logs (requires systemd or journalctl)
	@if command -v journalctl >/dev/null 2>&1; then \
		sudo journalctl -f -u megadir-* 2>/dev/null || echo "No systemd services found"; \
	else \
		echo "Logs are output to console when using dev-bootstrap.sh"; \
	fi

##@ Dependencies & Setup

check-deps: ## Validate required dependencies are installed
	@./scripts/check-dependencies.sh

install: check-deps ## Install all project dependencies
	@echo "📦 Installing dependencies..."
	@npm install
	@echo "📦 Installing Python dependencies..."
	@python3 -m pip install --user -r apps/crawler/requirements-dev.txt
	@echo "✓ Dependencies installed"

build: ## Build all applications
	@echo "🔨 Building applications..."
	@npm run build
	@echo "✓ Build complete"

##@ Testing

test: ## Run all tests
	@echo "🧪 Running tests..."
	@cd apps/api && npm test

test-api: ## Run API tests only
	@echo "🧪 Running API tests..."
	@cd apps/api && npm test

test-coverage: ## Run tests with coverage report
	@echo "🧪 Running tests with coverage..."
	@cd apps/api && npm run test:coverage

##@ Database

db-setup: ## Initialize database (migrate + seed)
	@./scripts/db-init.sh

db-migrate: ## Run database migrations
	@echo "🗄️  Running database migrations..."
	@npx prisma migrate deploy --schema=db/schema.prisma

db-seed: ## Seed database with sample data
	@echo "🌱 Seeding database..."
	@npx ts-node db/seed.ts
	@echo "✓ Database seeded"

db-seed-geo: ## Seed geographic data
	@echo "🌍 Seeding geographic data..."
	@npx ts-node db/scripts/seedGeography.ts
	@echo "✓ Geographic data seeded"

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "⚠️  WARNING: This will destroy all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		npx prisma migrate reset --schema=db/schema.prisma; \
	else \
		echo "Aborted"; \
	fi

db-studio: ## Open Prisma Studio (database GUI)
	@echo "🎨 Opening Prisma Studio..."
	@npx prisma studio --schema=db/schema.prisma

##@ Docker

docker-up: ## Start core services (api, web, db) with Docker Compose
	@echo "🐳 Starting core Docker services (api, web, db)..."
	@docker compose up -d
	@echo "✓ Docker services started"
	@echo "  API       -> http://localhost:$${API_PORT:-3030}"
	@echo "  Web       -> http://localhost:$${ASTRO_PORT:-3000}"
	@echo "  Database  -> localhost:$${DB_PORT:-5432}"

docker-up-full: ## Start all services including admin and crawler
	@echo "🐳 Starting full Docker stack (api, web, db, admin, crawler)..."
	@docker compose --profile admin --profile crawler up -d
	@echo "✓ Full Docker stack started"
	@echo "  API       -> http://localhost:$${API_PORT:-3030}"
	@echo "  Web       -> http://localhost:$${ASTRO_PORT:-3000}"
	@echo "  Admin     -> http://localhost:$${ADMIN_PORT:-4000}"
	@echo "  Database  -> localhost:$${DB_PORT:-5432}"
	@echo "  Crawler   -> running"

docker-up-admin: ## Start services with admin UI
	@echo "🐳 Starting Docker with admin (api, web, db, admin)..."
	@docker compose --profile admin up -d
	@echo "✓ Docker services with admin started"
	@echo "  API       -> http://localhost:$${API_PORT:-3030}"
	@echo "  Web       -> http://localhost:$${ASTRO_PORT:-3000}"
	@echo "  Admin     -> http://localhost:$${ADMIN_PORT:-4000}"
	@echo "  Database  -> localhost:$${DB_PORT:-5432}"

docker-up-crawler: ## Start services with crawler
	@echo "🐳 Starting Docker with crawler (api, web, db, crawler)..."
	@docker compose --profile crawler up -d
	@echo "✓ Docker services with crawler started"
	@echo "  API       -> http://localhost:$${API_PORT:-3030}"
	@echo "  Web       -> http://localhost:$${ASTRO_PORT:-3000}"
	@echo "  Database  -> localhost:$${DB_PORT:-5432}"
	@echo "  Crawler   -> running"

docker-down: ## Stop all Docker services
	@echo "🐳 Stopping Docker services..."
	@docker compose --profile admin --profile crawler down
	@echo "✓ Docker services stopped"

docker-build: ## Build Docker images for all services
	@echo "🐳 Building Docker images..."
	@docker compose --profile admin --profile crawler build

docker-logs: ## Follow Docker service logs
	@docker compose --profile admin --profile crawler logs -f

docker-clean: ## Remove Docker containers and volumes
	@echo "🐳 Cleaning Docker resources..."
	@docker compose --profile admin --profile crawler down -v
	@echo "✓ Docker resources cleaned"

docker-health: ## Check health status of all running Docker services
	@echo "🩺 Checking Docker service health..."
	@docker compose ps

##@ Health & Monitoring

health: ## Check health of all services
	@./scripts/health-check.sh

status: health ## Alias for health check

##@ Utilities

clean: dev-clean ## Clean all build artifacts and caches
	@echo "🧹 Deep cleaning..."
	@rm -rf node_modules apps/*/node_modules
	@rm -rf .turbo apps/*/.turbo
	@echo "✓ Deep clean complete"

format: ## Format code (if prettier/formatter is configured)
	@echo "💅 Formatting code..."
	@npm run format 2>/dev/null || echo "No format script found"

lint: ## Run linters
	@echo "🔍 Running linters..."
	@npm run lint 2>/dev/null || echo "No lint script found"

##@ SOPS (Secret Management)

sops-encryptkeys: ## Encrypt env.json with SOPS
	@file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops -e "$$file" > "$$file.tmp" && mv "$$file.tmp" "$$file"

sops-updatekeys: ## Rewrap SOPS file with new recipients from .sops.yaml
	@file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops updatekeys "$$file"

sops-decrypt: ## Decrypt a SOPS file to stdout (or redirect to a file)
	@file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops -d "$$file"

sops-env-export: ## Print export lines for env.json
	@file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if ! command -v jq >/dev/null 2>&1; then echo "jq not found; install jq first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops -d --output-type json "$$file" | sed -e "s|_pt||g;s|_unencrypted||g" | jq -r 'to_entries[] | "export \(.key)=\(.value|@sh)"'

