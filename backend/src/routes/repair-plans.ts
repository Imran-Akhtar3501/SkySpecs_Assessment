
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { notifyPlan } from '../services/sse.js';

const router = Router();

// GET /inspections/:inspectionId/repair-plan (OpenAPI compliant)
router.get('/inspections/:inspectionId/repair-plan', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { inspectionId } = req.params;
    const repairPlan = await prisma.repairPlan.findUnique({ where: { inspectionId } });
    if (!repairPlan) {
      return res.status(404).json({ error: 'Repair plan not found' });
    }
    res.json(repairPlan);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /inspections/:inspectionId/repair-plan (OpenAPI compliant)
router.post('/inspections/:inspectionId/repair-plan', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { inspectionId } = req.params;
    const { priority, totalEstimatedCost, snapshotJson } = req.body;
    const repairPlan = await prisma.repairPlan.create({
      data: {
        inspectionId,
        priority,
        totalEstimatedCost,
        snapshotJson: snapshotJson !== undefined ? snapshotJson : [],
      },
    });
    res.status(201).json(repairPlan);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /inspections/:inspectionId/repair-plan (OpenAPI compliant)
router.put('/inspections/:inspectionId/repair-plan', authMiddleware, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { inspectionId } = req.params;
    const { priority, totalEstimatedCost, snapshotJson } = req.body;
    const updateData: any = {};
    if (priority) updateData.priority = priority;
    if (totalEstimatedCost !== undefined) updateData.totalEstimatedCost = totalEstimatedCost;
    if (snapshotJson !== undefined) updateData.snapshotJson = snapshotJson;
    const repairPlan = await prisma.repairPlan.update({
      where: { inspectionId },
      data: updateData,
    });
    res.json(repairPlan);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /inspections/:inspectionId/repair-plan (OpenAPI compliant)
router.delete('/inspections/:inspectionId/repair-plan', authMiddleware, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { inspectionId } = req.params;
    await prisma.repairPlan.delete({ where: { inspectionId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get repair plan
router.get('/:inspectionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const plan = await prisma.repairPlan.findUnique({
      where: { inspectionId: req.params.inspectionId },
      include: { inspection: true },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Repair plan not found' });
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List repair plans
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const [data, total] = await Promise.all([
      prisma.repairPlan.findMany({
        skip: offset,
        take: limit,
        include: { inspection: { include: { turbine: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.repairPlan.count(),
    ]);

    res.json({ data, total, limit, offset });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate repair plan
router.post('/:inspectionId', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.inspectionId },
      include: { findings: true, turbine: true },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Apply severity rules
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
      where: { inspectionId: req.params.inspectionId },
      update: {
        priority: priority as any,
        totalEstimatedCost: total,
        snapshotJson: findings,
      },
      create: {
        inspectionId: req.params.inspectionId,
        priority: priority as any,
        totalEstimatedCost: total,
        snapshotJson: findings,
      },
      include: { inspection: { include: { turbine: true } } },
    });

    // Notify connected clients via SSE and WebSocket with plan data
    notifyPlan(req.params.inspectionId, {
      id: plan.id,
      inspectionId: plan.inspectionId,
      priority: plan.priority,
      totalEstimatedCost: plan.totalEstimatedCost,
      createdAt: plan.createdAt,
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
