# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# bcrypt has native bindings that need to be compiled
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /app/data /app/public/uploads

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
