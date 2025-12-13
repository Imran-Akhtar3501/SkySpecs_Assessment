# Quick Start Guide - Running Backend & Frontend Locally

## Prerequisites

- **Node.js 20+** and npm installed
- **Docker & Docker Compose** installed and running
- **Git** (if cloning the repository)

## Step-by-Step Setup

### 1. Start Database Services

Open a terminal and start PostgreSQL and MongoDB:

```bash
docker compose up -d postgres mongo
```

Wait 10-15 seconds for databases to be ready. Verify with:

```bash
docker compose ps
```

You should see both services as "healthy".

### 2. Setup Backend

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Install Dependencies

```bash
npm install
```

#### 2.3 Create Environment File

Create a `.env` file in the `backend` directory:

```bash
# Windows (PowerShell)
@"
DATABASE_URL=postgresql://app:app@localhost:5432/turbineops
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=dev-secret-key-change-in-prod
PORT=4000
"@ | Out-File -FilePath .env -Encoding utf8

# Linux/Mac
cat > .env << EOF
DATABASE_URL=postgresql://app:app@localhost:5432/turbineops
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=dev-secret-key-change-in-prod
PORT=4000
EOF
```

Or manually create `.env` with:
```
DATABASE_URL=postgresql://app:app@localhost:5432/turbineops
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=dev-secret-key-change-in-prod
PORT=4000
```

#### 2.4 Generate Prisma Client

```bash
npm run prisma:generate
```

#### 2.5 Run Database Migrations

```bash
npm run prisma:migrate
```

#### 2.6 Seed Database (Create Test Users)

```bash
npm run seed
```

This creates:
- `admin@example.com` / `Password123!` (ADMIN)
- `engineer@example.com` / `Password123!` (ENGINEER)
- `viewer@example.com` / `Password123!` (VIEWER)

#### 2.7 Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Backend running on http://localhost:4000
📚 GraphQL: http://localhost:4000/graphql
📖 API Docs: http://localhost:4000/api/docs
🔌 WebSocket: ws://localhost:4000
📡 SSE: http://localhost:4000/sse/repairplans
✅ Ready to use
```

**Keep this terminal open!**

### 3. Setup Frontend

Open a **NEW terminal** (keep backend running):

#### 3.1 Navigate to Frontend Directory

```bash
cd frontend
```

#### 3.2 Install Dependencies

```bash
npm install
```

#### 3.3 Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Keep this terminal open too!**

## 4. Access the Application

### Frontend
Open your browser and go to:
```
http://localhost:5173
```

### Backend Endpoints
- **REST API**: http://localhost:4000/api
- **GraphQL Playground**: http://localhost:4000/graphql
- **API Documentation**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/health

## 5. Test the Application

### Login
1. Go to http://localhost:5173
2. You'll be redirected to the login page
3. Login with:
   - Email: `engineer@example.com`
   - Password: `Password123!`

### Test Workflow
1. **Create a Turbine**: Click "Add Turbine" and fill in the form
2. **Create an Inspection**: Click "View Inspections" → "Add Inspection"
3. **Add Findings**: Click "View Findings" → "Add Finding"
   - Try creating a finding with category `BLADE_DAMAGE` and notes containing "crack" with severity 2
   - Notice it auto-upgrades to severity 4!
4. **Generate Repair Plan**: Click "Generate Repair Plan"
5. **View Repair Plans**: Navigate to "Repair Plans" page
   - You should see real-time updates when new plans are created

## Troubleshooting

### Backend Won't Start

**Database Connection Error:**
```bash
# Check if PostgreSQL is running
docker compose ps

# Restart if needed
docker compose restart postgres

# Check logs
docker compose logs postgres
```

**Port 4000 Already in Use:**
- Change `PORT` in `backend/.env` to another port (e.g., `4001`)
- Update frontend API URL if needed

**Prisma Errors:**
```bash
# Reset and re-run migrations
cd backend
npm run prisma:migrate reset
npm run prisma:migrate
npm run seed
```

### Frontend Won't Start

**Port 5173 Already in Use:**
- Vite will automatically use the next available port
- Check the terminal output for the actual port

**API Connection Errors:**
- Ensure backend is running on http://localhost:4000
- Check browser console for CORS errors
- Verify `VITE_API_BASE` in `frontend/vite.config.ts` (defaults to `http://localhost:4000`)

### Database Issues

**Reset Everything:**
```bash
# Stop containers
docker compose down -v

# Start fresh
docker compose up -d postgres mongo

# Wait 10 seconds, then:
cd backend
npm run prisma:migrate
npm run seed
```

## Running in Watch Mode

### Backend (Auto-reload on changes)
```bash
cd backend
npm run dev:watch
```

### Frontend (Auto-reload on changes)
Frontend already auto-reloads with `npm run dev` (Vite hot module replacement)

## Stopping Services

### Stop Frontend
Press `Ctrl+C` in the frontend terminal

### Stop Backend
Press `Ctrl+C` in the backend terminal

### Stop Databases
```bash
docker compose down
```

Or to remove volumes (deletes all data):
```bash
docker compose down -v
```

## Next Steps

- Read [INSTALL.md](docs/INSTALL.md) for detailed setup
- Check [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
- Review [TESTING.md](docs/TESTING.md) to run tests
- Explore [API.md](docs/API.md) for API documentation

## Quick Commands Reference

```bash
# Start databases
docker compose up -d postgres mongo

# Backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev

# Frontend (in new terminal)
cd frontend
npm install
npm run dev

# Run tests
npm test                    # From root - runs all tests
npm run test:backend        # Backend only
npm run test:frontend       # Frontend only
```


