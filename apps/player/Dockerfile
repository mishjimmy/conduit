# syntax=docker/dockerfile:1
# Build context is the monorepo root: docker build -f apps/player/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_DATABASE_ID
ARG NEXT_PUBLIC_MQTT_WS_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_PLAYER_VERSION
ARG NEXT_PUBLIC_OPENWEATHER_API_KEY
RUN pnpm --filter @conduit/player build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/apps/player/.next/standalone ./
COPY --from=build /app/apps/player/.next/static ./apps/player/.next/static
COPY --from=build /app/apps/player/public ./apps/player/public
EXPOSE 3001
CMD ["node", "apps/player/server.js"]
