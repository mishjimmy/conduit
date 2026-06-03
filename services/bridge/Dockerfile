# syntax=docker/dockerfile:1
# Build context is the monorepo root: docker build -f services/bridge/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/services/bridge
# Runs via tsx (no compile step needed for a single long-lived worker).
CMD ["pnpm", "start"]
