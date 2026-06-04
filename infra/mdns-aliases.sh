#!/usr/bin/env bash
# Publish extra mDNS names that resolve to this host (which avahi already
# advertises as <hostname>.local). Set the server hostname to `conduit` so it
# answers for conduit.local, then run this to also answer player.conduit.local.
#
# Run as a long-lived service (it holds the names while running):
#   sudo apt install avahi-utils
#   ./mdns-aliases.sh
set -euo pipefail

IP="$(hostname -I | awk '{print $1}')"
ALIASES=("player.conduit.local" "mqtt.conduit.local")

echo "Publishing mDNS aliases -> ${IP}"
for name in "${ALIASES[@]}"; do
  avahi-publish -a -R "${name}" "${IP}" &
done
wait
