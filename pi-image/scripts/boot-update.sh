#!/usr/bin/env bash
# Boot-time auto-update. Compares the server's player version to the locally
# stored one; if it changed, records it and restarts the kiosk so Chromium loads
# the new bundle. (The player is served centrally, so "pulling" = a fresh load.)
set -euo pipefail
source /etc/conduit/conduit.conf

STORE="/var/lib/conduit/version"
mkdir -p "$(dirname "$STORE")"

remote="$(curl -fsS --max-time 10 "${CONDUIT_PLAYER_URL}/api/version" \
  | sed -n 's/.*"version"[: ]*"\([^"]*\)".*/\1/p')" || remote=""
local="$(cat "$STORE" 2>/dev/null || echo "")"

if [ -n "$remote" ] && [ "$remote" != "$local" ]; then
  echo "Updating player: '${local}' -> '${remote}'"
  echo "$remote" > "$STORE"
  systemctl restart conduit-kiosk.service || true
fi
