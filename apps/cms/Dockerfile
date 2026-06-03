# syntax=docker/dockerfile:1
# Build context is the monorepo root: docker build -f apps/cms/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# NEXT_PUBLIC_* are inlined at build time — pass them as build args.
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_DATABASE_ID
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_GO2RTC_URL
ARG NEXT_PUBLIC_NOVNC_URL_TEMPLATE
RUN pnpm --filter @conduit/cms build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone output is rooted at the monorepo (outputFileTracingRoot).
COPY --from=build /app/apps/cms/.next/standalone ./
COPY --from=build /app/apps/cms/.next/static ./apps/cms/.next/static
COPY --from=build /app/apps/cms/public ./apps/cms/public
EXPOSE 3000
CMD ["node", "apps/cms/server.js"]
