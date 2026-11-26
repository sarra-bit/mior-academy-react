# ---------- Stage 1 : build de l'application React (Vite) ----------
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Stage 2 : serveur nginx (image finale légère) ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD wget -qO- http://127.0.0.1/ || exit 1