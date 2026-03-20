FROM node:20-alpine AS base

# ─────────────────────────────
# Dependencies stage
# ─────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─────────────────────────────
# Builder stage
# ─────────────────────────────
FROM base AS builder
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────
# Production runner stage
# ─────────────────────────────
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
