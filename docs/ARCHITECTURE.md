# Architecture

- **Frontend**: React + Vite + TypeScript. Pages for Turbines, Inspections, Inspection Detail (Findings + Repair Plan).
- **Backend**: Node + TypeScript (Express + ApolloServer), REST + GraphQL side-by-side.
- **DB**: Postgres (primary via Prisma). Mongo (NoSQL ingestion logs example).
- **Auth**: Simple JWT; three seeded roles (ADMIN, ENGINEER, VIEWER).
- **Realtime**: Server-Sent Events (SSE) channel to notify clients when a Repair Plan is generated.
- **Docs**: OpenAPI for REST, SDL for GraphQL.
- **Tests**: Jest + Supertest (backend); Vitest (frontend).

> This is a starter. Many handlers are stubs/empty—fill them to meet the brief.
