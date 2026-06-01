# Master of Relics — Backend

Серверная часть многопользовательской пошаговой тактической дуэли с элементами коллекционной карточной игры. Реализована на **NestJS** с использованием авторитарной архитектуры, WebSocket-коммуникации (Socket.IO) и гибридного подхода к хранению данных (PostgreSQL + Redis).


## Технологический стек

| Компонент | Технология |
|-----------|-------------|
| **Фреймворк** | NestJS (Express) |
| **Язык** | TypeScript |
| **База данных** | PostgreSQL (TypeORM) |
| **Кэш/игровые сессии** | Redis + RedisJSON |
| **WebSocket** | Socket.IO |
| **Аутентификация** | JWT (access + refresh tokens) |
| **Метрики** | Prometheus (@willsoto/nestjs-prometheus) |
| **Тестирование** | Jest |
| **Контейнеризация** | Docker |


## Модульная архитектура
```
src/
├── auth/ # Аутентификация (JWT, стратегии, guards)
├── users/ # Пользователи, профили, друзья
├── lobby/ # Система лобби
├── game-state/ # Управление игровым состоянием
├── game-mechanics/ # Игровая механика (расчёты урона, лечение)
├── draft/ # Фаза драфта
├── phase/ # Управление фазами игры
├── action/ # Обработка игровых действий
├── artifact/ # Артефакты (базовые сущности)
├── collection/ # Коллекции и колоды пользователей
├── spell/ # Система заклинаний и эффектов
├── invite-code/ # Инвайт-коды для регистрации
├── redis/ # Redis-клиент и сервисы
│── socket-connection/ # WebSocket соединения
│── database/ # Подключение к БД (TypeORM)
├── common/ # Общие утилиты, интерсепторы
├── config/ # Конфигурация (JWT, DB, Redis)
├── app.module.ts # Главный модуль
└── main.ts # Точка входа
```

## Переменные окружения

### Основной `.env`

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `PORT` | 3000 | Порт сервера |
| `NODE_ENV` | production | Окружение (development/production) |
| `DB_HOST` | localhost | Хост PostgreSQL |
| `DB_PORT` | 5432 | Порт PostgreSQL |
| `DB_USERNAME` | master_of_relics | Имя пользователя БД |
| `DB_PASSWORD` | master_of_relics | Пароль БД |
| `DB_DATABASE` | master_of_relics | Название БД |
| `DB_SYNCHRONIZE` | false | Авто-синхронизация схемы (не использовать в production) |
| `DB_LOGGING` | false | Логирование запросов |
| `JWT_ACCESS_SECRET` | — | Секрет для access-токенов |
| `JWT_REFRESH_SECRET` | — | Секрет для refresh-токенов |
| `JWT_ACCESS_EXPIRES_IN` | 15m | Время жизни access-токена |
| `JWT_REFRESH_EXPIRES_IN` | 30d | Время жизни refresh-токена |
| `REDIS_HOST` | localhost | Хост Redis |
| `REDIS_PORT` | 6379 | Порт Redis |
| `REDIS_PASSWORD` | 123 | Пароль Redis |
| `REDIS_DB` | 0 | Номер БД Redis |
| `REDIS_TTL` | 3600 | TTL для данных (секунды) |

### Файл `.env.db` (для Docker)

| Переменная | Описание |
|------------|----------|
| `POSTGRES_USER` | Имя пользователя PostgreSQL |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `POSTGRES_DB` | Название БД PostgreSQL |

## Установка и запуск

### Локальная разработка
```bash
# Установка зависимостей
npm install

# Копирование конфигурации окружения
cp .env.example .env

# Запуск PostgreSQL и Redis (через Docker)
docker compose up -d db redis

# Запуск backend в режиме разработки
npm run start:dev
```

### Полный запуск через Docker Compose

```bash
# Запуск всех сервисов
docker compose -p masterofrelics up -d

# Просмотр логов
docker compose logs -f backend

# Перезапуск backend после изменений
docker compose up -d --build backend

# Остановка всех сервисов
docker compose down
```

## Описание модулей

| Модуль | Ответственность |
|--------|----------------|
| **AuthModule** | JWT-аутентификация, стратегии (access/refresh), guards |
| **UsersModule** | Управление пользователями, профили, система друзей |
| **LobbyModule** | Создание/присоединение к лобби, статусы готовности |
| **GameStateModule** | Хранение игрового состояния в Redis |
| **GameMechanicsModule** | Расчёт урона, лечения, проверка условий |
| **DraftModule** | Фаза драфта (поочерёдный выбор артефактов) |
| **PhaseModule** | Управление фазами игры (драфт → бой → завершение) |
| **ActionModule** | Валидация и обработка игровых действий |
| **ArtifactModule** | CRUD артефактов, их способностей |
| **CollectionModule** | Коллекции пользователей, управление колодами |
| **SpellModule** | Заклинания и эффекты (баффы/дебаффы) |
| **InviteCodeModule** | Генерация и валидация инвайт-кодов |
| **RedisModule** | Клиент Redis, сервисы для работы с кэшем |
| **SocketConnectionModule** | Управление WebSocket-соединениями |


## CI/CD

Настроен GitHub Actions pipeline

### Этапы CI/CD
| Этап |Описание |
|------|-------------|
| Unit-тесты |	Запуск тестов с вычислением покрытия (npm run test:cov), проверка типов TypeScript (tsc --noEmit) |
| Сборка |	Установка зависимостей через npm ci, компиляция TypeScript, архивация dist-директории |
| Деплой |	Выполняется только при пушах в ветку master на self-hosted раннере в Yandex Cloud: git pull, перезапуск Docker-контейнера, очистка старых образов |