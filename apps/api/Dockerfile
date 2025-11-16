FROM node:18-slim AS build
WORKDIR /workspace

# Copy only what we need for dependency installation
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.json ./tsconfig.json

WORKDIR /workspace/apps/api
RUN npm ci
RUN npm run build && npm prune --omit=dev

FROM node:18-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030

COPY --from=build /workspace/apps/api/package*.json ./
COPY --from=build /workspace/apps/api/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./dist

EXPOSE 3030

CMD ["node", "dist/server.js"]
