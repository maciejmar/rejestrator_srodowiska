# ── Stage 1: Build Angular app ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config and built assets
COPY nginx.conf /etc/nginx/conf.d/portal-ai.conf
COPY --from=builder /app/dist/model-reservation /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
