FROM node:20-alpine AS builder

WORKDIR /app/server

RUN apk add --no-cache openssl
RUN npm config set registry https://registry.npmmirror.com

COPY server/package*.json ./

RUN npm install --ignore-scripts

COPY server/src ./src
COPY server/prisma ./prisma
COPY server/tsconfig.json ./

RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl wget

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 zhiliao

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/prisma ./prisma

RUN mkdir -p uploads && chown -R zhiliao:nodejs uploads

USER zhiliao

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/app.js"]
