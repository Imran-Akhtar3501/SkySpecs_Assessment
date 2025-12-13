# TurbineOps — Turbine Inspection Management System

A production-ready full-stack application for managing turbine inspections, findings, and repair plans with real-time updates.

## Features

- **CRUD Operations**: Complete management of Turbines, Inspections, Findings, and Repair Plans
- **Dual API**: Both REST and GraphQL interfaces available
- **Real-time Updates**: WebSocket and Server-Sent Events (SSE) for live repair plan notifications
- **Role-Based Access Control**: ADMIN, ENGINEER, and VIEWER roles with JWT authentication
- **Business Rules**: Automatic severity adjustment for BLADE_DAMAGE findings with cracks
- **Overlap Prevention**: Database-enforced unique constraints prevent overlapping inspections
- **Search & Filtering**: Filter inspections by date range, turbine, and data source; search findings by notes

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services
docker compose up --build

# In separate terminals, run migrations and seed
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed

# Start backend (if not using docker)
npm run dev

# Start frontend (if not using docker)
cd ../frontend
npm install
npm run dev
```

### Manual Setup

See [INSTALL.md](docs/INSTALL.md) for detailed instructions.

## Access Points

- **Frontend**: http://localhost:5173
- **Backend REST API**: http://localhost:4000/api
- **GraphQL Playground**: http://localhost:4000/graphql
- **API Documentation**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/health

## Test Users

All users have password: `Password123!`

- `admin@example.com` (ADMIN) - Full access
- `engineer@example.com` (ENGINEER) - Can create/edit inspections and findings
- `viewer@example.com` (VIEWER) - Read-only access

## Running Tests

```bash
# Run all tests (backend + frontend)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

## Documentation

- [INSTALL.md](docs/INSTALL.md) - Detailed installation and setup instructions
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and design decisions
- [DB_SCHEMA.md](docs/DB_SCHEMA.md) - Database schema and relationships
- [TESTING.md](docs/TESTING.md) - Testing strategy and how to run tests
- [API.md](docs/API.md) - API documentation

## Tech Stack

- **Backend**: Node.js, Express, Apollo GraphQL, Prisma, PostgreSQL, Socket.IO
- **Frontend**: React, TypeScript, Vite, React Router
- **Database**: PostgreSQL (primary), MongoDB (optional, for raw inspection logs)
- **Testing**: Jest, Supertest, Vitest, React Testing Library
- **Containerization**: Docker, Docker Compose

## Project Structure

```
/
├── backend/          # Backend API (Express + GraphQL)
│   ├── src/
│   │   ├── routes/   # REST endpoints
│   │   ├── graphql/  # GraphQL resolvers and schema
│   │   ├── services/ # Business logic (SSE, WebSocket)
│   │   └── __tests__ # Tests
│   └── prisma/       # Database schema and migrations
├── frontend/         # React frontend
│   └── src/
│       ├── pages/    # Page components
│       ├── components/ # Reusable components
│       └── services/  # API and real-time services
├── docs/            # Documentation
└── docker-compose.yml
```

## License

This is a case study project for evaluation purposes.
