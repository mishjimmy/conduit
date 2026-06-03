#!/usr/bin/env bash
# Expose the kiosk display over noVNC (reachable via Tailscale, embedded in the
# CMS screen detail page). x11vnc shares the running X display; websockify serves
# the noVNC web client on :6080.
set -euo pipefail

x11vnc -display :0 -forever -shared -nopw -quiet -rfbport 5900 &
exec websockify --web=/usr/share/novnc 6080 localhost:5900
