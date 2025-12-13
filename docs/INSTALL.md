# Installation Guide

## Prerequisites

- **Docker & Docker Compose** (for database services)
- **Node.js 20+** and npm
- **Git** (to clone the repository)

## Step-by-Step Installation

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd SkySpecs_Assessment
```

### 2. Start Database Services

```bash
docker compose up -d postgres mongo
```

Wait for services to be healthy (about 10-15 seconds).

### 3. Configure Environment

Create a `.env` file in the `backend` directory:

```bash
cd backend
cat > .env << EOF
DATABASE_URL="postgresql://app:app@localhost:5432/turbineops"
MONGO_URL="mongodb://localhost:27017"
JWT_SECRET="your-secret-key-change-in-production"
PORT=4000
EOF
```

### 4. Setup Backend

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with test users
npm run seed
```

The seed script creates three users:
- `admin@example.com` / `Password123!` (ADMIN)
- `engineer@example.com` / `Password123!` (ENGINEER)
- `viewer@example.com` / `Password123!` (VIEWER)

### 5. Start Backend Server

```bash
npm run dev
```

Backend will be available at:
- REST API: http://localhost:4000/api
- GraphQL: http://localhost:4000/graphql
- API Docs: http://localhost:4000/api/docs
- Health: http://localhost:4000/health

### 6. Setup Frontend

In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at http://localhost:5173

## Using Docker Compose (Alternative)

You can also run everything with Docker Compose:

```bash
# Build and start all services
docker compose up --build

# Run migrations (in backend container)
docker compose exec backend npm run prisma:migrate

# Seed database
docker compose exec backend npm run seed
```

## Running Tests

### All Tests

```bash
# From project root
npm test
```

### Backend Tests Only

```bash
cd backend
npm test
```

### Frontend Tests Only

```bash
cd frontend
npm test
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running: `docker compose ps`
2. Check DATABASE_URL in `.env` matches docker-compose.yml settings
3. Verify port 5432 is not in use by another service

### Port Already in Use

- Backend (4000): Change `PORT` in backend `.env`
- Frontend (5173): Change port in `frontend/vite.config.ts`

### Prisma Migration Issues

```bash
# Reset database (WARNING: deletes all data)
cd backend
npm run prisma:migrate reset

# Or manually drop and recreate
docker compose down -v
docker compose up -d postgres
npm run prisma:migrate
```

## Production Deployment

For production:

1. Set strong `JWT_SECRET` in environment
2. Use environment-specific database URLs
3. Enable HTTPS
4. Configure CORS origins properly
5. Set up proper logging and monitoring
6. Use production-grade database (managed PostgreSQL)
7. Enable rate limiting and security headers

See [ARCHITECTURE.md](ARCHITECTURE.md) for more details.
