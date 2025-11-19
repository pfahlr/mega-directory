#!/usr/bin/env bash

# Mega Directory Dependency Checker
# Validates that all required tools are installed

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "🔍 Checking dependencies..."
echo

# Required dependencies
check_required() {
    local cmd=$1
    local name=$2
    local min_version=$3

    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$($cmd --version 2>&1 | head -n1 || echo "unknown")
        echo -e "${GREEN}✓${NC} $name: $version"
        return 0
    else
        echo -e "${RED}✗${NC} $name: NOT FOUND"
        echo "   Install: $4"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Optional dependencies
check_optional() {
    local cmd=$1
    local name=$2
    local purpose=$3

    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$($cmd --version 2>&1 | head -n1 || echo "unknown")
        echo -e "${GREEN}✓${NC} $name: $version"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $name: NOT FOUND (optional)"
        echo "   Purpose: $purpose"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

echo "Required Dependencies:"
echo "---------------------"
check_required "node" "Node.js" "18" "https://nodejs.org/"
check_required "npm" "npm" "8" "comes with Node.js"
check_required "python3" "Python" "3.10" "https://python.org/"
check_required "git" "Git" "2.30" "https://git-scm.com/"

echo
echo "Optional Dependencies:"
echo "---------------------"
check_optional "docker" "Docker" "for containerized deployment"
check_optional "psql" "PostgreSQL Client" "for database management"
check_optional "sops" "SOPS" "for encrypted secrets management"
check_optional "jq" "jq" "for JSON processing in scripts"

echo
echo "Node.js Dependencies:"
echo "---------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found"
    echo "   Run: npm install"
    WARNINGS=$((WARNINGS + 1))
fi

echo
echo "Python Dependencies:"
echo "---------------------"
if python3 -c "import requests, bs4, jinja2" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Python packages installed"
else
    echo -e "${YELLOW}⚠${NC} Some Python packages missing"
    echo "   Run: pip install -r apps/crawler/requirements-dev.txt"
    WARNINGS=$((WARNINGS + 1))
fi

echo
echo "Database:"
echo "---------"
if [ -n "${DATABASE_URL:-}" ]; then
    echo -e "${GREEN}✓${NC} DATABASE_URL is set"

    # Try to connect if psql is available
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Database connection successful"
        else
            echo -e "${YELLOW}⚠${NC} Database connection failed"
            echo "   Make sure PostgreSQL is running"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
else
    # Check for individual DB variables
    if [ -n "${DB_HOST:-}" ] && [ -n "${DB_PORT:-}" ]; then
        echo -e "${YELLOW}⚠${NC} DATABASE_URL not set, using DB_* variables"
    else
        echo -e "${YELLOW}⚠${NC} DATABASE_URL not set"
        echo "   Will use defaults: postgresql://postgres:password@localhost:5432/mega_directory"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check if PostgreSQL is running
if command -v pg_isready >/dev/null 2>&1; then
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"

    if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL is running at $DB_HOST:$DB_PORT"
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL not reachable at $DB_HOST:$DB_PORT"
        echo "   Start PostgreSQL or use Docker: docker compose up -d db"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo
echo "Port Availability:"
echo "------------------"
check_port() {
    local port=$1
    local service=$2

    if command -v lsof >/dev/null 2>&1; then
        if lsof -i ":$port" >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC} Port $port ($service) is already in use"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "${GREEN}✓${NC} Port $port ($service) is available"
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tuln | grep -q ":$port "; then
            echo -e "${YELLOW}⚠${NC} Port $port ($service) is already in use"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "${GREEN}✓${NC} Port $port ($service) is available"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Cannot check port $port (lsof/ss not available)"
    fi
}

API_PORT="${API_PORT:-3030}"
ASTRO_PORT="${ASTRO_PORT:-3000}"
ADMIN_PORT="${ADMIN_PORT:-4000}"
DB_PORT="${DB_PORT:-5432}"

check_port "$API_PORT" "API"
check_port "$ASTRO_PORT" "Web"
check_port "$ADMIN_PORT" "Admin"
check_port "$DB_PORT" "Database"

echo
echo "Summary:"
echo "--------"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "  You can proceed, but some features may not work"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo "  Please install missing required dependencies"
    exit 1
fi
