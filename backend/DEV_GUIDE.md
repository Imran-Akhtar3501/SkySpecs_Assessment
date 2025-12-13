# Backend Development Guide

## Hot Reload Development Server

The backend now includes automatic restart functionality when you make changes to files.

### Starting the Dev Server

```bash
cd backend
npm run dev
```

The server will:
1. ✅ Start on `http://localhost:4000`
2. ✅ Watch all files in the `src/` directory
3. ✅ Automatically restart when you save changes
4. ✅ Display TypeScript compilation errors immediately

### Available Endpoints While Developing

- **REST API**: `http://localhost:4000/api/*`
- **GraphQL**: `http://localhost:4000/graphql`
- **API Docs**: `http://localhost:4000/api/docs`
- **Health Check**: `http://localhost:4000/api/healthz`

---

## Development Workflow

### 1. Start Dev Server
```bash
npm run dev
# Watch mode enabled - server restarts on file changes
```

### 2. Make Changes
Edit any file in `src/`:
- `src/index.ts` - REST endpoints
- `src/graphql/resolvers.ts` - GraphQL logic
- `src/middleware/auth.ts` - Authentication
- `src/__tests__/*.ts` - Tests

### 3. See Changes Immediately
Save your file → Server automatically restarts → No manual intervention needed

### 4. Run Tests in Parallel
In another terminal:
```bash
npm test -- --watch
# Tests re-run when you save files
```

---

## File Structure

```
backend/src/
├── index.ts                 # Main server (REST + GraphQL setup)
├── seed.ts                  # Database seeding
├── middleware/
│   └── auth.ts             # JWT & RBAC middleware
├── graphql/
│   ├── schema.graphql      # GraphQL type definitions
│   └── resolvers.ts        # GraphQL resolver functions
└── __tests__/
    ├── workflow.test.ts    # Business logic tests
    ├── graphql.integration.test.ts  # API tests
    └── rules.test.ts       # Rule validation tests
```

---

## Common Development Tasks

### Add a New REST Endpoint

Edit `src/index.ts`:
```typescript
// Example: GET endpoint
app.get('/api/my-endpoint', authMiddleware, async (req, res) => {
  try {
    // Your logic here
    res.json({ data: 'value' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
```

**Watch Mode**: Save → Server restarts → Test immediately

### Add a New GraphQL Mutation

Edit `src/graphql/schema.graphql`:
```graphql
type Mutation {
  myMutation(id: ID!): Result!
}
```

Edit `src/graphql/resolvers.ts`:
```typescript
Mutation: {
  myMutation: async (_, { id }, context) => {
    requireAuth(context);
    // Your logic here
  }
}
```

**Watch Mode**: Save → Server restarts → Test in Apollo Sandbox

### Modify Database Schema

Edit `backend/prisma/schema.prisma`:
```prisma
model MyModel {
  id      String  @id @default(cuid())
  name    String
}
```

Apply migration:
```bash
npm run prisma:migrate
```

**Note**: Migrations don't auto-apply; run manually then save files to trigger restart

---

## Testing During Development

### Run All Tests
```bash
npm test
```

### Watch Mode (Recommended)
```bash
npm test -- --watch
# Re-runs tests when files change
```

### Run Specific Test File
```bash
npm test -- workflow.test.ts
npm test -- graphql.integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## Debugging

### Check Server Logs
The dev server outputs all GraphQL operations and errors to console:

```
🚀 Backend running on http://localhost:4000
📚 GraphQL: http://localhost:4000/graphql
📖 API Docs: http://localhost:4000/api/docs
```

### TypeScript Errors
Compilation errors are shown immediately:
```
ERROR [14:48:41] Error: Property 'xyz' does not exist
```

### Database Errors
Prisma errors are logged with full context:
```
PrismaClientValidationError: Unknown field in where clause
```

---

## Environment Setup

### Create `.env` File
```bash
cd backend
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/turbineops
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=your-dev-secret-key
PORT=4000
NODE_ENV=development
EOF
```

### Verify Connection
```bash
npm run dev
# Should see: "✅ Mongo connected" (if MongoDB running)
```

---

## Performance Tips

### Reduce Watch Latency
The `--watch` flag automatically recompiles TypeScript:
- Typically **1-2 seconds** from save to restart
- If slower, check CPU/disk usage

### Optimize Large Projects
```bash
# Build once and run
npm run build
npm start
```

### Skip Tests During Dev
If tests slow you down:
```bash
# Dev only (no tests)
npm run dev

# Separate terminal for tests
npm test -- --watch
```

---

## Troubleshooting

### Server Won't Start

**Problem**: `Error: Cannot find module`
```bash
# Solution: Regenerate Prisma client
npm run prisma:generate
```

**Problem**: `Port 4000 already in use`
```bash
# Kill process on port 4000
# On Linux/Mac:
lsof -ti:4000 | xargs kill -9

# On Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Watch Mode Not Triggering

**Problem**: Changes not detected
```bash
# Solution: Check file is being saved
# Ensure editor auto-save is enabled or save manually (Ctrl+S)
```

**Problem**: Only some files trigger restart
```bash
# Watch mode monitors src/ directory
# Ensure files are in backend/src/
```

### GraphQL Queries Not Updated

**Problem**: Old queries still work
```bash
# Solution: Apollo Sandbox caches queries
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## Build for Production

### Compile TypeScript
```bash
npm run build
# Creates dist/ folder with compiled JavaScript
```

### Start Production Server
```bash
npm start
# Runs compiled code (no watch mode)
```

### Docker Build
```bash
docker build -f Dockerfile.backend -t turbineops-backend:latest .
docker run -p 4000:4000 turbineops-backend:latest
```

---

## IDE Configuration

### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### VS Code Extensions (Recommended)
- **ES7+ React/Redux/React-Native snippets**
- **Thunder Client** (API testing)
- **Apollo GraphQL**
- **Prisma**

---

## API Testing During Development

### cURL
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.token')

# Create turbine
curl -X POST http://localhost:4000/api/turbines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"T-Test"}'
```

### GraphQL (Apollo Sandbox)
1. Open `http://localhost:4000/graphql`
2. Add Authorization header in settings:
   ```json
   {
     "Authorization": "Bearer YOUR_TOKEN"
   }
   ```
3. Run queries

### Thunder Client (VS Code)
1. Install extension
2. Create requests with Bearer token
3. Test endpoints as you code

---

## Next Steps

1. **Start Server**: `npm run dev`
2. **Make Changes**: Edit files in `src/`
3. **See Results**: Server restarts automatically
4. **Run Tests**: `npm test -- --watch`
5. **Commit**: `git add . && git commit -m "..."`

Happy coding! 🚀
