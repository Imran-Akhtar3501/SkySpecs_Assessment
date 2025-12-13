# INSTALL

## Prereqs
- Docker & Docker Compose
- Node 20+ and npm
- (Optional) `make`

## Bring up infra
```bash
docker compose up -d postgres mongo
```

## Configure environment
Copy `.env.example` to `.env` and update values if needed.

## Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
GraphQL at http://localhost:4000/graphql, REST at http://localhost:4000/api

## Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173
