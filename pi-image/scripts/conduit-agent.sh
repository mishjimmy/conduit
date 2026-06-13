#!/usr/bin/env bash
# Device-side command agent. Resolves this device's screen id, then subscribes to
# its MQTT command topic (and broadcast) and handles the OS-level commands the
# browser can't: screenshot capture/upload, reboot, and update.
set -euo pipefail
source /etc/conduit/conduit.conf

MAC="$(/opt/conduit/device-info.sh | tr 'a-z' 'A-Z')"

# Resolve our screen id (init is idempotent and returns it for our MAC).
SCREEN_ID="$(curl -fsS -X POST "${CONDUIT_PLAYER_URL}/api/screens/init" \
  -H 'content-type: application/json' -d "{\"mac\":\"${MAC}\"}" \
  | sed -n 's/.*"screenId"[: ]*"\([^"]*\)".*/\1/p')"

if [ -z "${SCREEN_ID:-}" ]; then
  echo "could not resolve screen id yet; will retry on restart"
  exit 1
fi
echo "conduit-agent: screen ${SCREEN_ID}"

capture_and_upload() {
  local f="/tmp/conduit-shot.png"
  DISPLAY=:0 scrot -o "$f" 2>/dev/null || grim "$f" 2>/dev/null || return 0
  curl -fsS -X POST "${CONDUIT_PLAYER_URL}/api/screens/screenshot" \
    -F "screenId=${SCREEN_ID}" -F "file=@${f};type=image/png" || true
}

mosquitto_sub -h "${MQTT_HOST}" -p "${MQTT_PORT}" \
  -t "screens/${SCREEN_ID}/command" -t "screens/broadcast" \
  | while read -r line; do
      action="$(echo "$line" | sed -n 's/.*"action"[: ]*"\([^"]*\)".*/\1/p')"
      case "$action" in
        screenshot) capture_and_upload ;;
        reboot) sudo systemctl reboot ;;
        update | reload) sudo systemctl restart conduit-kiosk.service ;;
        *) : ;; # ignore non-command payloads (e.g. broadcast messages)
      esac
    done
