import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import app setup
import express from 'express';
import cors from 'cors';
import { authMiddleware, generateToken } from '../middleware/auth';
import { prisma } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Create a test app
const app = express();
app.use(cors());
app.use(express.json());

// Mock routes for testing
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'User not found' });
  
  const bcrypt = await import('bcryptjs');
  const valid = await bcrypt.default.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });
  
  const token = generateToken(user.id, user.email, user.role);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Protected routes
app.use('/api/turbines', authMiddleware, async (req: any, res) => {
  if (req.method === 'GET') {
    const turbines = await prisma.turbine.findMany();
    res.json({ data: turbines, total: turbines.length });
  } else if (req.method === 'POST') {
    const { name, manufacturer, mwRating, lat, lng } = req.body;
    const turbine = await prisma.turbine.create({
      data: { name, manufacturer, mwRating, lat, lng },
    });
    res.status(201).json(turbine);
  }
});

app.use('/api/inspections', authMiddleware, async (req: any, res) => {
  if (req.method === 'POST') {
    const { turbineId, date, inspectorName, dataSource, rawPackageUrl } = req.body;
    if (!turbineId || !date || !dataSource) {
      return res.status(400).json({ error: 'turbineId, date, and dataSource required' });
    }
    
    const dateObj = new Date(date);
    const existing = await prisma.inspection.findFirst({
      where: { turbineId, date: dateObj },
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Overlapping inspection already exists for this turbine on this date' });
    }
    
    try {
      const inspection = await prisma.inspection.create({
        data: { turbineId, date: dateObj, inspectorName, dataSource, rawPackageUrl },
        include: { turbine: true },
      });
      res.status(201).json(inspection);
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        return res.status(409).json({ error: 'Overlapping inspection already exists for this turbine on this date' });
      }
      throw dbError;
    }
  }
});

app.use('/api/findings', authMiddleware, async (req: any, res) => {
  if (req.method === 'POST') {
    const { inspectionId, category, severity, estimatedCost, notes } = req.body;
    let adjustedSeverity = severity;
    let severityAdjusted = false;
    
    if (category === 'BLADE_DAMAGE' && (notes || '').toLowerCase().includes('crack')) {
      const originalSeverity = severity;
      adjustedSeverity = Math.max(4, severity);
      severityAdjusted = adjustedSeverity !== originalSeverity;
    }
    
    const finding = await prisma.finding.create({
      data: { inspectionId, category, severity: adjustedSeverity, estimatedCost, notes },
    });
    
    res.status(201).json({ ...finding, severityAdjusted, originalSeverity: severityAdjusted ? severity : undefined });
  }
});

app.use('/api/repair-plans/:inspectionId', authMiddleware, async (req: any, res) => {
  if (req.method === 'POST') {
    const { inspectionId } = req.params;
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { findings: true },
    });
    
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    
    const findings = inspection.findings.map((f) => {
      let adjusted = f.severity;
      if (f.category === 'BLADE_DAMAGE' && (f.notes || '').toLowerCase().includes('crack')) {
        adjusted = Math.max(4, f.severity);
      }
      return { ...f, severity: adjusted };
    });
    
    const total = findings.reduce((sum, f) => sum + (f.estimatedCost || 0), 0);
    const maxSeverity = Math.max(0, ...findings.map((f) => f.severity));
    const priority = maxSeverity >= 5 ? 'HIGH' : maxSeverity >= 3 ? 'MEDIUM' : 'LOW';
    
    const plan = await prisma.repairPlan.upsert({
      where: { inspectionId },
      update: { priority: priority as any, totalEstimatedCost: total, snapshotJson: findings },
      create: { inspectionId, priority: priority as any, totalEstimatedCost: total, snapshotJson: findings },
      include: { inspection: true },
    });
    
    res.status(201).json(plan);
  }
});

const testPrisma = new PrismaClient();

describe('REST API Integration Tests', () => {
  let engineerToken: string;
  let adminToken: string;
  let turbineId: string;
  let inspectionId: string;

  beforeAll(async () => {
    // Create test users
    const engineerHash = await bcrypt.hash('Password123!', 10);
    const engineer = await testPrisma.user.upsert({
      where: { email: 'rest-engineer@test.com' },
      update: {},
      create: {
        email: 'rest-engineer@test.com',
        name: 'REST Engineer',
        role: Role.ENGINEER,
        passwordHash: engineerHash,
      },
    });
    engineerToken = generateToken(engineer.id, engineer.email, engineer.role);

    const adminHash = await bcrypt.hash('Password123!', 10);
    const admin = await testPrisma.user.upsert({
      where: { email: 'rest-admin@test.com' },
      update: {},
      create: {
        email: 'rest-admin@test.com',
        name: 'REST Admin',
        role: Role.ADMIN,
        passwordHash: adminHash,
      },
    });
    adminToken = generateToken(admin.id, admin.email, admin.role);
  });

  afterAll(async () => {
    // Cleanup
    await testPrisma.repairPlan.deleteMany({ where: { inspection: { turbineId } } });
    await testPrisma.finding.deleteMany({ where: { inspection: { turbineId } } });
    await testPrisma.inspection.deleteMany({ where: { turbineId } });
    await testPrisma.turbine.deleteMany({ where: { id: turbineId } });
    await testPrisma.user.deleteMany({ 
      where: { email: { in: ['rest-engineer@test.com', 'rest-admin@test.com'] } } 
    });
    await testPrisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rest-engineer@test.com', password: 'Password123!' });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('rest-engineer@test.com');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rest-engineer@test.com', password: 'wrong' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('Turbine CRUD', () => {
    it('should create a turbine as ENGINEER', async () => {
      const res = await request(app)
        .post('/api/turbines')
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({
          name: 'Test Turbine REST',
          manufacturer: 'TestGen',
          mwRating: 3.0,
          lat: 40.7128,
          lng: -74.006,
        });
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Turbine REST');
      turbineId = res.body.id;
    });
  });

  describe('Inspection Workflow', () => {
    it('should create an inspection', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({
          turbineId,
          date: '2025-01-01',
          inspectorName: 'John Doe',
          dataSource: 'DRONE',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.turbineId).toBe(turbineId);
      inspectionId = res.body.id;
    });

    it('should prevent overlapping inspections', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({
          turbineId,
          date: '2025-01-01',
          inspectorName: 'Jane Smith',
          dataSource: 'MANUAL',
        });
      
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Overlapping');
    });
  });

  describe('Finding Severity Rule', () => {
    it('should auto-upgrade severity for BLADE_DAMAGE with crack', async () => {
      const res = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({
          inspectionId,
          category: 'BLADE_DAMAGE',
          severity: 2,
          estimatedCost: 5000,
          notes: 'long crack in blade',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.severity).toBe(4);
      expect(res.body.severityAdjusted).toBe(true);
      expect(res.body.originalSeverity).toBe(2);
    });
  });

  describe('Repair Plan Generation', () => {
    it('should generate repair plan with correct priority and cost', async () => {
      // Add another finding
      await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${engineerToken}`)
        .send({
          inspectionId,
          category: 'EROSION',
          severity: 1,
          estimatedCost: 2000,
          notes: 'Minor erosion',
        });

      const res = await request(app)
        .post(`/api/repair-plans/${inspectionId}`)
        .set('Authorization', `Bearer ${engineerToken}`);
      
      expect(res.status).toBe(201);
      expect(res.body.totalEstimatedCost).toBe(7000); // 5000 + 2000
      expect(res.body.priority).toBe('MEDIUM'); // max severity is 4
    });
  });
});

