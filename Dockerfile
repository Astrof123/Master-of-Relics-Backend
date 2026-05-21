# Этап 1: Сборка
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы с зависимостями
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY typeorm.config.ts ./

# Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
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

# Копируем собранное приложение
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/typeorm.config.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig*.json ./

# Копируем миграции (исходники для TypeORM CLI)
COPY --from=builder --chown=nodejs:nodejs /app/src/database/migrations ./src/database/migrations

# Удаляем devDependencies (опционально, но для миграций нужен ts-node)
# RUN npm prune --production

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Запускаем миграции и приложение
CMD sh -c "npm run migration:run && node dist/main.js"