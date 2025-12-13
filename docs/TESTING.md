# Testing Guide

## Overview

The project includes comprehensive testing at multiple levels:
- **Unit Tests**: Business logic, validation rules, utilities
- **Integration Tests**: REST and GraphQL API endpoints with database
- **Component Tests**: React component rendering and interactions

## Running Tests

### All Tests

From the project root:
```bash
npm test
```

This runs both backend and frontend test suites.

### Backend Tests Only

```bash
cd backend
npm test
```

Or from root:
```bash
npm run test:backend
```

### Frontend Tests Only

```bash
cd frontend
npm test
```

Or from root:
```bash
npm run test:frontend
```

## Backend Testing

### Test Structure

Located in `backend/src/__tests__/`:

- **workflow.test.ts**: End-to-end workflow tests
  - Inspection overlap prevention
  - Finding severity rules
  - Repair plan priority calculation
  - Cascade delete behavior

- **rules.test.ts**: Business rule validation
  - BLADE_DAMAGE + crack severity enforcement
  - Priority calculation logic

- **graphql.integration.test.ts**: GraphQL API integration
  - Authentication
  - CRUD operations via GraphQL
  - Authorization checks

- **rest.integration.test.ts**: REST API integration
  - Health check
  - Authentication flow
  - Turbine CRUD
  - Inspection workflow
  - Finding creation with severity rules
  - Repair plan generation

### Test Database

Tests use the same PostgreSQL database. Ensure:
1. Database is running (`docker compose up -d postgres`)
2. Migrations are applied (`npm run prisma:migrate`)
3. `DATABASE_URL` is set in environment

### Example Test

```typescript
describe('Finding Severity Rule', () => {
  it('should auto-upgrade severity for BLADE_DAMAGE with crack', async () => {
    const finding = await createFinding({
      category: 'BLADE_DAMAGE',
      severity: 2,
      notes: 'long crack in blade',
    });
    
    expect(finding.severity).toBe(4);
    expect(finding.severityAdjusted).toBe(true);
  });
});
```

## Frontend Testing

### Test Structure

Located in `frontend/src/components/__tests__/` and `frontend/src/pages/__tests__/`:

- **Component Tests**: Test individual React components
- **Integration Tests**: Test component interactions
- **API Mocking**: Mock API calls for isolated testing

### Test Setup

Uses Vitest and React Testing Library:
- Fast test execution
- Component rendering utilities
- User interaction simulation

### Example Test

```typescript
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  it('should redirect unauthenticated users', () => {
    render(<ProtectedRoute><TestComponent /></ProtectedRoute>);
    // Assert redirect behavior
  });
});
```

## Test Coverage Goals

- **Backend**: >80% coverage on business logic
- **Frontend**: >70% coverage on components
- **Integration**: All critical user flows

## Continuous Integration

Tests run automatically on:
- Push to main/master/develop branches
- Pull requests

See `.github/workflows/ci.yml` for CI configuration.

## Writing New Tests

### Backend

1. Create test file: `backend/src/__tests__/feature.test.ts`
2. Import dependencies and setup test database
3. Write test cases with `describe` and `it`
4. Clean up test data in `afterAll`

### Frontend

1. Create test file: `frontend/src/components/__tests__/Component.test.tsx`
2. Import component and testing utilities
3. Render component and assert behavior
4. Mock external dependencies (API calls, etc.)

## Debugging Tests

### Backend

```bash
# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- workflow.test.ts

# Run with coverage
npm test -- --coverage
```

### Frontend

```bash
# Run in watch mode
npm test -- --watch

# Run with UI
npm test -- --ui
```
