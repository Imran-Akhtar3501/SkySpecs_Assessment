# API Documentation

## Authentication

### Login Endpoint
```http
POST /api/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "ADMIN"
  }
}
```

### Using the Token
All protected endpoints require the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Default Seeded Users
- **Admin**: email: `admin@example.com`, password: `admin123`
- **Engineer**: email: `eng@example.com`, password: `engineer123`
- **Viewer**: email: `viewer@example.com`, password: `viewer123`

---

## REST API Endpoints

### Turbines

#### List Turbines (Paginated)
```http
GET /api/turbines?limit=50&offset=0
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "turbine-1",
      "name": "T-1000",
      "manufacturer": "SkyGen",
      "mwRating": 2.5,
      "lat": 12.98,
      "lng": 77.59,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### Get Single Turbine
```http
GET /api/turbines/{id}
Authorization: Bearer <token>
```

#### Create Turbine (ADMIN, ENGINEER only)
```http
POST /api/turbines
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Turbine",
  "manufacturer": "SkyGen",
  "mwRating": 3.0,
  "lat": 40.7128,
  "lng": -74.006
}
```

#### Update Turbine (ADMIN, ENGINEER only)
```http
PUT /api/turbines/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "mwRating": 3.5
}
```

#### Delete Turbine (ADMIN only)
```http
DELETE /api/turbines/{id}
Authorization: Bearer <token>
```

### Inspections

#### List Inspections (with filtering)
```http
GET /api/inspections?turbineId={id}&startDate=2025-01-01&endDate=2025-12-31&dataSource=DRONE&limit=50&offset=0
Authorization: Bearer <token>

Query Parameters:
- turbineId: Filter by turbine (optional)
- startDate: Filter by start date (optional)
- endDate: Filter by end date (optional)
- dataSource: DRONE or MANUAL (optional)
- limit: Page size (default: 50)
- offset: Page offset (default: 0)
```

#### Get Single Inspection
```http
GET /api/inspections/{id}
Authorization: Bearer <token>
```

#### Create Inspection (ADMIN, ENGINEER only)
```http
POST /api/inspections
Authorization: Bearer <token>
Content-Type: application/json

{
  "turbineId": "turbine-1",
  "date": "2025-01-15T10:00:00Z",
  "inspectorName": "John Doe",
  "dataSource": "DRONE",
  "rawPackageUrl": "s3://bucket/inspection-data.zip"
}

Note: Will return 409 Conflict if overlapping inspection exists on same turbine/date
```

#### Update Inspection (ADMIN, ENGINEER only)
```http
PUT /api/inspections/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2025-01-15T11:00:00Z",
  "inspectorName": "Jane Smith"
}
```

#### Delete Inspection (ADMIN only)
```http
DELETE /api/inspections/{id}
Authorization: Bearer <token>
```

### Findings

#### List Findings (with text search)
```http
GET /api/findings?inspectionId={id}&searchNotes={query}
Authorization: Bearer <token>

Query Parameters:
- inspectionId: Required, inspection ID to query
- searchNotes: Optional, search string for finding notes
```

#### Get Single Finding
```http
GET /api/findings/{id}
Authorization: Bearer <token>
```

#### Create Finding (ADMIN, ENGINEER only)
```http
POST /api/findings
Authorization: Bearer <token>
Content-Type: application/json

{
  "inspectionId": "inspection-1",
  "category": "BLADE_DAMAGE",
  "severity": 2,
  "estimatedCost": 5000,
  "notes": "Visible crack on blade surface"
}

Note: Severity rule applies:
- If category=BLADE_DAMAGE and notes contain "crack", severity is bumped to min 4
```

#### Update Finding (ADMIN, ENGINEER only)
```http
PUT /api/findings/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "severity": 5,
  "notes": "Updated assessment: severe crack"
}
```

#### Delete Finding (ADMIN only)
```http
DELETE /api/findings/{id}
Authorization: Bearer <token>
```

### Repair Plans

#### Get Repair Plan
```http
GET /api/repair-plans/{inspectionId}
Authorization: Bearer <token>

Response:
{
  "id": "plan-1",
  "inspectionId": "inspection-1",
  "priority": "HIGH",
  "totalEstimatedCost": 50000,
  "snapshotJson": [ /* findings snapshot */ ],
  "createdAt": "2025-01-15T12:00:00Z",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

---

## GraphQL API

### Endpoint
```
POST http://localhost:4000/graphql
```

### Interactive Explorer
Visit `http://localhost:4000/graphql` in browser for Apollo Sandbox

### Authentication
Include JWT token in request headers:
```
Authorization: Bearer <your-jwt-token>
```

### Example Queries

#### Get Current User
```graphql
query {
  me {
    id
    email
    name
    role
  }
}
```

#### List Turbines with Inspections
```graphql
query GetTurbines {
  turbines(limit: 50, offset: 0) {
    data {
      id
      name
      manufacturer
      mwRating
      inspections {
        id
        date
        dataSource
      }
    }
    total
  }
}
```

#### Get Inspection with Findings and Repair Plan
```graphql
query GetInspection($id: ID!) {
  inspection(id: $id) {
    id
    date
    inspectorName
    dataSource
    turbine {
      id
      name
    }
    findings {
      id
      category
      severity
      estimatedCost
      notes
    }
    repairPlan {
      id
      priority
      totalEstimatedCost
      snapshotJson
    }
  }
}
```

#### Search Findings
```graphql
query SearchFindings($inspectionId: ID!, $notes: String) {
  findings(inspectionId: $inspectionId, searchNotes: $notes) {
    id
    category
    severity
    estimatedCost
    notes
  }
}
```

#### Filter Inspections by Date Range
```graphql
query FilterInspections(
  $turbineId: ID,
  $startDate: String,
  $endDate: String
) {
  inspections(
    turbineId: $turbineId,
    startDate: $startDate,
    endDate: $endDate,
    limit: 50
  ) {
    data {
      id
      date
      inspectorName
      turbine { name }
    }
    total
  }
}
```

### Example Mutations

#### Login
```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      email
      role
    }
  }
}
```

#### Create Turbine
```graphql
mutation CreateTurbine(
  $name: String!,
  $manufacturer: String,
  $mwRating: Float
) {
  createTurbine(
    name: $name,
    manufacturer: $manufacturer,
    mwRating: $mwRating
  ) {
    id
    name
  }
}
```

#### Create Inspection
```graphql
mutation CreateInspection(
  $turbineId: ID!,
  $date: String!,
  $dataSource: DataSource!
) {
  createInspection(
    turbineId: $turbineId,
    date: $date,
    dataSource: $dataSource
  ) {
    id
    date
    turbine { name }
  }
}
```

#### Create Finding
```graphql
mutation CreateFinding(
  $inspectionId: ID!,
  $category: FindingCategory!,
  $severity: Int!,
  $estimatedCost: Float!,
  $notes: String
) {
  createFinding(
    inspectionId: $inspectionId,
    category: $category,
    severity: $severity,
    estimatedCost: $estimatedCost,
    notes: $notes
  ) {
    id
    category
    severity
    estimatedCost
  }
}
```

#### Generate Repair Plan
```graphql
mutation GeneratePlan($inspectionId: ID!) {
  generateRepairPlan(inspectionId: $inspectionId) {
    id
    priority
    totalEstimatedCost
    createdAt
  }
}
```

---

## Real-Time Updates (SSE)

### Connect to Events Stream
```javascript
const eventSource = new EventSource('http://localhost:4000/api/events');

eventSource.addEventListener('plan', (event) => {
  const data = JSON.parse(event.data);
  console.log('Repair plan generated:', data.inspectionId);
});

eventSource.addEventListener('ping', (event) => {
  console.log('Server ping');
});
```

---

## Error Handling

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Overlapping inspection or unique constraint violation
- `500 Internal Server Error`: Server error

### Error Response Format
```json
{
  "error": "Human-readable error message"
}
```

---

## Rate Limiting & Pagination

- Default page size: 50 items
- Maximum supported: 1000 items per request
- Use `limit` and `offset` parameters for pagination

---

## Documentation

- **REST Spec**: OpenAPI 3.0 at `/api/docs`
- **GraphQL Schema**: SDL at `/graphql` (introspection enabled)
- **Health Check**: `GET /api/healthz`
