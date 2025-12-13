# Testing Documentation

## Backend Testing

### Running Tests
```bash
cd backend
npm test
```

### Test Suites

#### 1. **Workflow Tests** (`src/__tests__/workflow.test.ts`)
Core business logic and data integrity tests

**Test Categories**:

- **Inspection Overlap Validation**
  - ✅ Prevents overlapping inspections on same turbine/date
  - ✅ Allows inspections on different dates for same turbine
  - Business Rule: Unique constraint on (turbineId, date)

- **Finding Severity Rules**
  - ✅ Enforces minimum severity 4 for BLADE_DAMAGE with "crack" in notes
  - ✅ Allows other categories to have severity 1
  - Applies rule at: creation, update, repair plan generation

- **Repair Plan Generation**
  - ✅ Calculates HIGH priority for max severity ≥ 5
  - ✅ Calculates MEDIUM priority for severity 3-4
  - ✅ Calculates LOW priority for severity < 3
  - ✅ Aggregates total cost from all findings

- **Cascade Delete**
  - ✅ Deletes findings when inspection deleted
  - ✅ Deletes repair plans when inspection deleted

- **User Authentication**
  - ✅ Password hashing with bcryptjs
  - ✅ User creation with different roles

#### 2. **GraphQL Integration Tests** (`src/__tests__/graphql.integration.test.ts`)
Full API lifecycle testing with authentication and authorization

**Test Categories**:

- **Authentication & Authorization**
  - ✅ JWT token generation with valid format
  - ✅ Token parsing and role assignment
  - ✅ ADMIN role enforcement for deletions
  - ✅ ENGINEER access for modifications
  - ✅ VIEWER read-only access enforcement

- **Turbine Operations**
  - ✅ List turbines with pagination
  - ✅ Retrieve single turbine with relationships

- **Inspection Management**
  - ✅ Create inspection with validation
  - ✅ Prevent duplicate inspections
  - ✅ Update inspection with conflict detection
  - ✅ Filter by date range and data source

- **Finding Management**
  - ✅ Create finding with severity rules
  - ✅ Search findings by notes (case-insensitive)
  - ✅ Update finding assessment

- **Repair Plan Generation**
  - ✅ Calculate total cost correctly
  - ✅ Determine priority based on severity
  - ✅ Create and update repair plans

- **Filtering & Pagination**
  - ✅ Date range filtering
  - ✅ Data source filtering
  - ✅ Pagination with limit/offset

#### 3. **Rules Tests** (`src/__tests__/rules.test.ts`)
Specific business rule validation

---

## Test Execution Results

```
Test Suites: 3 passed
Tests:       30 passed
Snapshots:   0 total
Time:        ~25 seconds
```

### Quick Test Run
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
```

---

## API Endpoint Testing

### Manual Testing with cURL

#### 1. Login
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

#### 2. Create Turbine
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:4000/api/turbines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "T-2000",
    "manufacturer": "WindTech",
    "mwRating": 3.5,
    "lat": 40.7128,
    "lng": -74.006
  }'
```

#### 3. Create Inspection
```bash
TURBINE_ID="turbine-id"

curl -X POST http://localhost:4000/api/inspections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "turbineId": "'$TURBINE_ID'",
    "date": "2025-01-15T10:00:00Z",
    "inspectorName": "John Doe",
    "dataSource": "DRONE"
  }'
```

#### 4. Create Finding
```bash
INSPECTION_ID="inspection-id"

curl -X POST http://localhost:4000/api/findings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionId": "'$INSPECTION_ID'",
    "category": "BLADE_DAMAGE",
    "severity": 2,
    "estimatedCost": 5000,
    "notes": "Visible crack on blade surface"
  }'
```

---

## GraphQL Testing

### Using Apollo Sandbox
1. Open `http://localhost:4000/graphql` in browser
2. Add Authorization header with JWT token
3. Run queries/mutations

### Example Query
```graphql
query {
  turbines(limit: 10, offset: 0) {
    data {
      id
      name
      manufacturer
    }
    total
  }
}
```

---

## Severity Rule Testing

### Test Case: BLADE_DAMAGE with Crack
```
Input:
  category: "BLADE_DAMAGE"
  severity: 2
  notes: "Visible crack on blade"

Expected:
  severity: 4  (bumped from 2)
```

---

## Overlap Prevention Testing

### Test Case: Same Turbine, Same Date → Fail
```bash
POST /api/inspections
  turbineId: "t1"
  date: "2025-01-15"
  → 201 Created

POST /api/inspections
  turbineId: "t1"
  date: "2025-01-15"
  → 409 Conflict
```

---

## Authorization Testing

### VIEWER Cannot Modify
```
POST /api/turbines
Authorization: Bearer viewer-token
→ 403 Forbidden
```

### ENGINEER Can Modify
```
POST /api/turbines
Authorization: Bearer engineer-token
→ 201 Created
```

### ADMIN Can Delete
```
DELETE /api/turbines/{id}
Authorization: Bearer admin-token
→ 200 OK
```

---

## Frontend Testing (Future)

```bash
cd frontend
npm test
```

Component tests to be implemented for:
- Turbine list/detail pages
- Inspection management UI
- Finding creation and editing
- Repair plan visualization
