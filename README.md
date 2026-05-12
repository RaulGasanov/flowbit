# Flowbit

- [English](#english)
- [Русский](#русский)

## English

Flowbit is a task and workspace management application with a Next.js frontend and a Go backend API backed by PostgreSQL.

### Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Go 1.26, net/http, GORM
- Database: PostgreSQL

### Project Structure

```text
.
├── backend/   # Go REST API
└── frontend/  # Next.js application
```

### Requirements

- Node.js 22+
- npm
- Go 1.26+
- PostgreSQL
- Docker, optional

### Environment Variables

Backend:

```env
DATABASE_URL=postgres://localhost:5432/flowbit?sslmode=disable
PORT=8080
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

`PORT` and `NEXT_PUBLIC_API_URL` are optional for local development because the app has defaults. `DATABASE_URL` is required by the backend.

### Local Development

#### 1. Start PostgreSQL

Create a database named `flowbit`, or update `DATABASE_URL` to point to your existing database.

#### 2. Start Backend

```bash
cd backend
export DATABASE_URL="postgres://localhost:5432/flowbit?sslmode=disable"
go run .
```

The API runs on `http://localhost:8080`.

#### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

### Docker

Build images:

```bash
docker build -t flowbit-backend ./backend
docker build -t flowbit-frontend ./frontend
```

Run backend:

```bash
docker run --rm \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://host.docker.internal:5432/flowbit?sslmode=disable" \
  flowbit-backend
```

Run frontend:

```bash
docker run --rm \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:8080/api" \
  flowbit-frontend
```

On Linux, replace `host.docker.internal` with the host IP or run PostgreSQL in the same Docker network.

### Scripts

Frontend:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Backend:

```bash
go run .
go test ./...
```

### API

Main API routes are served under `/api`:

- `/api/auth/login`
- `/api/auth/register`
- `/api/users`
- `/api/projects`
- `/api/workspaces`
- `/api/tasks`
- `/api/notifications`
- `/api/shared/workspaces/{token}`

The backend performs database migration on startup for users, projects, tasks, comments, and notifications.

## Русский

Flowbit - приложение для управления задачами и рабочими пространствами. Проект состоит из frontend на Next.js и backend API на Go с PostgreSQL в качестве базы данных.

### Стек

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Go 1.26, net/http, GORM
- База данных: PostgreSQL

### Структура проекта

```text
.
├── backend/   # Go REST API
└── frontend/  # Next.js приложение
```

### Требования

- Node.js 22+
- npm
- Go 1.26+
- PostgreSQL
- Docker, опционально

### Переменные окружения

Backend:

```env
DATABASE_URL=postgres://localhost:5432/flowbit?sslmode=disable
PORT=8080
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

`PORT` и `NEXT_PUBLIC_API_URL` необязательны для локальной разработки, потому что в приложении есть значения по умолчанию. `DATABASE_URL` обязателен для backend.

### Локальная разработка

#### 1. Запустите PostgreSQL

Создайте базу данных `flowbit` или измените `DATABASE_URL`, чтобы он указывал на вашу существующую базу данных.

#### 2. Запустите backend

```bash
cd backend
export DATABASE_URL="postgres://localhost:5432/flowbit?sslmode=disable"
go run .
```

API будет доступен на `http://localhost:8080`.

#### 3. Запустите frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:3000`.

### Docker

Собрать образы:

```bash
docker build -t flowbit-backend ./backend
docker build -t flowbit-frontend ./frontend
```

Запустить backend:

```bash
docker run --rm \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://host.docker.internal:5432/flowbit?sslmode=disable" \
  flowbit-backend
```

Запустить frontend:

```bash
docker run --rm \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:8080/api" \
  flowbit-frontend
```

На Linux замените `host.docker.internal` на IP хоста или запустите PostgreSQL в той же Docker-сети.

### Скрипты

Frontend:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Backend:

```bash
go run .
go test ./...
```

### API

Основные маршруты API доступны внутри `/api`:

- `/api/auth/login`
- `/api/auth/register`
- `/api/users`
- `/api/projects`
- `/api/workspaces`
- `/api/tasks`
- `/api/notifications`
- `/api/shared/workspaces/{token}`

Backend выполняет миграцию базы данных при запуске для пользователей, проектов, задач, комментариев и уведомлений.
