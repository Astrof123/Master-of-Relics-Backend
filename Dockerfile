# Этап 1: Сборка
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы с зависимостями
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./


RUN npm ci || npm install

# Копируем исходный код
COPY src ./src

# Собираем приложение
RUN npm run build

# Этап 2: Production
FROM node:20-alpine

RUN apk add --no-cache tzdata

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/main.js"]