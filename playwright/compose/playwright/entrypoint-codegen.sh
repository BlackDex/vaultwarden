#!/usr/bin/env bash
# Entrypoint for the PlaywrightCodegen Docker service.
# Boots a virtual desktop (TigerVNC) + noVNC web proxy, then runs playwright.
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
VNC_PORT="${VNC_PORT:-5900}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
SCREEN_RES="${SCREEN_RES:-1920x1080}"
DISPLAY_NUM="${DISPLAY#:}"   # strip the leading ':'  →  "99"

# ── 0. Clean up stale X lock files (leftover from killed containers) ──────────
rm -f "/tmp/.X${DISPLAY_NUM}-lock"        2>/dev/null || true
rm -f "/tmp/.X11-unix/X${DISPLAY_NUM}"    2>/dev/null || true
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# ── 1. Start TigerVNC (Xvnc = X11 server + VNC server in one process) ────────
echo "==> [1/4] Starting Xvnc on ${DISPLAY} (${SCREEN_RES}), VNC port ${VNC_PORT}..."
Xvnc "${DISPLAY}" \
    -rfbport    "${VNC_PORT}"  \
    -geometry   "${SCREEN_RES}" \
    -depth      24              \
    -SecurityTypes None         \
    -nolisten   tcp             \
    &
XVNC_PID=$!

# Poll until the display is up (max ~5 s) so we don't race with fluxbox
for i in {1..10}; do
    DISPLAY="${DISPLAY}" xdpyinfo &>/dev/null 2>&1 && break || true
    sleep 0.5
done

# ── 2. Start window manager ───────────────────────────────────────────────────
echo "==> [2/4] Starting Fluxbox window manager..."
DISPLAY="${DISPLAY}" fluxbox &>/dev/null &
sleep 0.3

# ── 3. Start noVNC websocket proxy ────────────────────────────────────────────
# websockify ships with novnc (via python3-websockify dependency)
# --web:       serve the noVNC static HTML/JS from this directory
# --wrap-mode: don't crash if the VNC side closes temporarily
echo "==> [3/4] Starting noVNC on port ${NOVNC_PORT}..."
websockify \
    --web=/usr/share/novnc/ \
    --wrap-mode=ignore       \
    "${NOVNC_PORT}"          \
    "127.0.0.1:${VNC_PORT}"  \
    &>/dev/null &
sleep 0.3

# ── 4. Print connection info and exec playwright ──────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🎭  Playwright Codegen  ·  Remote Desktop ready             ║"
echo "║                                                              ║"
echo "║  Open in your browser:                                       ║"
printf "║  ➜  http://localhost:%-39s║\n" "${NOVNC_PORT}/vnc.html"
echo "║                                                              ║"
echo "║  Interact with the browser to record actions.                ║"
echo "║  Use --output /project/playwright/tests/<name>.spec.ts       ║"
echo "║  to save generated code directly into the repo.              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# All arguments passed to `docker compose run` are forwarded to playwright.
# The default CMD is ["codegen"] so bare `run --rm PlaywrightCodegen` works.
exec /usr/local/bin/npx playwright "$@"
