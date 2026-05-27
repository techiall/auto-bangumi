FROM node:24-alpine AS builder

WORKDIR /usr/src/app/frontend

COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend ./
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runner

WORKDIR /usr/src/app/frontend
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /usr/src/app/frontend/package*.json ./
COPY --from=builder /usr/src/app/frontend/node_modules ./node_modules
COPY --from=builder /usr/src/app/frontend/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
