#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="${PROJECT_ROOT}/scripts/dev_bootstrap.sh"

if [[ ! -x "${SCRIPT_PATH}" ]]; then
  echo "Expected ${SCRIPT_PATH} to exist and be executable." >&2
  exit 1
fi

TEST_ARGS=(--fake-flag foo)
if ! output=$(DEV_BOOTSTRAP_TEST_MODE=1 "${SCRIPT_PATH}" "${TEST_ARGS[@]}" 2>&1); then
  echo "scripts/dev_bootstrap.sh failed in test mode" >&2
  exit 1
fi

if [[ "${output}" != *"dev_bootstrap"* ]]; then
  echo "Expected test-mode output to mention dev_bootstrap: ${output}" >&2
  exit 1
fi

if [[ "${output}" != *"--fake-flag foo"* ]]; then
  echo "Expected test-mode output to include forwarded args: ${output}" >&2
  exit 1
fi

echo "dev_bootstrap test passed"
