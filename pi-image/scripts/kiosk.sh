#!/usr/bin/env bash
# Launch Chromium in kiosk mode pointed at the player, with this device's MAC in
# the URL so it self-registers. Run by conduit-kiosk.service (Restart=always =
# the watchdog).
set -euo pipefail
source /etc/conduit/conduit.conf

MAC="$(/opt/conduit/device-info.sh | tr 'a-z' 'A-Z')"
URL="${CONDUIT_PLAYER_URL}/?mac=${MAC}"

# Wait for the player to be reachable before launching.
until curl -fsS --max-time 3 "${CONDUIT_PLAYER_URL}/api/version" >/dev/null 2>&1; do
  sleep 2
done

# Hide the cursor and disable screen blanking.
xset -dpms s off s noblank 2>/dev/null || true
unclutter -idle 0 &

exec "${CHROMIUM_BIN}" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --no-first-run \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --app="${URL}"
