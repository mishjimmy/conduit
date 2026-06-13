# Conduit Player Device

Provisions a Linux thin client (**Debian 12 / x86-64** — e.g. an i5 mini PC) or a
Raspberry Pi into a Conduit player: boots into a Chromium kiosk that self-registers
by MAC, trusts the internal CA, joins Tailscale, auto-updates, and runs a noVNC
remote screen + a command agent.

The kiosk starts its own minimal X via `xinit` (no desktop/Wayland), so the same
setup works on any PC or Pi.

## Fastest path — provision a live device

1. **Flash Debian 12** (netinst/minimal is fine — no desktop needed). During setup
   create a user (e.g. `kiosk`) and enable SSH.
2. SSH in, then:
   ```sh
   sudo apt-get update && sudo apt-get install -y git
   git clone https://github.com/mishjimmy/conduit.git
   cd conduit/pi-image
   nano conduit-ca.crt          # paste the server's Caddy CA root (BEGIN/END CERTIFICATE)
   sudo KIOSK_USER=kiosk ./install.sh
   sudo nano /etc/conduit/conduit.conf   # set TAILSCALE_AUTHKEY; confirm URLs + MQTT_HOST
   sudo reboot
   ```
3. The box boots into the player, shows a pairing code, appears in Tailscale and in
   the CMS Screens list. Pair it and assign a playlist.

`install.sh` installs the packages, sets up non-root X (`Xwrapper`), trusts the CA,
installs `/opt/conduit/*` + the systemd units (as the kiosk user), adds a sudoers
rule so the agent can reboot/restart, and enables the services.

## Zero-touch — unattended installer USB

To skip the manual "create a user, SSH in, run install.sh" steps, build a
self-installing USB stick: see [`installer/`](installer/). It repacks a Debian
netinst ISO with a preseed that creates the `kiosk` user and runs `install.sh`
automatically, so the box installs and boots into the player with no keyboard.

## What runs (systemd)

| Unit | Role |
|---|---|
| `conduit-tailscale` | one-shot tailnet enrollment via the baked pre-auth key |
| `conduit-boot-update` | compares `/api/version` to the local version; restarts the kiosk if changed |
| `conduit-kiosk` | `xinit` → Chromium kiosk at `${CONDUIT_PLAYER_URL}/?mac=<MAC>` (watchdog: `Restart=always`) |
| `conduit-agent` | MQTT `screens/<id>/command` + broadcast → screenshot / reboot / update |
| `conduit-novnc` | `x11vnc` + `websockify` on `:6080` (reached over Tailscale, embedded in the CMS) |

## Config (`/etc/conduit/conduit.conf`)

- `CONDUIT_PLAYER_URL` / `CONDUIT_BASE_URL` — the Caddy-served URLs.
- `MQTT_HOST` / `MQTT_PORT` — broker for the agent (TCP, e.g. `conduit.local:1883`).
- `TAILSCALE_AUTHKEY` — baked pre-auth key for zero-touch enrollment.
- `CHROMIUM_BIN` — `chromium` (Debian) / `chromium-browser` (Pi OS, Ubuntu).

Everything keys off the device MAC, so the disk image is identical across devices.

## Replicating to a fleet

Once one device is verified, make it the golden image:
- Clone the disk to a `.img` (`dd if=/dev/sdX | gzip > conduit-player.img.gz`) and write
  it to the other thin clients, **or**
- script the same `install.sh` run via your provisioning tool (PXE/Ansible/Clonezilla).

The reusable Tailscale auth key + MAC-based registration mean each clone enrolls and
self-registers on first boot with no per-device edits.
