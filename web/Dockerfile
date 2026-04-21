ARG VITE_API_URL=http://localhost:3000

FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl && \
    npm config set registry https://registry.npmmirror.com

COPY server/package*.json server/ 2>/dev/null || true
COPY web/package*.json web/
COPY package*.json ./

RUN npm ci --workspace=web --omit=dev --ignore-scripts || \
    (cd web && npm install --omit=dev --ignore-scripts)

COPY web/src web/src
COPY web/public web/public
COPY web/index.html web/
COPY web/vite.config.ts web/
COPY web/tsconfig.json web/
COPY web/tsconfig.node.json web/

WORKDIR /app/web

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine AS runner

RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
