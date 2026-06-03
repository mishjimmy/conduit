# Conduit — Digital Signage Platform

Self-hosted, on-premises digital signage. A pnpm + Turborepo monorepo with two
Next.js 16 apps (CMS + player), backed by Appwrite, with MQTT (Mosquitto) as the
primary player↔CMS channel and HTTP polling as a fallback.

> Status: **M1 — pairing + comms spine.** Subsequent milestones (layouts, playlists,
> media, messages, groups, video, auto-update/remote-debug, deployment) are tracked in
> the build plan.

## Layout

```
apps/cms        Next.js 16 management UI (port 3000)
apps/player     Next.js 16 fullscreen kiosk display (port 3001)
packages/types  Shared zod schemas + MQTT topic/Appwrite channel helpers
packages/ui     Shared Tailwind v4 theme + components
services/bridge MQTT → Appwrite worker (ingests heartbeats → last_seen)
infra           docker-compose, Mosquitto, Caddy, go2rtc configs
appwrite.json   Appwrite database/collections/buckets (deploy via Appwrite CLI)
```

## Prerequisites

- Node 20+ (this repo is developed on Node 22).
- pnpm via Corepack: `corepack enable` (or invoke as `corepack pnpm …`).
- A self-hosted Appwrite instance.
- Docker (for Mosquitto / the rest of the stack).

## Setup

```sh
corepack pnpm install
cp .env.example .env          # then fill in Appwrite + MQTT values
```

Deploy the Appwrite schema (creates the `conduit` database, collections, buckets):

```sh
# Appwrite CLI — see https://appwrite.io/docs/tooling/command-line
appwrite login
appwrite push collections
appwrite push buckets
```

> `appwrite.json` uses the classic Databases (collections/documents) schema format.
> If your Appwrite CLI expects the newer TablesDB format, run `appwrite pull` once to
> reconcile.

Start the broker (and other infra):

```sh
docker compose -f infra/docker-compose.yml up -d mosquitto
```

Run everything in dev:

```sh
corepack pnpm dev                       # all apps via Turborepo
# or individually:
corepack pnpm --filter @conduit/player dev
corepack pnpm --filter @conduit/cms dev
corepack pnpm --filter @conduit/bridge dev
```

## M1 end-to-end check

1. Create an Appwrite user (CMS operator) and log in at http://localhost:3000/login.
2. Open the player at http://localhost:3001/?mac=AA:BB:CC:DD:EE:FF — it registers and
   shows a pairing code + QR.
3. In the CMS, go to **Pair a screen**, enter the code, assign a name/location, submit.
4. The player flips to the assigned view within ~1s (MQTT) — or ~30s via the polling
   fallback if the broker is down.
5. Confirm the bridge logs heartbeats and the screen's `last_seen` updates; the screens
   list shows it **online**.

## Verification commands

```sh
corepack pnpm -r typecheck
corepack pnpm --filter @conduit/types test
corepack pnpm build
```
