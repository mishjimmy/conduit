#!/usr/bin/env bash
# Provision a Linux thin client (Debian 12 / x86-64) — or a Raspberry Pi — as a
# Conduit player. Run as root, from the repo's pi-image/ directory:
#   sudo KIOSK_USER=youruser ./install.sh
#
# Drop the server's CA root in here as `conduit-ca.crt` first so the kiosk trusts
# https://*.conduit.local.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
KIOSK_USER="${KIOSK_USER:-kiosk}"
id "$KIOSK_USER" >/dev/null 2>&1 || { echo "user '$KIOSK_USER' does not exist"; exit 1; }
HOME_DIR="$(getent passwd "$KIOSK_USER" | cut -d: -f6)"
# IP of the Conduit server (Caddy host). Needed because nss-mdns only resolves
# single-label .local names, not the multi-label player./mqtt. ones we use:
#   sudo SERVER_IP=10.0.0.26 KIOSK_USER=kiosk ./install.sh
SERVER_IP="${SERVER_IP:-}"

echo "==> Installing packages"
apt-get update
apt-get install -y --no-install-recommends \
  chromium xserver-xorg xinit x11-xserver-utils unclutter \
  scrot x11vnc novnc websockify \
  mosquitto-clients curl ca-certificates libnss3-tools \
  avahi-daemon libnss-mdns sudo

echo "==> Ensuring mDNS (.local) name resolution"
grep -q 'mdns4_minimal' /etc/nsswitch.conf \
  || sed -i 's/^hosts:.*/hosts: files mdns4_minimal [NOTFOUND=return] dns/' /etc/nsswitch.conf
systemctl enable --now avahi-daemon

echo "==> Pinning the server's .local names to its IP"
# nss-mdns resolves conduit.local (single label) but NOT player./mqtt.conduit.local
# (multi-label), which Chromium + the agent need. Map all three to SERVER_IP via
# /etc/hosts (files is consulted before mDNS). Idempotent: the marker line is
# rewritten on every run.
if [ -n "$SERVER_IP" ]; then
  sed -i '/ # conduit-server$/d' /etc/hosts
  echo "$SERVER_IP conduit.local player.conduit.local mqtt.conduit.local # conduit-server" >> /etc/hosts
else
  echo "   WARN: SERVER_IP not set — player.conduit.local / mqtt.conduit.local won't"
  echo "         resolve (mDNS can't do multi-label .local). Re-run with SERVER_IP=<ip>"
  echo "         or add the line manually to /etc/hosts."
fi

echo "==> Installing Tailscale"
command -v tailscale >/dev/null 2>&1 || curl -fsSL https://tailscale.com/install.sh | sh

echo "==> Allowing non-root X + kiosk user groups"
printf 'allowed_users=anybody\nneeds_root_rights=yes\n' > /etc/X11/Xwrapper.config
usermod -aG tty,video,input "$KIOSK_USER"

echo "==> Installing scripts to /opt/conduit"
install -d /opt/conduit
install -m 0755 "$HERE"/scripts/*.sh /opt/conduit/

echo "==> Installing config to /etc/conduit"
install -d /etc/conduit
[ -f /etc/conduit/conduit.conf ] || install -m 0644 "$HERE/config" /etc/conduit/conduit.conf

echo "==> Trusting the Conduit CA"
if [ -f "$HERE/conduit-ca.crt" ]; then
  install -m 0644 "$HERE/conduit-ca.crt" /etc/conduit/conduit-ca.crt
  KIOSK_USER="$KIOSK_USER" /opt/conduit/ca-install.sh
else
  echo "   WARN: $HERE/conduit-ca.crt not found — https://*.conduit.local won't be trusted."
fi

echo "==> Installing systemd units (as user ${KIOSK_USER})"
for unit in "$HERE"/systemd/*.service; do
  sed "s/^User=pi$/User=${KIOSK_USER}/" "$unit" > "/etc/systemd/system/$(basename "$unit")"
done

echo "==> Allowing the agent to reboot / restart the kiosk via sudo"
cat > /etc/sudoers.d/conduit <<EOF
${KIOSK_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl reboot, /usr/bin/systemctl restart conduit-kiosk.service
EOF
chmod 0440 /etc/sudoers.d/conduit

systemctl daemon-reload
systemctl set-default multi-user.target
systemctl enable conduit-boot-update conduit-kiosk conduit-agent conduit-novnc conduit-tailscale

cat <<EOF

==> Done.
   1. Edit /etc/conduit/conduit.conf  (set TAILSCALE_AUTHKEY; confirm CONDUIT_PLAYER_URL
      and MQTT_HOST=conduit.local). CHROMIUM_BIN is "chromium" on Debian.
   2. Reboot. The box starts X + Chromium kiosk, joins the tailnet, self-registers,
      and shows the pairing code.
EOF
