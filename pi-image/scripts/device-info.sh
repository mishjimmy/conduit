#!/usr/bin/env bash
# Print this device's primary MAC address (used to build the kiosk URL and to
# resolve the screen id). This is the on-device "/api/device-info" equivalent.
set -euo pipefail

iface="$(ip route show default 2>/dev/null | awk '/default/ {print $5; exit}')"
[ -z "${iface:-}" ] && iface="eth0"
cat "/sys/class/net/${iface}/address"
