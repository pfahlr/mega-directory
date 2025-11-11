# syntax=docker/dockerfile:1

FROM node:20 AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/astro.config.mjs ./astro.config.mjs
COPY --from=build /app/dist ./dist

EXPOSE 4321

CMD ["sh", "-c", "npm run preview -- --host ${HOST:-0.0.0.0} --port ${PORT:-4321}"]
