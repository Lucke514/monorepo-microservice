# syntax=docker/dockerfile:1
# Build context = raíz del monorepo (ver docker-compose.yml)

# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Instala TODAS las dependencias (incluye devDependencies para compilar con Nest)
COPY package.json package-lock.json ./
RUN npm ci

# Copia el código y compila únicamente la app main-app (+ libs que importa)
COPY . .
RUN npx nest build main-app

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# dumb-init gestiona señales como PID 1 (SIGTERM → shutdown limpio de Nest)
RUN apk add --no-cache dumb-init

# Solo dependencias de producción
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Artefactos compilados, propiedad del usuario no-root `node` (ya existe en la imagen)
COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

# Liveness: consulta el endpoint /health sin dependencias externas
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# El builder tsc preserva la estructura de carpetas del monorepo
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/apps/main-app/apps/main-app/src/main.js"]
