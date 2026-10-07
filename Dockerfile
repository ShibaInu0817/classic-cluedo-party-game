# One container: the game server, which also serves the built client and the theme packs.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile && pnpm --filter @cluedo/client build

FROM node:22-slim
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app
ENV PORT=3001 NODE_ENV=production
EXPOSE 3001
# Rooms live in memory: run a single instance (see README, open questions).
# Node runs as PID 1 (not pnpm) so it receives SIGTERM on deploy and shuts down cleanly.
CMD ["node", "--import", "tsx", "apps/server/src/main.ts"]
