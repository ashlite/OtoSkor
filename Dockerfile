# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for Vite build)
COPY package.json bun.lock* ./
RUN bun install

# Copy application source
COPY . .

# Build frontend SPA + PWA into /app/dist
RUN bun run build


FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production runtime dependencies only
COPY package.json bun.lock* ./
RUN bun install --production

# Copy compiled frontend, TypeScript server entrypoint, and Firebase config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Run as built-in non-root bun user
RUN chown -R bun:bun /app
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "server.ts"]
