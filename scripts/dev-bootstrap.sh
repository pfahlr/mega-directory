#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[dev-bootstrap] Missing required command '$1'." >&2
    exit 1
  fi
}

require_command npm
require_command "$PYTHON_BIN"

API_PORT="${API_PORT:-3001}"
ASTRO_PORT="${ASTRO_PORT:-3000}"
ADMIN_PORT="${ADMIN_PORT:-4000}"
CRAWLER_INTERVAL="${CRAWLER_INTERVAL:-45}"

DEFAULT_API_BASE_URL="http://localhost:${API_PORT}"
API_BASE_URL_VALUE="${API_BASE_URL:-$DEFAULT_API_BASE_URL}"
ADMIN_API_BASE_URL_VALUE="${ADMIN_API_BASE_URL:-$API_BASE_URL_VALUE}"
ADMIN_JWT_SECRET_VALUE="${ADMIN_JWT_SECRET:-local-dev-secret}"
ADMIN_LOGIN_EMAIL_VALUE="${ADMIN_LOGIN_EMAIL:-admin@example.com}"
ADMIN_LOGIN_PASSCODE_VALUE="${ADMIN_LOGIN_PASSCODE:-localpass}"
CRAWLER_TOKEN_VALUE="${CRAWLER_API_TOKEN:-${CRAWLER_BEARER_TOKEN:-crawler-dev-token}}"
CRAWLER_ENDPOINT_VALUE="${CRAWLER_API_ENDPOINT:-${API_BASE_URL_VALUE}/v1/crawler/listings}"
ADMIN_API_TOKEN_VALUE="${ADMIN_API_TOKEN:-admin-dev-token}"
DATABASE_URL_VALUE="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/mega_directory}"

declare -a PIDS=()
declare -a NAMES=()

stop_children() {
  for pid in "${PIDS[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait "${PIDS[@]:-}" >/dev/null 2>&1 || true
}

cleanup() {
  local exit_code=$?
  trap - EXIT
  stop_children
  exit "$exit_code"
}

on_signal() {
  echo
  echo "[dev-bootstrap] Caught signal, shutting down..."
  exit 0
}

trap cleanup EXIT
trap on_signal INT TERM

start_process() {
  local name="$1"
  local dir="$2"
  shift 2
  echo "[dev-bootstrap] starting ${name}"
  (
    cd "${ROOT_DIR}/${dir}"
    exec "$@"
  ) &
  PIDS+=("$!")
  NAMES+=("$name")
}

echo "[dev-bootstrap] Booting Mega Directory stack:"
echo "  API       -> http://localhost:${API_PORT}"
echo "  Astro     -> http://localhost:${ASTRO_PORT}"
echo "  Admin     -> http://localhost:${ADMIN_PORT}"
echo "  Crawler   -> posting to ${CRAWLER_ENDPOINT_VALUE}"
echo

start_process "api" "api" env \
  PORT="${API_PORT}" \
  NODE_ENV="development" \
  LOG_LEVEL="${LOG_LEVEL:-debug}" \
  DATABASE_URL="${DATABASE_URL_VALUE}" \
  ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET_VALUE}" \
  ADMIN_LOGIN_EMAIL="${ADMIN_LOGIN_EMAIL_VALUE}" \
  ADMIN_LOGIN_PASSCODE="${ADMIN_LOGIN_PASSCODE_VALUE}" \
  CRAWLER_BEARER_TOKEN="${CRAWLER_TOKEN_VALUE}" \
  ADMIN_TOKEN_TTL_SECONDS="${ADMIN_TOKEN_TTL_SECONDS:-900}" \
  npm run dev

start_process "astro" "astro" env \
  PORT="${ASTRO_PORT}" \
  NODE_ENV="development" \
  API_BASE_URL="${API_BASE_URL_VALUE}" \
  npm run dev

start_process "admin" "admin" env \
  PORT="${ADMIN_PORT}" \
  NODE_ENV="development" \
  API_BASE_URL="${API_BASE_URL_VALUE}" \
  ADMIN_API_BASE_URL="${ADMIN_API_BASE_URL_VALUE}" \
  ADMIN_API_TOKEN="${ADMIN_API_TOKEN_VALUE}" \
  npm run dev

if [[ "${SKIP_CRAWLER:-0}" != "1" ]]; then
  start_process "crawler" "." env \
    CRAWLER_API_ENDPOINT="${CRAWLER_ENDPOINT_VALUE}" \
    CRAWLER_API_TOKEN="${CRAWLER_TOKEN_VALUE}" \
    CRAWLER_BEARER_TOKEN="${CRAWLER_TOKEN_VALUE}" \
    "$PYTHON_BIN" agents/crawler/dev_runner.py \
    --interval "${CRAWLER_INTERVAL}"
else
  echo "[dev-bootstrap] SKIP_CRAWLER=1 detected; not starting the crawler demo."
fi

echo "[dev-bootstrap] All services are starting. Press Ctrl+C to stop."
echo

if [[ "${BASH_VERSINFO[0]}" -ge 5 || ( "${BASH_VERSINFO[0]}" -eq 4 && "${BASH_VERSINFO[1]}" -ge 3 ) ]]; then
  while true; do
    if ! wait -n; then
      break
    fi
  done
else
  wait
fi
