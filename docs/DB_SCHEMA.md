# Database Schema Documentation

## Overview

The SkySpecs platform uses PostgreSQL as the primary database, managed through Prisma ORM. MongoDB is optionally used for NoSQL logging of inspection events.

## PostgreSQL Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                 │
├─────────────────────────────────────────────────────────────┤
│ id: String (PK, default: cuid)                              │
│ email: String (UNIQUE)                                      │
│ name: String                                                │
│ passwordHash: String                                        │
│ role: Role (ADMIN | ENGINEER | VIEWER)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TURBINE                                │
├─────────────────────────────────────────────────────────────┤
│ id: String (PK, default: cuid)                              │
│ name: String                                                │
│ manufacturer: String?                                       │
│ mwRating: Float?                                            │
│ lat: Float?                                                 │
│ lng: Float?                                                 │
│ createdAt: DateTime (default: now)                          │
│ updatedAt: DateTime (auto-update)                           │
│ ─────────────────────────────────────────────────────────   │
│ Indexes: none (default PK index)                            │
│ Relations: 1:N Inspection                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    INSPECTION                               │
├─────────────────────────────────────────────────────────────┤
│ id: String (PK, default: cuid)                              │
│ turbineId: String (FK → Turbine.id, CASCADE DELETE)         │
│ date: DateTime                                              │
│ inspectorName: String?                                      │
│ dataSource: DataSource (DRONE | MANUAL)                     │
│ rawPackageUrl: String?                                      │
│ createdAt: DateTime (default: now)                          │
│ updatedAt: DateTime (auto-update)                           │
│ ─────────────────────────────────────────────────────────   │
│ UNIQUE: (turbineId, date) ← Prevents overlapping           │
│ INDEX: (turbineId, date)                                    │
│ Relations: 1:N Finding, 1:1 RepairPlan                      │
└─────────────────────────────────────────────────────────────┘
                    ▲           │
        ┌───────────┴───────────┴────────────┐
        │                                    │
      1:N                                  1:1
        │                                    │
        ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     FINDING                                 │
├─────────────────────────────────────────────────────────────┤
│ id: String (PK, default: cuid)                              │
│ inspectionId: String (FK → Inspection.id, CASCADE DELETE)   │
│ category: FindingCategory                                   │
│ severity: Int (1-10)                                        │
│ estimatedCost: Float                                        │
│ notes: String?                                              │
│ createdAt: DateTime (default: now)                          │
│ updatedAt: DateTime (auto-update)                           │
│ ─────────────────────────────────────────────────────────   │
│ INDEX: (inspectionId)                                       │
│ Relations: N:1 Inspection                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   REPAIR_PLAN                               │
├─────────────────────────────────────────────────────────────┤
│ id: String (PK, default: cuid)                              │
│ inspectionId: String (FK → Inspection.id, UNIQUE, CASCADE)  │
│ priority: Priority (LOW | MEDIUM | HIGH)                    │
│ totalEstimatedCost: Float                                   │
│ snapshotJson: Json (Array of findings with rules applied)   │
│ createdAt: DateTime (default: now)                          │
│ updatedAt: DateTime (auto-update)                           │
│ ─────────────────────────────────────────────────────────   │
│ UNIQUE: (inspectionId) ← One plan per inspection           │
│ Relations: 1:1 Inspection                                   │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Schema

#### User Table
```sql
CREATE TABLE "User" (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ENGINEER', 'VIEWER'))
);
```

**Purpose**: Authentication and role-based access control
**Constraints**:
- `email` UNIQUE: Each user has unique email for login
- `role` CHECK: Ensures valid role values

**Seeded Users** (all with password `Password123!`):
- admin@example.com (ADMIN)
- engineer@example.com (ENGINEER)
- viewer@example.com (VIEWER)

---

#### Turbine Table
```sql
CREATE TABLE "Turbine" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  mwRating DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store wind turbine master data
**Fields**:
- `name`: Turbine identifier (e.g., "T-1000")
- `manufacturer`: Optional manufacturer name
- `mwRating`: Optional megawatt power rating
- `lat`, `lng`: Optional GPS coordinates

**Indexes**: Default PK index

---

#### Inspection Table
```sql
CREATE TABLE "Inspection" (
  id TEXT PRIMARY KEY NOT NULL,
  turbineId TEXT NOT NULL REFERENCES "Turbine"(id) ON DELETE CASCADE,
  date TIMESTAMP(3) NOT NULL,
  inspectorName TEXT,
  dataSource TEXT NOT NULL CHECK (dataSource IN ('DRONE', 'MANUAL')),
  rawPackageUrl TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (turbineId, date),
  FOREIGN KEY (turbineId) REFERENCES "Turbine"(id) ON DELETE CASCADE
);

CREATE INDEX "Inspection_turbineId_date_idx" ON "Inspection"(turbineId, date);
```

**Purpose**: Track turbine inspections

**Constraints**:
- **UNIQUE(turbineId, date)**: Prevents overlapping inspections on same turbine/date
- **FK to Turbine**: CASCADE DELETE when turbine deleted
- `dataSource` CHECK: DRONE or MANUAL

**Indexes**:
- Composite on `(turbineId, date)` for filtering and overlap checks

---

#### Finding Table
```sql
CREATE TABLE "Finding" (
  id TEXT PRIMARY KEY NOT NULL,
  inspectionId TEXT NOT NULL REFERENCES "Inspection"(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('BLADE_DAMAGE', 'LIGHTNING', 'EROSION', 'UNKNOWN')),
  severity INTEGER NOT NULL,
  estimatedCost DOUBLE PRECISION NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (inspectionId) REFERENCES "Inspection"(id) ON DELETE CASCADE
);

CREATE INDEX "Finding_inspectionId_idx" ON "Finding"(inspectionId);
```

**Purpose**: Store individual defects/issues found during inspection

**Business Logic**:
- **Severity Rule**: If category=BLADE_DAMAGE and notes contain "crack", enforce min severity=4

**Constraints**:
- FK to Inspection: CASCADE DELETE
- `category` CHECK: Valid finding types only

---

#### RepairPlan Table
```sql
CREATE TABLE "RepairPlan" (
  id TEXT PRIMARY KEY NOT NULL,
  inspectionId TEXT UNIQUE NOT NULL REFERENCES "Inspection"(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  totalEstimatedCost DOUBLE PRECISION NOT NULL,
  snapshotJson JSON NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (inspectionId) REFERENCES "Inspection"(id) ON DELETE CASCADE
);
```

**Purpose**: Aggregated repair plan generated from inspection findings

**Fields**:
- `priority`: Calculated based on max finding severity
  - HIGH: max severity ≥ 5
  - MEDIUM: max severity 3-4
  - LOW: max severity < 3
- `totalEstimatedCost`: Sum of all finding costs
- `snapshotJson`: JSON array of findings with rules applied

**Constraints**:
- **UNIQUE(inspectionId)**: One repair plan per inspection

---

## Migrations

All schema changes tracked via Prisma migrations in:
```
backend/prisma/migrations/
```

To apply migrations:
```bash
npm run prisma:migrate
```

---

## Seeding

Initial data seeded via:
```bash
npm run seed
```

Creates:
- 3 test users (admin, engineer, viewer)
- 1 sample turbine (T-1000)
