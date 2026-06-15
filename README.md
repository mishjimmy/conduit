# Conduit — Digital Signage Platform

Self-hosted, on-premises digital signage. A pnpm + Turborepo monorepo with two
Next.js 16 apps (CMS + player), backed by Appwrite, with **MQTT (Mosquitto)** as the
primary player↔CMS channel and **HTTP polling** as a graceful fallback.

> Status: **feature-complete (M1–M9).** Core CMS/player features are verified live
> against a real Appwrite + broker. Hardware-dependent paths — FFmpeg camera
> compositing and the Pi-side agent (screenshot/reboot/noVNC/Tailscale) — are built
> and await real gear to exercise end-to-end.

## Features

- **Screens & pairing** — devices self-register by MAC and show a QR + human code; an
  operator pairs them in the CMS. Human-readable screen ids (`brave-otter`).
- **Layouts** — percentage-positioned zones on a 1920×1080 canvas: slideshow, video,
  camera-grid, pip, graphic, message, weather, clock, embed. Live builder + preview.
- **Playlists** — ordered layouts with per-entry duration and transitions (hard cut /
  fade-to-black / crossfade); the player runs them **locally** and **offline-first**.
- **Media library** — upload to Appwrite Storage, browse/assign; player pre-fetches +
  caches media for offline playback.
- **Messages** — push text overlays per-screen / per-group / broadcast, with schedule,
  auto-dismiss, and a full-screen **emergency broadcast**.
- **Screen groups** — bulk playlist assignment and group-targeted messaging.
- **Video** — go2rtc RTSP→HLS, FFmpeg `xstack`/overlay compositing; player plays HLS
  via hls.js.
- **Fleet ops** — heartbeats/online status, auto-update (boot + push), noVNC remote
  screen, and a screenshot command.

## Layout

```
apps/cms         Next.js 16 management UI (port 3000)
apps/player      Next.js 16 fullscreen kiosk display (port 3001)
packages/types   Shared zod schemas + MQTT topic/Appwrite channel helpers
packages/ui      Shared Tailwind v4 theme, components, and the LayoutRenderer
services/bridge  MQTT → Appwrite worker (ingests heartbeats → last_seen)
infra            docker-compose, Mosquitto, Caddy, go2rtc configs
pi-image         CustomPiOS config, scripts, and systemd units for the kiosk
appwrite.json    Appwrite database/collections/buckets (deploy via Appwrite CLI)
```

## Prerequisites

- Node 20+ (developed on Node 22).
- pnpm via Corepack: `corepack enable` (on Windows it may need admin — otherwise just
  prefix commands with `corepack `, e.g. `corepack pnpm install`).
- A self-hosted **Appwrite** instance.
- **Mosquitto** reachable on the LAN with **both** an MQTT listener (`1883`) and a
  **WebSocket** listener (`9001`) — the player browser connects over WebSocket.
- Docker (for the broker / full stack).

## Setup

```sh
corepack pnpm install
cp .env.example .env.local      # dev; fill in Appwrite + MQTT values
```

Key `.env.local` values (a single root file feeds all apps + the bridge):

```ini
APPWRITE_ENDPOINT=https://<appwrite-host>/v1
APPWRITE_PROJECT_ID=<project id>
APPWRITE_API_KEY=<server key, Databases scope>
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://<appwrite-host>/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<project id>
NEXT_PUBLIC_APPWRITE_DATABASE_ID=conduit
MQTT_URL=mqtt://<broker-host>:1883
NEXT_PUBLIC_MQTT_WS_URL=ws://<broker-host>:9001
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Deploy the Appwrite schema

`appwrite.json` uses the **classic Databases** schema format with database id
`conduit`. Newer Appwrite CLIs read `appwrite.config.json`, so copy it first:

```sh
appwrite client --endpoint https://<appwrite-host>/v1 --project-id <id> --key <key>
cp appwrite.json appwrite.config.json        # PowerShell: Copy-Item appwrite.json appwrite.config.json -Force
appwrite push collections --all --force
appwrite push buckets --all --force
```

In the Appwrite console also: add a **Web platform** for `localhost` (so the CMS
browser SDK/Realtime aren't CORS-blocked), and create an **email/password user** for
CMS login.

> Notes: the `media` and `screenshots` buckets are public-read for the player/CMS to
> display assets without a session. For videos over 30 MB, raise `_APP_STORAGE_LIMIT`
> on the Appwrite server and bump `maximumFileSize` in `appwrite.json`.

### Run in dev

```sh
docker compose up -d mosquitto                              # if running the broker here
corepack pnpm dev                                            # all apps via Turborepo
# or individually:
corepack pnpm --filter @conduit/bridge dev   # expect: "connected; subscribing to heartbeats"
corepack pnpm --filter @conduit/player dev   # http://localhost:3001
corepack pnpm --filter @conduit/cms dev      # http://localhost:3000
```

## Quick end-to-end check

1. Log in at http://localhost:3000/login.
2. Open the player at http://localhost:3001/?mac=AA:BB:CC:DD:EE:FF — it shows a pairing
   code + QR.
3. CMS → **Pair a screen** → enter the code, set name/location → it flips to assigned
   (~1s over MQTT, ~30s via polling fallback). The screens list shows it **online**.
4. **Layouts** → build a layout (clock, media, etc.). **Playlists** → add layouts with
   transitions. **Screens** → assign the playlist → the player rotates it.
5. **Messages** → send/broadcast an overlay. **Groups** → bulk-assign. **Streams** →
   add cameras + download `go2rtc.yml`. **Screen detail** → reload/screenshot/noVNC.

## Verification commands

```sh
corepack pnpm -r typecheck
corepack pnpm --filter @conduit/types test
corepack pnpm build
```

## Production deployment (Docker Compose)

Everything except Appwrite runs from the repo-root [docker-compose.yml](docker-compose.yml).
On the server, clone the repo (first time) or pull the latest (updates), create a
`.env`, then build + run:

```sh
# First time:
git clone <repo-url> conduit && cd conduit
# Updating an existing checkout:
git pull

cp .env.example .env     # fill in Appwrite endpoint/ids + the two API keys
docker compose up -d --build   # root .env is auto-discovered — no --env-file
make ca                  # extract Caddy's CA root (conduit-ca.crt) for devices
```

Brings up **cms** + **player** (Next standalone images), **bridge**, **mosquitto**,
**go2rtc**, and **caddy** (internal-CA TLS for `conduit.local` / `player.conduit.local`).
Stable `conduit.local` URLs and internal service URLs default inside the Compose file,
so `.env` only carries the Appwrite coordinates + API keys. `NEXT_PUBLIC_*` are inlined
at image build time and wired as Compose build args.

- **mDNS:** set the server hostname to `conduit` (Avahi answers `conduit.local`) and run
  [infra/mdns-aliases.sh](infra/mdns-aliases.sh) for `player.conduit.local`.
- **TLS trust:** `make ca` writes Caddy's internal CA root to `conduit-ca.crt`; trust it
  on operator machines + bake it into the Pi image.
- **Remote access:** install Tailscale on the server and every Pi.

## Device image (Raspberry Pi)

Built with CustomPiOS — kiosk Chromium under a systemd watchdog, baked Tailscale
pre-auth key + CA cert, boot-time auto-update, a noVNC remote screen, and an MQTT
command agent (screenshot/reboot/update). See [pi-image/README.md](pi-image/README.md).
