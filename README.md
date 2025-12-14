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

## Design Decisions

### Architecture

Used a layered architecture (presentation → API → business logic → data access → database) for maintainability and testability. Both REST and GraphQL APIs share the same business logic layer to avoid duplication while serving different client needs.

### Database

PostgreSQL handles all relational data with unique constraints preventing overlapping inspections at the database level. Cascade deletes maintain referential integrity. MongoDB is optional for unstructured inspection logs and can be toggled via environment variable.

### Authentication

JWT tokens with 24-hour expiration provide stateless authentication. Three roles (ADMIN, ENGINEER, VIEWER) are enforced via middleware before requests reach business logic.

### Real-time Updates

WebSocket (Socket.IO) is the primary method for real-time notifications. The frontend automatically falls back to Server-Sent Events if WebSocket fails, ensuring reliability across different network environments.

### Business Rules

BLADE_DAMAGE findings with "crack" in notes automatically get minimum severity 4. This rule is enforced at finding creation, updates, and repair plan generation. API responses include a `severityAdjusted` flag when auto-upgraded.

### Technology Choices

- **TypeScript**: Type safety catches errors early and improves developer experience
- **Prisma**: Type-safe database access with automatic migrations
- **React + Vite**: Fast development with modern React patterns
- **Docker Compose**: Consistent development and deployment environment

### Testing

Unit tests cover business logic (severity rules, priority calculation). Integration tests verify API endpoints with real database operations. Workflow tests ensure complete user journeys work end-to-end.

## License

This is a case study project for evaluation purposes.
