import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { ApolloServer } from 'apollo-server-express';
import { initializeMongo } from './config/database.js';
import { getSseClients, setIOServer } from './services/sse.js';
import { authMiddleware, getAuthContext, type AuthRequest } from './middleware/auth.js';
import { resolvers as graphqlResolvers, type GraphQLContext } from './graphql/resolvers.js';
import authRoutes from './routes/auth.js';
import turbineRoutes from './routes/turbines.js';
import inspectionRoutes from './routes/inspections.js';
import findingRoutes from './routes/findings.js';
import repairPlanRoutes from './routes/repair-plans.js';

const app = express();
const httpServer = createServer(app);

// WebSocket Server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5173', 'http://127.0.0.1:4000'],
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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5173', 'http://127.0.0.1:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
const schemaPath = path.join(process.cwd(), 'src/graphql/schema.graphql');
const typeDefs = readFileSync(schemaPath, 'utf8');

const server = new ApolloServer({
  typeDefs,
  resolvers: graphqlResolvers,
  context: ({ req }: any) => {
    const authContext = getAuthContext(req as AuthRequest);
    return authContext as GraphQLContext;
  },
});

// Server startup
const port = Number(process.env.PORT || 4000);

(async () => {
  try {
    await server.start();
    server.applyMiddleware({
      app: app as any,
      path: '/graphql',
      cors: { origin: true, credentials: true },
    });

    await initializeMongo();
    
    await new Promise<void>((resolve) => {
      httpServer.listen(port, () => {
        console.log(`🚀 Backend running on http://localhost:${port}`);
        console.log(`📚 GraphQL: http://localhost:${port}/graphql`);
        console.log(`📖 API Docs: http://localhost:${port}/api/docs`);
        console.log(`🔌 WebSocket: ws://localhost:${port}`);
        console.log(`📡 SSE: http://localhost:${port}/sse/repairplans`);
        console.log('✅ Ready to use');
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
