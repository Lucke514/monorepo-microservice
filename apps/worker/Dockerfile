# syntax=docker/dockerfile:1
# Build context = raíz del monorepo (ver docker-compose.yml)

# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Instala TODAS las dependencias (incluye devDependencies para compilar con Nest)
COPY package.json package-lock.json ./
RUN npm ci

# Copia el código y compila únicamente la app worker (+ libs que importa)
COPY . .
RUN npx nest build worker

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# dumb-init gestiona señales como PID 1 (SIGTERM → enableShutdownHooks de Nest)
RUN apk add --no-cache dumb-init

# Solo dependencias de producción
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Artefactos compilados, propiedad del usuario no-root `node` (ya existe en la imagen)
COPY --from=builder --chown=node:node /app/dist ./dist

USER node

# El worker es un microservicio que escucha la cola vía PostgreSQL (sin puerto HTTP),
# por eso no expone HEALTHCHECK; la salud se cubre con `restart: unless-stopped` y el
# shutdown limpio vía enableShutdownHooks() + dumb-init.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/apps/worker/apps/worker/src/main.js"]
