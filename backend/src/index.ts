import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { ApolloServer } from 'apollo-server-express';
import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

// Swagger
const openapiPath = path.join(process.cwd(), 'openapi.yaml');
const openapiDoc = yaml.parse(readFileSync(openapiPath, 'utf8'));
app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(openapiDoc) as any);

// Prisma
const prisma = new PrismaClient();

// Mongo
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const mongoDbName = process.env.MONGO_DB || 'turbineops';
let mongoClient: MongoClient | null = null;
(async () => {
  try {
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    console.log('Mongo connected ✅✅✅');
  } catch (e) {
    console.warn('Mongo unavailable yet:', (e as Error).message);
  }
})();

// Simple REST stubs
app.get('/api/turbines', async (_req, res) => {
  const data = await prisma.turbine.findMany({ take: 50 });
  res.json(data);
});

app.post('/api/turbines', async (req, res) => {
  const { name, manufacturer, mwRating, lat, lng } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const t = await prisma.turbine.create({ data: { name, manufacturer, mwRating, lat, lng } });
  res.status(201).json(t);
});

// SSE for plan notifications
const sseClients = new Set<any>();
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: ping
data: ok

`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function notifyPlan(inspectionId: string) {
  for (const client of sseClients) {
    client.write(`event: plan
data: ${JSON.stringify({ inspectionId, at: new Date().toISOString() })}

`);
  }
}

// GraphQL
const typeDefs = readFileSync(path.join(process.cwd(), 'src/graphql/schema.graphql'), 'utf8');
const resolvers = {
  Query: {
    inspection: async (_: any, { id }: any) => prisma.inspection.findUnique({
      where: { id },
      include: { turbine: true, findings: true, repairPlan: true },
    }),
    repairPlan: async (_: any, { inspectionId }: any) => prisma.repairPlan.findUnique({ where: { inspectionId } }),
  },
  Mutation: {
    generateRepairPlan: async (_: any, { inspectionId }: any) => {
      const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId }, include: { findings: true } });
      if (!inspection) throw new Error('Inspection not found');

      // Severity rule: if category=BLADE_DAMAGE and notes contain "crack", min severity=4
      const adjusted = inspection.findings.map(f => {
        const hasCrack = (f.notes || '').toLowerCase().includes('crack');
        const severity = (f.category === 'BLADE_DAMAGE' && hasCrack) ? Math.max(4, f.severity) : f.severity;
        return { ...f, severity };
      });

      const total = adjusted.reduce((s, f) => s + Number(f.estimatedCost || 0), 0);
      const maxSeverity = Math.max(0, ...adjusted.map(f => f.severity));
      const priority = maxSeverity >= 5 ? 'HIGH' : (maxSeverity >= 3 ? 'MEDIUM' : 'LOW');

      const plan = await prisma.repairPlan.upsert({
        where: { inspectionId },
        update: { priority: priority as any, totalEstimatedCost: total, snapshotJson: adjusted },
        create: { inspectionId, priority: priority as any, totalEstimatedCost: total, snapshotJson: adjusted },
      });

      notifyPlan(inspectionId);

      // mongo log (best-effort)
      try {
        if (mongoClient) {
          const db = mongoClient.db(mongoDbName);
          await db.collection('ingestion_logs').insertOne({
            kind: 'PLAN_GENERATED',
            inspectionId,
            at: new Date(),
            total,
            priority,
          });
        }
      } catch {}

      return plan;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();
server.applyMiddleware({ app: app as any, path: '/graphql' });

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Backend on http://localhost:${port} 🌐🌐🌐`));
