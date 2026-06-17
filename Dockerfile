# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Multi-stage build → a single image that serves the Angular SPA and the
# NestJS API from one Cloud Run service (same origin, no CORS).
# ---------------------------------------------------------------------------

# 1) Build the Angular frontend (production config → apiBase '/api')
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

# 2) Build the NestJS backend (TypeScript → dist)
FROM node:22-alpine AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# 3) Runtime image — prod deps only, both artifacts inside
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

# Production node_modules
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled backend + seed data
COPY --from=backend /app/backend/dist ./dist
COPY backend/data ./data

# Built Angular app → served by Nest from ./public
COPY --from=frontend /app/frontend/dist/frontend/browser ./public

EXPOSE 8080
CMD ["node", "dist/main.js"]
