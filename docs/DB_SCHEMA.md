# DB Schema (Prisma → Postgres)

Entities:
- Turbine (1) —< Inspection (n) —< Finding (n)
- RepairPlan (1) — snapshot JSON of findings + totals
- User (seeded) with role enum ADMIN | ENGINEER | VIEWER
- IngestionLog in Mongo (linked by inspectionId)

Indexes:
- Inspection (turbineId, date)
- Finding (inspectionId)
