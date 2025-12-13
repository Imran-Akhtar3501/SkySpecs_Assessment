# TurbineOps Lite — Case Study Starter

A scaffold for candidates to implement the **Turbine → Inspection → Findings → Repair Plan** workflow.

## Quick Start

```bash
# 1) bootstrap
make dev-up
# wait a bit for DBs to be ready

# 2) run migrations & seed
make migrate
make seed

# 3) dev servers
make backend
make frontend

# Open: http://localhost:5173  (frontend)
# REST base: http://localhost:4000/api
# GraphQL:   http://localhost:4000/graphql
```

See `docs/INSTALL.md` and `docs/API.md` for details.
