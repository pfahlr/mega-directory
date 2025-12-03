# syntax=docker/dockerfile:1

FROM node:20 AS base
WORKDIR /workspace

# Copy root package files for npm workspaces
COPY package*.json ./
COPY tsconfig.json ./tsconfig.json

# Copy workspace packages
COPY apps/web ./apps/web
COPY packages ./packages

# Install all dependencies from root (npm workspaces)
RUN npm ci

# Build the web app
WORKDIR /workspace/apps/web
RUN npm run build

# Prune dev dependencies from root
WORKDIR /workspace
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Copy from workspace root to maintain npm workspaces structure
COPY --from=base /workspace/package*.json ./
COPY --from=base /workspace/node_modules ./node_modules
COPY --from=base /workspace/apps/web ./apps/web
COPY --from=base /workspace/packages ./packages

WORKDIR /app/apps/web

EXPOSE 4321

CMD ["sh", "-c", "npm run preview -- --host ${HOST:-0.0.0.0} --port ${PORT:-4321}"]
