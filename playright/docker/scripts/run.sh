#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="${SCRIPT_DIR}/.."
DB="${1:-sqlite}"
SSO="${SSO:-false}"
UI="${UI:-false}"

case "$DB" in
  sqlite|mariadb|mysql|postgres) ;;
  *) echo "Usage: $0 [sqlite|mariadb|mysql|postgres]" && exit 1 ;;
esac

UP_ARGS="--abort-on-container-exit --exit-code-from playwright"

OVERLAYS="-f compose.yml -f compose.${DB}.yml"
[ "${SSO}" = "true" ] && OVERLAYS="${OVERLAYS} -f compose.dex.yml"
[ "${UI}" = "true" ] && OVERLAYS="${OVERLAYS} -f compose.ui.yml"
[ "${UI}" = "true" ] && UP_ARGS=""

cd "${COMPOSE_DIR}"

[ "${UI}" = "true" ] && echo "▶ Starting stack with Playwright UI (DB: $DB, SSO: $SSO)"
[ "${UI}" = "true" ] && echo "▶ Open http://localhost:8181 in your browser once the stack is ready"
[ "${UI}" = "true" ] && echo ""

# Bring up everything
# Don't use --abort-on-container-exit here since playwright is now interactive
# shellcheck disable=SC2086
docker compose ${OVERLAYS} up --build ${UP_ARGS}

# Cleanup on Ctrl+C / exit
# shellcheck disable=SC2086
docker compose ${OVERLAYS} down -v --remove-orphans
