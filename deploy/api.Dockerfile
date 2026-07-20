# API Trackly — build monorepo puis image d'exécution.
# Optimisation de taille possible plus tard (pnpm deploy) ; priorité à la fiabilité.

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
COPY --from=builder /app /app

# Applique les migrations puis démarre (migrations rétrocompatibles, cf. docs/cadrage/16)
CMD ["sh", "-c", "pnpm --filter @trackly/api exec prisma migrate deploy && node apps/api/dist/main.js"]
