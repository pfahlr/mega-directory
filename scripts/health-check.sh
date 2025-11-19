#!/usr/bin/env bash

# Mega Directory Health Check Script
# Checks if all services are running and healthy

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_PORT="${API_PORT:-3030}"
ASTRO_PORT="${ASTRO_PORT:-3000}"
ADMIN_PORT="${ADMIN_PORT:-4000}"
DB_PORT="${DB_PORT:-5432}"
DB_HOST="${DB_HOST:-localhost}"

HEALTHY=0
UNHEALTHY=0

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Mega Directory Health Check        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo

check_http() {
    local url=$1
    local service=$2
    local timeout=${3:-5}

    if command -v curl >/dev/null 2>&1; then
        if curl -sf --max-time "$timeout" "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $service is healthy"
            echo "  URL: $url"
            HEALTHY=$((HEALTHY + 1))
            return 0
        else
            echo -e "${RED}✗${NC} $service is not responding"
            echo "  URL: $url"
            UNHEALTHY=$((UNHEALTHY + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} $service (curl not available)"
        return 1
    fi
}

check_port() {
    local port=$1
    local service=$2

    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $service (port $port is open)"
            HEALTHY=$((HEALTHY + 1))
            return 0
        else
            echo -e "${RED}✗${NC} $service (port $port is closed)"
            UNHEALTHY=$((UNHEALTHY + 1))
            return 1
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i ":$port" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $service (port $port is in use)"
            HEALTHY=$((HEALTHY + 1))
            return 0
        else
            echo -e "${RED}✗${NC} $service (port $port is not in use)"
            UNHEALTHY=$((UNHEALTHY + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} $service (cannot check port $port)"
        return 1
    fi
}

check_database() {
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} PostgreSQL is accepting connections"
            echo "  Host: $DB_HOST:$DB_PORT"
            HEALTHY=$((HEALTHY + 1))
            return 0
        else
            echo -e "${RED}✗${NC} PostgreSQL is not accepting connections"
            echo "  Host: $DB_HOST:$DB_PORT"
            UNHEALTHY=$((UNHEALTHY + 1))
            return 1
        fi
    elif command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} PostgreSQL is healthy"
            HEALTHY=$((HEALTHY + 1))
            return 0
        else
            echo -e "${RED}✗${NC} PostgreSQL connection failed"
            UNHEALTHY=$((UNHEALTHY + 1))
            return 1
        fi
    else
        check_port "$DB_PORT" "PostgreSQL"
    fi
}

check_process() {
    local pattern=$1
    local service=$2

    if pgrep -f "$pattern" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service process is running"
        HEALTHY=$((HEALTHY + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $service process is not running"
        UNHEALTHY=$((UNHEALTHY + 1))
        return 1
    fi
}

echo "Services:"
echo "---------"

# Check API
if check_http "http://localhost:$API_PORT/health" "API Server" 3; then
    # Get additional info
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s "http://localhost:$API_PORT/health" 2>/dev/null)
        if [ -n "$response" ]; then
            echo "  Status: $response"
        fi
    fi
else
    # Fallback to port check
    check_port "$API_PORT" "API Server"
fi

echo

# Check Web
if ! check_http "http://localhost:$ASTRO_PORT" "Web Frontend" 3; then
    check_port "$ASTRO_PORT" "Web Frontend"
fi

echo

# Check Admin
if ! check_http "http://localhost:$ADMIN_PORT" "Admin Interface" 3; then
    check_port "$ADMIN_PORT" "Admin Interface"
fi

echo

# Check Database
echo "Database:"
echo "---------"
check_database

echo

# Check Crawler (optional)
echo "Background Services:"
echo "--------------------"
if pgrep -f "dev_runner.py\|crawler.*main.py" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Crawler is running"
    HEALTHY=$((HEALTHY + 1))
else
    echo -e "${YELLOW}⚠${NC} Crawler is not running (optional)"
fi

echo

# Docker services (if applicable)
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    DOCKER_RUNNING=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l)
    if [ "$DOCKER_RUNNING" -gt 0 ]; then
        echo "Docker Services:"
        echo "----------------"
        docker compose ps --format "table {{.Service}}\t{{.Status}}" 2>/dev/null || true
        echo
    fi
fi

# Summary
echo "Summary:"
echo "--------"
TOTAL=$((HEALTHY + UNHEALTHY))

if [ $TOTAL -eq 0 ]; then
    echo -e "${YELLOW}⚠ No services detected${NC}"
    echo "  Run: make dev (or ./scripts/dev-bootstrap.sh)"
    exit 1
elif [ $UNHEALTHY -eq 0 ]; then
    echo -e "${GREEN}✓ All services healthy ($HEALTHY/$TOTAL)${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some services are not healthy${NC}"
    echo "  Healthy: $HEALTHY/$TOTAL"
    echo "  Unhealthy: $UNHEALTHY/$TOTAL"
    exit 1
fi
