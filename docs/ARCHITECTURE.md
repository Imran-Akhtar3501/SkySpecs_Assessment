# Architecture

## System Overview

The SkySpecs Inspection Platform is a production-ready web application for managing wind turbine inspections, findings, and repair planning.

### Technology Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + Apollo GraphQL + TypeScript
- **Database**: PostgreSQL (primary) + MongoDB (optional logging/NoSQL)
- **Authentication**: JWT with role-based access control (ADMIN, ENGINEER, VIEWER)
- **Real-time Updates**: Server-Sent Events (SSE)
- **API Documentation**: OpenAPI/Swagger + GraphQL SDL
- **Testing**: Jest + Supertest (backend), Vitest (frontend)
- **Containerization**: Docker + Docker Compose

## Core Architecture

### Backend Layer

#### Authentication & Authorization
- **JWT-based**: Token generation and verification
- **Role-Based Access Control**: Three roles (ADMIN, ENGINEER, VIEWER)
  - **ADMIN**: Full access - create, read, update, delete all resources
  - **ENGINEER**: Create, read, and update turbines, inspections, and findings
  - **VIEWER**: Read-only access to all resources
- **Middleware**: Token validation on all protected endpoints

#### REST API Layer
- Full CRUD operations for:
  - Turbines (create, read, update, delete with pagination)
  - Inspections (with overlap validation)
  - Findings (with severity rule enforcement)
  - Repair Plans
- Query filtering:
  - Inspections by date range, turbine ID, and data source
  - Findings by inspection ID with text search on notes
- Error handling with proper HTTP status codes

#### GraphQL API Layer
- Complete type definitions covering all entities
- Resolvers with authorization checks
- Mutations for all CRUD operations
- Queries with pagination and filtering
- Severity rule enforcement for BLADE_DAMAGE findings
- Repair plan generation with priority calculation

#### Data Layer (Prisma ORM)
- Type-safe database access
- Automatic migrations
- Relations with cascade delete
- Unique constraints (turbine_date combination)
- Seeded users for testing

### Database Schema

#### Core Models
- **User**: Authentication and authorization
- **Turbine**: Wind turbine metadata (location, rating, manufacturer)
- **Inspection**: Turbine inspections with date, source, and inspector info
- **Finding**: Individual defects/issues discovered during inspection
- **RepairPlan**: Aggregated plan generated from findings

#### Key Constraints
- Unique constraint on (turbineId, date) to prevent overlapping inspections
- Cascade delete from Inspection → Finding and Inspection → RepairPlan
- Foreign key relationships with proper indexing

### Business Logic

#### Severity Rule Engine
- **Rule**: If finding category is BLADE_DAMAGE and notes contain "crack", enforce minimum severity of 4
- Applied at: Finding creation, Finding update, RepairPlan generation

#### Repair Plan Generation
- Aggregates all findings from an inspection
- Applies severity rules
- Calculates total estimated cost
- Determines priority:
  - HIGH: max severity ≥ 5
  - MEDIUM: max severity 3–4
  - LOW: max severity < 3

#### Real-time Notifications
- **WebSocket** (primary): Socket.IO server for bi-directional real-time communication
- **SSE** (fallback): Server-Sent Events endpoint at `/sse/repairplans` for clients that don't support WebSocket
- Broadcasts `repairplan:created` event to all connected clients when repair plan is generated
- Frontend automatically falls back to SSE if WebSocket connection fails

## Data Flow

```
1. User authenticates → receives JWT token
2. Request → middleware validates token and role
3. REST/GraphQL handler processes request
4. Prisma ORM → PostgreSQL (primary storage)
5. MongoDB optional: inspection logs recorded asynchronously
6. SSE broadcast when repair plan generated
```

## Security

- JWT tokens with 24-hour expiration
- bcryptjs for password hashing
- Role-based endpoint protection
- CORS configuration for cross-origin requests
- Environment variables for sensitive data (DB, JWT secret, Mongo URL)

## API Documentation

- **REST**: OpenAPI/Swagger at `/api/docs`
- **GraphQL**: Interactive playground at `/graphql`
- Full type definitions and resolvers documented in schema

## Testing Strategy

- **Unit Tests**: Rules, severity calculations, authentication
- **Integration Tests**: CRUD workflows, overlap validation, cascade delete
- **E2E**: Full request/response cycles via GraphQL and REST
- Test coverage for auth, data integrity, business rules
- All tests run with `npm test`

## Deployment

- Docker containers for all services
- `docker-compose up` orchestrates PostgreSQL, optional MongoDB, and backend
- Environment configuration via .env file
- Health check endpoint at `/api/healthz`
- Swagger documentation accessible in production

## Performance Considerations

- Pagination for large datasets (default 50 items/page)
- Indexed queries on frequently filtered fields
- Cascade deletes for referential integrity
- Connection pooling via Prisma
- SSE for efficient real-time updates (vs. polling)

## Design Decisions

### Why Prisma?
- Type-safe database access with TypeScript
- Automatic migration generation and management
- Excellent developer experience with IntelliSense
- Built-in connection pooling and query optimization

### Why PostgreSQL Primary?
- ACID compliance for data integrity
- Strong relational model for complex queries
- Excellent performance for structured data
- Mature ecosystem and tooling
- JSON support for flexible fields (snapshotJson)

### Why MongoDB Optional?
- Document store for unstructured inspection logs
- Can store raw inspection packages (images, videos, metadata)
- Toggle via environment variable (ENABLE_MONGO)
- Not required for core functionality

### Why Both REST and GraphQL?
- REST: Simple, familiar, easy to document (OpenAPI)
- GraphQL: Flexible queries, single endpoint, type-safe
- Different clients may prefer different interfaces
- Both share same business logic layer

### Real-time Strategy
- WebSocket (Socket.IO) for primary real-time updates
- SSE as fallback for clients behind restrictive firewalls
- Event-driven architecture for scalability

## Future Enhancements

- Background job processing (Bull/Redis for long-running repairs)
- Metrics and observability (Prometheus, OpenTelemetry)
- Multi-tenancy support
- Image/document storage for inspection artifacts
- Advanced filtering and analytics
- Rate limiting and request throttling

