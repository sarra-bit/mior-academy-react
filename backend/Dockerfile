# ---------- Stage 1 : installation des dépendances ----------
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 2 : image finale (légère) ----------
FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/server.js"]