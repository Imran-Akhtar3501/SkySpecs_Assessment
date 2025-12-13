
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

const router = Router();

// POST /inspections/:inspectionId/findings (OpenAPI compliant)
router.post('/inspections/:inspectionId/findings', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { inspectionId } = req.params;
    const { category, severity, estimatedCost, notes } = req.body;
    if (!inspectionId || !category || severity === undefined || estimatedCost === undefined) {
      return res.status(400).json({ error: 'inspectionId, category, severity, and estimatedCost required' });
    }
    // Apply severity rule: BLADE_DAMAGE + "crack" => severity >= 4
    let adjustedSeverity = severity;
    let severityAdjusted = false;
    if (category === 'BLADE_DAMAGE' && (notes || '').toLowerCase().includes('crack')) {
      const originalSeverity = severity;
      adjustedSeverity = Math.max(4, severity);
      severityAdjusted = adjustedSeverity !== originalSeverity;
      if (severityAdjusted) {
        console.log(JSON.stringify({
          level: 'info',
          message: 'Finding severity auto-upgraded',
          finding: { category, originalSeverity, adjustedSeverity, notes },
          rule: 'BLADE_DAMAGE with crack requires severity >= 4',
        }));
      }
    }
    const finding = await prisma.finding.create({
      data: {
        inspectionId,
        category,
        severity: adjustedSeverity,
        estimatedCost,
        notes,
      },
      include: { inspection: true },
    });
    res.status(201).json({
      ...finding,
      originalSeverity: severityAdjusted ? severity : undefined,
      severityAdjusted,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List findings with search
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const inspectionId = req.query.inspectionId as string;
    const searchNotes = req.query.searchNotes as string;

    if (!inspectionId) {
      return res.status(400).json({ error: 'inspectionId required' });
    }

    const where: any = { inspectionId };
    if (searchNotes) {
      where.notes = { contains: searchNotes, mode: 'insensitive' };
    }

    const findings = await prisma.finding.findMany({
      where,
      include: { inspection: true },
    });

    res.json(findings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single finding
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const finding = await prisma.finding.findUnique({
      where: { id: req.params.id },
      include: { inspection: true },
    });

    if (!finding) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    res.json(finding);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create finding
router.post('/', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { inspectionId, category, severity, estimatedCost, notes } = req.body;

    if (!inspectionId || !category || severity === undefined || estimatedCost === undefined) {
      return res.status(400).json({ error: 'inspectionId, category, severity, and estimatedCost required' });
    }

    // Apply severity rule: BLADE_DAMAGE + "crack" => severity >= 4
    let adjustedSeverity = severity;
    let severityAdjusted = false;
    if (category === 'BLADE_DAMAGE' && (notes || '').toLowerCase().includes('crack')) {
      const originalSeverity = severity;
      adjustedSeverity = Math.max(4, severity);
      severityAdjusted = adjustedSeverity !== originalSeverity;
      if (severityAdjusted) {
        console.log(JSON.stringify({
          level: 'info',
          message: 'Finding severity auto-upgraded',
          finding: { category, originalSeverity, adjustedSeverity, notes },
          rule: 'BLADE_DAMAGE with crack requires severity >= 4',
        }));
      }
    }

    const finding = await prisma.finding.create({
      data: {
        inspectionId,
        category,
        severity: adjustedSeverity,
        estimatedCost,
        notes,
      },
      include: { inspection: true },
    });

    res.status(201).json({
      ...finding,
      originalSeverity: severityAdjusted ? severity : undefined,
      severityAdjusted,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update finding
router.put('/:id', authMiddleware, requireRole(Role.ADMIN, Role.ENGINEER), async (req: AuthRequest, res) => {
  try {
    const { category, severity, estimatedCost, notes } = req.body;
    const finding = await prisma.finding.findUnique({ where: { id: req.params.id } });

    if (!finding) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    const finalCategory = category || finding.category;
    const finalSeverity = severity !== undefined ? severity : finding.severity;
    const finalNotes = notes !== undefined ? notes : finding.notes;

    // Apply severity rule
    let adjustedSeverity = finalSeverity;
    let severityAdjusted = false;
    if (finalCategory === 'BLADE_DAMAGE' && (finalNotes || '').toLowerCase().includes('crack')) {
      const originalSeverity = finalSeverity;
      adjustedSeverity = Math.max(4, finalSeverity);
      severityAdjusted = adjustedSeverity !== originalSeverity;
      if (severityAdjusted) {
        console.log(JSON.stringify({
          level: 'info',
          message: 'Finding severity auto-upgraded on update',
          findingId: req.params.id,
          category: finalCategory,
          originalSeverity,
          adjustedSeverity,
          notes: finalNotes,
          rule: 'BLADE_DAMAGE with crack requires severity >= 4',
        }));
      }
    }

    const updated = await prisma.finding.update({
      where: { id: req.params.id },
      data: {
        ...(category && { category }),
        ...(severity !== undefined && { severity: adjustedSeverity }),
        ...(estimatedCost !== undefined && { estimatedCost }),
        ...(notes !== undefined && { notes }),
      },
      include: { inspection: true },
    });

    res.json({
      ...updated,
      originalSeverity: severityAdjusted ? finalSeverity : undefined,
      severityAdjusted,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete finding
router.delete('/:id', authMiddleware, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    await prisma.finding.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
