#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEGACY_SCRIPT="${SCRIPT_DIR}/dev-bootstrap.sh"

if [[ ! -f "${LEGACY_SCRIPT}" ]]; then
  echo "[dev_bootstrap] Cannot find ${LEGACY_SCRIPT}" >&2
  exit 1
fi

if [[ "${DEV_BOOTSTRAP_TEST_MODE:-0}" == "1" ]]; then
  if [[ "$#" -gt 0 ]]; then
    printf -v FORWARDED_ARGS "%q " "$@"
  else
    FORWARDED_ARGS=""
  fi
  echo "[dev_bootstrap] test-mode: would exec ${LEGACY_SCRIPT} ${FORWARDED_ARGS}"
  exit 0
fi

exec "${LEGACY_SCRIPT}" "$@"
