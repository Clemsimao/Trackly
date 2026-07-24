# API Trackly — build monorepo puis image d'exécution sans les sources.

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app

# Couche dépendances (cache Docker)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @trackly/api... --ignore-scripts

# Sources et build
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @trackly/contracts build \
  && pnpm --filter @trackly/api exec prisma generate \
  && pnpm --filter @trackly/api build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Applique les migrations puis démarre (migrations rétrocompatibles, cf. docs/cadrage/16)
USER node
CMD ["sh", "-c", "pnpm --filter @trackly/api exec prisma migrate deploy && node apps/api/dist/main.js"]
