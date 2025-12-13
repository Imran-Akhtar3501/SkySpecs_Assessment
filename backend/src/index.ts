import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { ApolloServer } from 'apollo-server-express';
import { initializeMongo } from './config/database.js';
import { getSseClients, setIOServer } from './services/sse.js';
import { authMiddleware, getAuthContext, verifyToken, type AuthRequest } from './middleware/auth.js';
import { resolvers as graphqlResolvers, type GraphQLContext } from './graphql/resolvers.js';
import authRoutes from './routes/auth.js';
import turbineRoutes from './routes/turbines.js';
import inspectionRoutes from './routes/inspections.js';
import findingRoutes from './routes/findings.js';
import repairPlanRoutes from './routes/repair-plans.js';

const app = express();
const httpServer = createServer(app);

// WebSocket Server
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5173', 'http://127.0.0.1:4000'];

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setIOServer(io);

io.on('connection', (socket) => {
  console.log('WebSocket client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected:', socket.id);
  });
});

// Middleware
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173',
      'http://127.0.0.1:4000',
      'https://studio.apollographql.com', // Apollo Studio
    ];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apollographql-client-name', 'apollographql-client-version'],
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

// Swagger
const openapiPath = path.join(process.cwd(), 'openapi.yaml');
const openapiDoc = yaml.parse(readFileSync(openapiPath, 'utf8'));
app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(openapiDoc) as any);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/turbines', turbineRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/findings', findingRoutes);
app.use('/api/repair-plans', repairPlanRoutes);

// SSE Events - fallback for clients that don't support WebSocket
app.get('/sse/repairplans', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
  res.write(`event: ping\ndata: ${JSON.stringify({ ok: true, at: new Date().toISOString() })}\n\n`);
  getSseClients().add(res);
  req.on('close', () => getSseClients().delete(res));
});

// Legacy SSE endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: ping\ndata: ok\n\n`);
  getSseClients().add(res);
  req.on('close', () => getSseClients().delete(res));
});

// GraphQL
// Try multiple paths to find schema file (works in dev and production)
let schemaPath = path.join(process.cwd(), 'src/graphql/schema.graphql');
if (!existsSync(schemaPath)) {
  schemaPath = path.join(process.cwd(), 'backend/src/graphql/schema.graphql');
}
if (!existsSync(schemaPath)) {
  schemaPath = path.join(__dirname, '../graphql/schema.graphql');
}

if (!existsSync(schemaPath)) {
  console.error('❌ GraphQL schema file not found! Tried:', [
    path.join(process.cwd(), 'src/graphql/schema.graphql'),
    path.join(process.cwd(), 'backend/src/graphql/schema.graphql'),
    path.join(__dirname, '../graphql/schema.graphql'),
  ]);
  process.exit(1);
}

const typeDefs = readFileSync(schemaPath, 'utf8');
console.log(`📋 GraphQL schema loaded from: ${schemaPath}`);

const server = new ApolloServer({
  typeDefs,
  resolvers: graphqlResolvers,
  introspection: true, // Enable introspection for Apollo Studio
  context: ({ req, connection }: any) => {
    // Handle both HTTP requests and WebSocket connections
    // For HTTP requests, use req; for subscriptions, use connection
    const request = req || connection?.context?.req;
    
    if (!request) {
      return {
        userId: undefined,
        email: undefined,
        role: undefined,
        isAuthenticated: false,
      } as GraphQLContext;
    }
    
    // Extract token from Authorization header for GraphQL
    // Express normalizes headers to lowercase, so check 'authorization' first
    const authHeader = 
      request.headers?.authorization || 
      request.headers?.Authorization ||
      request.headers?.['authorization'] ||
      request.headers?.['Authorization'] ||
      (request.header && typeof request.header === 'function' ? request.header('authorization') : null) ||
      (request.header && typeof request.header === 'function' ? request.header('Authorization') : null);
    
    let token: string | undefined;
    
    if (authHeader) {
      // Handle both "Bearer token" and just "token"
      const headerValue = typeof authHeader === 'string' ? authHeader : authHeader[0];
      token = headerValue?.startsWith('Bearer ') 
        ? headerValue.replace('Bearer ', '').trim() 
        : headerValue?.trim();
    }
    
    // If token exists, verify it and set user context
    if (token) {
      try {
        const decoded = verifyToken(token);
        console.log('✅ GraphQL: Token verified for user:', decoded.email);
        return {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          isAuthenticated: true,
        } as GraphQLContext;
      } catch (error: any) {
        console.log('❌ GraphQL: Token verification failed:', error.message);
        // Token invalid, return unauthenticated context
        return {
          userId: undefined,
          email: undefined,
          role: undefined,
          isAuthenticated: false,
        } as GraphQLContext;
      }
    }
    
    // Debug: log when no token is found
    console.log('⚠️ GraphQL: No authorization token found. Headers:', {
      authorization: request.headers?.authorization,
      Authorization: request.headers?.Authorization,
      allHeaders: Object.keys(request.headers || {}),
    });
    
    // No token provided, return unauthenticated context
    return {
      userId: undefined,
      email: undefined,
      role: undefined,
      isAuthenticated: false,
    } as GraphQLContext;
  },
  // Allow Apollo Studio to connect
  csrfPrevention: false, // Disable CSRF for local development
  cache: 'bounded',
});

// Server startup
const port = Number(process.env.PORT || 4000);

(async () => {
  try {
    await server.start();
    server.applyMiddleware({
      app: app as any,
      path: '/graphql',
      cors: false, // CORS is already handled by Express middleware above
    });

    await initializeMongo();
    
    await new Promise<void>((resolve) => {
      httpServer.listen(port, '0.0.0.0', () => {
        const host = process.env.HOST || 'localhost';
        console.log(`🚀 Backend running on http://${host}:${port}`);
        console.log(`📚 GraphQL: http://${host}:${port}/graphql`);
        console.log(`📖 API Docs: http://${host}:${port}/api/docs`);
        console.log(`🔌 WebSocket: ws://${host}:${port}`);
        console.log(`📡 SSE: http://${host}:${port}/sse/repairplans`);
        console.log('✅ Ready to use');
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
