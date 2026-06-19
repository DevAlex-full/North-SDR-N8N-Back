# ─────────────────────────────────────────────────────────────────────────────
# North SDR Backend — Dockerfile (multi-stage, production-ready)
#
# Deploy principal: Render Node Environment via render.yaml
# Este Dockerfile é OPCIONAL — use se quiser rodar via Docker/container.
#
# Como usar:
#   docker build -t north-sdr-backend .
#   docker run -p 3333:3333 --env-file .env north-sdr-backend
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ─── DEPS ─────────────────────────────────────────────────────────────────────
# Instala TODAS as dependências (incluindo devDeps com prisma CLI)
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ─── BUILD ────────────────────────────────────────────────────────────────────
# Aqui temos node_modules completo → prisma CLI disponível → generate funciona
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── RUNNER ───────────────────────────────────────────────────────────────────
# Imagem final enxuta — sem Prisma CLI, sem devDeps, sem código-fonte TypeScript
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 fastify

# Copia apenas o necessário para rodar:
# dist/       → código compilado
# node_modules → inclui o Prisma Client gerado no builder
# prisma/     → schema + migrations (para migrate deploy em tempo de execução)
COPY --from=builder --chown=fastify:nodejs /app/dist         ./dist
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/prisma       ./prisma
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json

# O Prisma Client já está gerado em node_modules/.prisma/client
# NÃO executamos `prisma generate` aqui — a CLI não existe nesta imagem
# Para rodar migrations antes de subir: docker exec <container> npx prisma migrate deploy

USER fastify
EXPOSE 3333
CMD ["node", "dist/server.js"]
