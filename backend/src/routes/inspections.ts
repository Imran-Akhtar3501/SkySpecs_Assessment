
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { normalizeToDateOnly } from '../utils/date.js';

const router = Router();

// POST /turbines/:turbineId/inspections (OpenAPI compliant)
router.post('/turbines/:turbineId/inspections', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { date, inspectorName, dataSource, rawPackageUrl } = req.body;
    const { turbineId } = req.params;
    if (!turbineId || !date || !dataSource) {
      return res.status(400).json({ error: 'turbineId, date, and dataSource required' });
    }
    const dateObj = normalizeToDateOnly(date);
    // Check for overlapping inspections
    const existing = await prisma.inspection.findFirst({
      where: { turbineId, date: dateObj },
    });
    if (existing) {
      return res.status(409).json({ error: 'Overlapping inspection already exists for this turbine on this date' });
    }
    try {
      const inspection = await prisma.inspection.create({
        data: {
          turbineId,
          date: dateObj,
          inspectorName,
          dataSource,
          rawPackageUrl,
        },
        include: { turbine: true, findings: true, repairPlan: true },
      });
      res.status(201).json(inspection);
    } catch (dbError: any) {
      // Handle unique constraint violation from database
      if (dbError.code === 'P2002' || dbError.message?.includes('Unique constraint')) {
        return res.status(409).json({ 
          error: 'Overlapping inspection already exists for this turbine on this date',
          details: 'An inspection for this turbine on this date already exists in the database',
        });
      }
      throw dbError;
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
// List inspections for a specific turbine (nested route)
router.get('/turbines/:turbineId/inspections', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const { turbineId } = req.params;
    const dataSource = req.query.dataSource as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = { turbineId };
    if (dataSource) where.dataSource = dataSource;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        skip: offset,
        take: limit,
        include: { turbine: true, findings: true, repairPlan: true },
        orderBy: { date: 'desc' },
      }),
      prisma.inspection.count({ where }),
    ]);

    res.json({ data, total, limit, offset });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List inspections with filtering
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const turbineId = req.query.turbineId as string;
    const dataSource = req.query.dataSource as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = {};
    if (turbineId) where.turbineId = turbineId;
    if (dataSource) where.dataSource = dataSource;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        skip: offset,
        take: limit,
        include: { turbine: true, findings: true, repairPlan: true },
        orderBy: { date: 'desc' },
      }),
      prisma.inspection.count({ where }),
    ]);

    res.json({ data, total, limit, offset });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single inspection
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: { turbine: true, findings: true, repairPlan: true },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create inspection
router.post('/', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { turbineId, date, inspectorName, dataSource, rawPackageUrl } = req.body;

    if (!turbineId || !date || !dataSource) {
      return res.status(400).json({ error: 'turbineId, date, and dataSource required' });
    }

    const dateObj = normalizeToDateOnly(date);

    // Check for overlapping inspections
    const existing = await prisma.inspection.findFirst({
      where: { turbineId, date: dateObj },
    });

    if (existing) {
      return res.status(409).json({ error: 'Overlapping inspection already exists for this turbine on this date' });
    }

    const inspection = await prisma.inspection.create({
      data: {
        turbineId,
        date: dateObj,
        inspectorName,
        dataSource,
        rawPackageUrl,
      },
      include: { turbine: true, findings: true, repairPlan: true },
    });

    res.status(201).json(inspection);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update inspection
router.put('/:id', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { date, inspectorName, dataSource, rawPackageUrl } = req.body;
    const inspection = await prisma.inspection.findUnique({ where: { id: req.params.id } });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const dateObj = date ? normalizeToDateOnly(date) : inspection.date;

    // Check for overlapping inspections
    if (date) {
      const existing = await prisma.inspection.findFirst({
        where: {
          turbineId: inspection.turbineId,
          date: dateObj,
          id: { not: req.params.id },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'Overlapping inspection already exists for this turbine on this date' });
      }
    }

    try {
      const updated = await prisma.inspection.update({
        where: { id: req.params.id },
        data: {
          ...(date && { date: dateObj }),
          ...(inspectorName !== undefined && { inspectorName }),
          ...(dataSource && { dataSource }),
          ...(rawPackageUrl !== undefined && { rawPackageUrl }),
        },
        include: { turbine: true, findings: true, repairPlan: true },
      });

      res.json(updated);
    } catch (dbError: any) {
      // Handle unique constraint violation from database
      if (dbError.code === 'P2002' || dbError.message?.includes('Unique constraint')) {
        return res.status(409).json({ 
          error: 'Overlapping inspection already exists for this turbine on this date',
          details: 'An inspection for this turbine on this date already exists in the database',
        });
      }
      throw dbError;
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete inspection
router.delete('/:id', authMiddleware, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    await prisma.inspection.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
