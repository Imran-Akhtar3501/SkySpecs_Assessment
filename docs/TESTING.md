# Testing

## Backend
```bash
cd backend
npm test
```

Includes unit tests for:
- overlap prevention
- severity derivation
- priority logic

Integration test (Supertest) covers CRUD + plan generation happy path.

## Frontend
```bash
cd frontend
npm test
```
Basic component tests scaffolded; add more as you implement.
