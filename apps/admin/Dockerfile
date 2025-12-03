# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Use npm install instead of npm ci to handle lock file sync issues
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Runtime
FROM node:20-slim AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Use built-in node user for security
USER node

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 --start-period=5s \
  CMD curl -fsS http://localhost:4000/ || exit 1

EXPOSE 4000

CMD ["node", "index.js"]
