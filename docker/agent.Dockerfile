FROM node:26-alpine AS builder

WORKDIR /usr/src/app/agent

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . ./
RUN npm run build

FROM node:26-alpine AS runner

LABEL org.opencontainers.image.description="Auto Bangumi library mover agent for transferring completed downloads into the media library."

WORKDIR /usr/src/app/agent
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/agent/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=builder /usr/src/app/agent/dist ./dist

CMD ["node", "dist/agent.js"]
