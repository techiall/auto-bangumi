FROM node:24-alpine AS builder

WORKDIR /usr/src/app/agent

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . ./
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runner

WORKDIR /usr/src/app/agent
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/agent/package*.json ./
COPY --from=builder /usr/src/app/agent/node_modules ./node_modules
COPY --from=builder /usr/src/app/agent/dist ./dist

USER node

CMD ["node", "dist/agent.js"]
