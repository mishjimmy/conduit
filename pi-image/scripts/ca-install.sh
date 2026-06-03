#!/usr/bin/env bash
# Trust Caddy's internal CA root so https://player.conduit.local is valid for the
# system and for Chromium (NSS). Place the CA root at /etc/conduit/conduit-ca.crt
# (baked into the image from Caddy's /data/caddy/pki/authorities/local/root.crt).
set -euo pipefail

CA="/etc/conduit/conduit-ca.crt"
[ -f "$CA" ] || { echo "missing $CA"; exit 1; }

# System trust store
cp "$CA" /usr/local/share/ca-certificates/conduit-ca.crt
update-ca-certificates

# Chromium / NSS trust store for the kiosk user
USER_HOME="$(getent passwd "${KIOSK_USER:-pi}" | cut -d: -f6)"
mkdir -p "${USER_HOME}/.pki/nssdb"
certutil -d "sql:${USER_HOME}/.pki/nssdb" -A -t "C,," -n "Conduit CA" -i "$CA" || true
echo "Conduit CA installed."
