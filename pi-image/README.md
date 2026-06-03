# Conduit Player Image (CustomPiOS)

Builds a Raspberry Pi OS image that boots straight into the Conduit player in a
Chromium kiosk, self-registers via its MAC, auto-updates, enrolls in Tailscale,
and exposes a noVNC remote screen + a command agent.

## What gets installed

Packages (apt): `chromium-browser unclutter scrot x11vnc novnc websockify
mosquitto-clients curl ca-certificates libnss3-tools tailscale`.

Files:

| Source | Destination | Purpose |
|---|---|---|
| `config` | `/etc/conduit/conduit.conf` | per-device config (URLs, MQTT host, Tailscale key) |
| `scripts/*.sh` | `/opt/conduit/` | device-info, kiosk, boot-update, agent, novnc, ca-install |
| `systemd/*.service` | `/etc/systemd/system/` | kiosk (watchdog), boot-update, agent, novnc, tailscale |
| Caddy CA root | `/etc/conduit/conduit-ca.crt` | trusted so `https://player.conduit.local` is valid |

Enable the services:

```sh
systemctl enable conduit-boot-update conduit-kiosk conduit-agent conduit-novnc conduit-tailscale
```

## Baking (CustomPiOS module sketch)

1. Create a CustomPiOS module `conduit` and copy `config`, `scripts/`, and
   `systemd/` into the image (`/etc/conduit`, `/opt/conduit`, `/etc/systemd/system`).
2. In the module's `start_chroot_script`: `apt-get install` the packages above,
   `chmod +x /opt/conduit/*.sh`, run `/opt/conduit/ca-install.sh`, and
   `systemctl enable` the units.
3. Bake the **Tailscale pre-auth key** into `/etc/conduit/conduit.conf`
   (`TAILSCALE_AUTHKEY=...`) and the **Caddy CA root** into
   `/etc/conduit/conduit-ca.crt` (copy from the server's
   `/data/caddy/pki/authorities/local/root.crt`).
4. Set the device's Chromium/X autologin so `graphical.target` reaches the
   kiosk service.

## Boot flow

```
power on
 └─ tailscaled + conduit-tailscale.service   → join the tailnet (pre-auth key)
 └─ conduit-boot-update.service              → GET /api/version; restart kiosk if changed
 └─ conduit-kiosk.service (Restart=always)   → Chromium kiosk → player.conduit.local/?mac=<MAC>
 └─ conduit-agent.service                    → MQTT screens/<id>/command + broadcast
 └─ conduit-novnc.service                    → x11vnc + websockify on :6080
```

The player self-registers with its MAC and shows the pairing code; an operator
pairs it in the CMS and assigns a playlist. Updates land on next reboot
(`boot-update`) or instantly via the CMS **Push update** command (the agent /
browser reload). **Reboot** and **Screenshot** commands are handled by the agent
(`scrot` → upload to `/api/screens/screenshot`).

## Per-device override

Everything keys off the MAC, so the image is identical across devices. To point a
device at a different server or broker, edit `/etc/conduit/conduit.conf` on the
boot partition.
