FROM node:26-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tsconfig.json tsconfig.web.json vite.config.ts ./
COPY src ./src
RUN npm run build && npm run build:web

FROM node:26-alpine AS runner

LABEL org.opencontainers.image.description="Auto Bangumi web UI, API server, RSS scheduler, and qBittorrent coordinator."

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV API_PORT=3001
ENV API_BASE_URL=http://127.0.0.1:3001

COPY --from=builder /usr/src/app/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/.output ./.output

EXPOSE 3000
EXPOSE 3001

CMD ["node", "dist/server/app-container.js"]
