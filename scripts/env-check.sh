#!/usr/bin/env bash
# Environment Configuration Health Check
# Validates all required environment variables and connectivity
# Usage: ./scripts/env-check.sh [--strict]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STRICT_MODE=false
ERRORS=0
WARNINGS=0
CHECKS_PASSED=0

# Parse arguments
for arg in "$@"; do
  case $arg in
    --strict)
      STRICT_MODE=true
      shift
      ;;
  esac
done

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}  Environment Configuration Check${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Helper functions
check_passed() {
  echo -e "${GREEN}✓${NC} $1"
  ((CHECKS_PASSED++))
}

check_failed() {
  echo -e "${RED}✗${NC} $1"
  ((ERRORS++))
}

check_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

check_var() {
  local var_name=$1
  local var_value="${!var_name}"
  local is_required=${2:-true}
  local description=${3:-""}

  if [ -n "$var_value" ]; then
    if [ -n "$description" ]; then
      check_passed "$var_name is set ($description)"
    else
      check_passed "$var_name is set"
    fi
    return 0
  else
    if [ "$is_required" = true ] || [ "$STRICT_MODE" = true ]; then
      check_failed "$var_name is not set${description:+ ($description)}"
      return 1
    else
      check_warning "$var_name is not set (optional)${description:+ ($description)}"
      return 0
    fi
  fi
}

check_url_reachable() {
  local url=$1
  local description=$2

  if command -v curl &> /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" | grep -q "^[2-5]"; then
      check_passed "$description is reachable ($url)"
      return 0
    else
      check_failed "$description is not reachable ($url)"
      return 1
    fi
  else
    check_warning "curl not available, skipping connectivity check for $description"
    return 0
  fi
}

# Load .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo -e "${BLUE}Loading .env file...${NC}"
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  check_passed "Loaded .env file"
  echo ""
else
  check_warning "No .env file found at $PROJECT_ROOT/.env"
  echo ""
fi

# Check Node.js environment
echo -e "${BLUE}Node.js Environment:${NC}"
check_var "NODE_ENV" false "development/production/test"
if [ -n "$NODE_ENV" ]; then
  case "$NODE_ENV" in
    development|production|test)
      check_passed "NODE_ENV has valid value: $NODE_ENV"
      ;;
    *)
      check_warning "NODE_ENV has unexpected value: $NODE_ENV"
      ;;
  esac
fi
echo ""

# Check Database Configuration
echo -e "${BLUE}Database Configuration:${NC}"
check_var "DATABASE_URL" true "PostgreSQL connection string"
if [ -n "$DATABASE_URL" ]; then
  # Try to parse and validate database URL
  if [[ "$DATABASE_URL" =~ postgresql:// ]]; then
    check_passed "DATABASE_URL has correct protocol (postgresql://)"
  else
    check_failed "DATABASE_URL does not use postgresql:// protocol"
  fi
fi
echo ""

# Check Redis Configuration
echo -e "${BLUE}Cache Configuration:${NC}"
check_var "REDIS_URL" false "Redis connection string (optional if caching disabled)"
check_var "REDIS_ENABLED" false "true/false (defaults to false)"
echo ""

# Check API Configuration
echo -e "${BLUE}API Configuration:${NC}"
check_var "PORT" false "API server port (defaults to 3030)"
check_var "API_BASE_URL" false "Full API base URL for external access"
check_var "PUBLIC_API_BASE_URL" true "API URL for public frontend"
check_var "ADMIN_API_BASE_URL" true "API URL for admin interface"
echo ""

# Check Authentication Tokens
echo -e "${BLUE}Authentication Tokens:${NC}"
check_var "JWT_SECRET" true "Secret for JWT token signing"
check_var "ADMIN_JWT_SECRET" false "Separate secret for admin tokens (optional)"
check_var "CRAWLER_BEARER_TOKEN" true "Bearer token for crawler authentication"
check_var "SESSION_SECRET" false "Secret for session management"
echo ""

# Check External Services (Optional)
echo -e "${BLUE}External Services (Optional):${NC}"
check_var "GOOGLE_MAPS_API_KEY" false "For geocoding service (Task 100)"
check_var "OPENAI_API_KEY" false "For LLM enrichment (Task 101)"
check_var "SENDGRID_API_KEY" false "For email notifications"
check_var "SENTRY_DSN" false "For error tracking"
echo ""

# Check SOPS Configuration (if using encrypted secrets)
echo -e "${BLUE}SOPS Configuration (if applicable):${NC}"
if command -v sops &> /dev/null; then
  check_passed "SOPS is installed"
  check_var "SOPS_AGE_KEY_FILE" false "Path to age key file"
else
  check_warning "SOPS not installed (only needed if using encrypted secrets)"
fi
echo ""

# Connectivity Checks (only if URLs are set)
echo -e "${BLUE}Connectivity Checks:${NC}"
if [ -n "$DATABASE_URL" ]; then
  # Extract host and port from DATABASE_URL
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')

  if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    if command -v nc &> /dev/null || command -v netcat &> /dev/null; then
      if timeout 5 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
        check_passed "Database is reachable ($DB_HOST:$DB_PORT)"
      else
        check_failed "Database is not reachable ($DB_HOST:$DB_PORT)"
      fi
    else
      check_warning "nc/netcat not available, skipping database connectivity check"
    fi
  fi
fi

if [ -n "$REDIS_URL" ] && [ "$REDIS_ENABLED" = "true" ]; then
  REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's|redis://\([^:/]*\).*|\1|p')
  REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's|.*:\([0-9]*\)$|\1|p')

  if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    if timeout 5 bash -c "echo > /dev/tcp/$REDIS_HOST/$REDIS_PORT" 2>/dev/null; then
      check_passed "Redis is reachable ($REDIS_HOST:$REDIS_PORT)"
    else
      check_warning "Redis is not reachable ($REDIS_HOST:$REDIS_PORT)"
    fi
  fi
fi

# Check API endpoints if URLs are set
if [ -n "$PUBLIC_API_BASE_URL" ]; then
  check_url_reachable "$PUBLIC_API_BASE_URL/health" "Public API"
fi

if [ -n "$ADMIN_API_BASE_URL" ]; then
  check_url_reachable "$ADMIN_API_BASE_URL/health" "Admin API"
fi
echo ""

# Summary
echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}==================================${NC}"
echo -e "${GREEN}✓ Passed:${NC} $CHECKS_PASSED"
if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
fi
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}✗ Errors:${NC} $ERRORS"
fi
echo ""

# Exit code
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Environment configuration has errors. Please fix them before running the application.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ] && [ "$STRICT_MODE" = true ]; then
  echo -e "${YELLOW}Strict mode enabled: Warnings are treated as errors.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}Environment configuration has warnings. Application may run with limited functionality.${NC}"
  exit 0
else
  echo -e "${GREEN}✓ All checks passed! Environment is properly configured.${NC}"
  exit 0
fi
