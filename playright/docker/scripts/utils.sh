#!/usr/bin/env bash
set -euo pipefail

# Detect the Docker socket path dynamically
detect_docker_socket() {
  # 1. Check the active Docker context and strip the unix:// scheme prefix
  local ctx_socket
  ctx_socket=$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null | sed 's|^unix://||')
  if [ -S "${ctx_socket}" ]; then
    echo "${ctx_socket}" && return
  fi

  # 2. $DOCKER_HOST env var (Colima, Rancher Desktop, etc.)
  if [ -n "${DOCKER_HOST:-}" ]; then
    local env_socket="${DOCKER_HOST#unix://}"
    if [ -S "${env_socket}" ]; then
      echo "${env_socket}" && return
    fi
  fi

  # 3. Well Known list as final fallback
  local candidates=(
    "/var/run/docker.sock"
    "${HOME}/.docker/run/docker.sock"   # macOS Docker Desktop
    "/run/docker.sock"
    "/run/user/$(id -u)/docker.sock"    # rootless systemd user socket
  )
  for sock in "${candidates[@]}"; do
    [ -S "${sock}" ] && echo "${sock}" && return
  done

  echo "ERROR: Docker socket not found" >&2
  exit 1
}

# Detect the GID of a given socket path.
# Uses GNU stat (-c) first, BSD/macOS stat (-f) as fallback.
detect_docker_gid() {
  local sock="${1}"
  stat -c '%g' "${sock}" 2>/dev/null && return
  stat -f '%g' "${sock}" 2>/dev/null && return

  # Fallback: parse /etc/group
  local gid
  gid=$(grep '^docker:' /etc/group 2>/dev/null | cut -d: -f3)
  [ -n "${gid}" ] && echo "${gid}" && return

  echo "0"
}
