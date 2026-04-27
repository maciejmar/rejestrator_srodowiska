# ── Stage 1: Build Angular app ──────────────────────────────────────────────
FROM repo.bank.com.pl/zrai-docker-remote-dev/node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN --mount=type=secret,id=ca_cert,dst=/etc/pki/ca-trust/source/anchors/bank-jfrog-ca.crt \
    npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM repo.bank.com.pl/zrai-docker-remote-dev/nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/portal-ai.conf
COPY --from=builder /app/dist/model-reservation /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
