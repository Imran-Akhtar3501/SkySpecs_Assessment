import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

const router = Router();

// List turbines
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const [data, total] = await Promise.all([
      prisma.turbine.findMany({
        skip: offset,
        take: limit,
        include: { inspections: true },
      }),
      prisma.turbine.count(),
    ]);

    res.json({ data, total, limit, offset });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single turbine
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const turbine = await prisma.turbine.findUnique({
      where: { id: req.params.id },
      include: { inspections: { include: { findings: true, repairPlan: true } } },
    });

    if (!turbine) {
      return res.status(404).json({ error: 'Turbine not found' });
    }

    res.json(turbine);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create turbine
router.post('/', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { name, manufacturer, mwRating, lat, lng } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }

    const turbine = await prisma.turbine.create({
      data: { name, manufacturer, mwRating, lat, lng },
    });

    res.status(201).json(turbine);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update turbine
router.put('/:id', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { name, manufacturer, mwRating, lat, lng } = req.body;

    const turbine = await prisma.turbine.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(manufacturer !== undefined && { manufacturer }),
        ...(mwRating !== undefined && { mwRating }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
      },
      include: { inspections: true },
    });

    res.json(turbine);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete turbine
router.delete('/:id', authMiddleware, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    await prisma.turbine.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
