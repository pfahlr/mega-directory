FROM node:20-slim AS build
WORKDIR /workspace

# Copy root package files for npm workspaces
COPY package*.json ./
COPY tsconfig.json ./tsconfig.json

# Copy workspace packages
COPY apps ./apps
COPY packages ./packages
COPY db ./db

# Install all dependencies from root (npm workspaces)
RUN npm ci

# Build the API
WORKDIR /workspace/apps/api
RUN npm run build

# Prune dev dependencies from root
WORKDIR /workspace
RUN npm prune --omit=dev

FROM node:20-slim
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3030

# Copy from workspace root to maintain npm workspaces structure
COPY --from=build /workspace/package*.json ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api ./apps/api
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/db ./db

WORKDIR /app/apps/api

EXPOSE 3030

CMD ["node", "dist/server.js"]
