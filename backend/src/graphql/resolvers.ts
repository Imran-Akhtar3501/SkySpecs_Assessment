import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { notifyPlan } from '../services/sse.js';
import { normalizeToDateOnly } from '../utils/date.js';

const prisma = new PrismaClient();

export interface GraphQLContext {
  userId?: string;
  email?: string;
  role?: Role;
  isAuthenticated: boolean;
}

function requireAuth(context: GraphQLContext) {
  if (!context.isAuthenticated) {
    throw new Error('Unauthorized: Please login first');
  }
}

function requireRole(context: GraphQLContext, ...roles: Role[]) {
  requireAuth(context);
  if (!context.role || !roles.includes(context.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }
}

// Helper to apply blade damage crack severity rule
function applySeverityRules(findings: any[]) {
  return findings.map((f) => {
    const hasCrack = (f.notes || '').toLowerCase().includes('crack');
    if (f.category === 'BLADE_DAMAGE' && hasCrack) {
      return { ...f, severity: Math.max(4, f.severity) };
    }
    return f;
  });
}

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      requireAuth(context);
      const user = await prisma.user.findUnique({
        where: { id: context.userId! },
      });
      if (!user) return null;
      // Return user without passwordHash
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },

    turbines: async (_: any, { limit = 50, offset = 0 }: any, context: GraphQLContext) => {
      requireAuth(context);
      const [data, total] = await Promise.all([
        prisma.turbine.findMany({
          skip: offset,
          take: limit,
          include: { inspections: true },
        }),
        prisma.turbine.count(),
      ]);
      return { data, total, limit, offset };
    },

    turbine: async (_: any, { id }: any, context: GraphQLContext) => {
      requireAuth(context);
      return prisma.turbine.findUnique({
        where: { id },
        include: { inspections: { include: { findings: true, repairPlan: true } } },
      });
    },

    inspections: async (
      _: any,
      { turbineId, startDate, endDate, dataSource, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      requireAuth(context);

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

      return { data, total, limit, offset };
    },

    inspection: async (_: any, { id }: any, context: GraphQLContext) => {
      requireAuth(context);
      return prisma.inspection.findUnique({
        where: { id },
        include: { turbine: true, findings: true, repairPlan: true },
      });
    },

    findings: async (_: any, { inspectionId, searchNotes }: any, context: GraphQLContext) => {
      requireAuth(context);

      const where: any = { inspectionId };
      if (searchNotes) {
        where.notes = { contains: searchNotes, mode: 'insensitive' };
      }

      return prisma.finding.findMany({
        where,
        include: { inspection: true },
      });
    },

    repairPlan: async (_: any, { inspectionId }: any, context: GraphQLContext) => {
      requireAuth(context);
      return prisma.repairPlan.findUnique({
        where: { inspectionId },
        include: { inspection: true },
      });
    },
  },

  Mutation: {
    login: async (_: any, { email, password }: any) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('User not found');

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new Error('Invalid password');

      const token = generateToken(user.id, user.email, user.role);
      // Return user without passwordHash
      return { 
        token, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      };
    },

    createTurbine: async (
      _: any,
      { name, manufacturer, mwRating, lat, lng }: any,
      context: GraphQLContext
    ) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);
      return prisma.turbine.create({
        data: { name, manufacturer, mwRating, lat, lng },
      });
    },

    updateTurbine: async (
      _: any,
      { id, name, manufacturer, mwRating, lat, lng }: any,
      context: GraphQLContext
    ) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);
      return prisma.turbine.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(manufacturer !== undefined && { manufacturer }),
          ...(mwRating !== undefined && { mwRating }),
          ...(lat !== undefined && { lat }),
          ...(lng !== undefined && { lng }),
        },
        include: { inspections: true },
      });
    },

    deleteTurbine: async (_: any, { id }: any, context: GraphQLContext) => {
      requireRole(context, Role.ADMIN);
      await prisma.turbine.delete({ where: { id } });
      return true;
    },

    createInspection: async (
      _: any,
      { turbineId, date, inspectorName, dataSource, rawPackageUrl }: any,
      context: GraphQLContext
    ) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);

      const dateObj = normalizeToDateOnly(date);

      // Check for overlapping inspections
      const existing = await prisma.inspection.findFirst({
        where: {
          turbineId,
          date: dateObj,
        },
      });

      if (existing) {
        throw new Error('Overlapping inspection already exists for this turbine on this date');
      }

      try {
        return await prisma.inspection.create({
          data: {
            turbineId,
            date: dateObj,
            inspectorName,
            dataSource,
            rawPackageUrl,
          },
          include: { turbine: true, findings: true, repairPlan: true },
        });
      } catch (dbError: any) {
        // Handle unique constraint violation from database
        if (dbError.code === 'P2002' || dbError.message?.includes('Unique constraint')) {
          throw new Error('Overlapping inspection already exists for this turbine on this date');
        }
        throw dbError;
      }
    },

    updateInspection: async (
      _: any,
      { id, date, inspectorName, dataSource, rawPackageUrl }: any,
      context: GraphQLContext
    ) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);

      const inspection = await prisma.inspection.findUnique({ where: { id } });
      if (!inspection) throw new Error('Inspection not found');

      const dateObj = date ? normalizeToDateOnly(date) : inspection.date;

      // Check for overlapping inspections (exclude current)
      if (date) {
        const existing = await prisma.inspection.findFirst({
          where: {
            turbineId: inspection.turbineId,
            date: dateObj,
            id: { not: id },
          },
        });

        if (existing) {
          throw new Error('Overlapping inspection already exists for this turbine on this date');
        }
      }

      return prisma.inspection.update({
        where: { id },
        data: {
          ...(date && { date: dateObj }),
          ...(inspectorName !== undefined && { inspectorName }),
          ...(dataSource && { dataSource }),
          ...(rawPackageUrl !== undefined && { rawPackageUrl }),
        },
        include: { turbine: true, findings: true, repairPlan: true },
      });
    },

    deleteInspection: async (_: any, { id }: any, context: GraphQLContext) => {
      requireRole(context, Role.ADMIN);
      await prisma.inspection.delete({ where: { id } });
      return true;
    },

    createFinding: async (
      _: any,
      { inspectionId, category, severity, estimatedCost, notes }: any,
      context: GraphQLContext
    ) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);

      // Apply severity rule: BLADE_DAMAGE + 'crack' => min severity 4
      let adjustedSeverity = severity;
      let severityAdjusted = false;
      if (category === 'BLADE_DAMAGE' && (notes || '').toLowerCase().includes('crack')) {
        const originalSeverity = severity;
        adjustedSeverity = Math.max(4, severity);
        severityAdjusted = adjustedSeverity !== originalSeverity;
        if (severityAdjusted) {
          console.log(JSON.stringify({
            level: 'info',
            message: 'Finding severity auto-upgraded (GraphQL)',
            finding: { category, originalSeverity, adjustedSeverity, notes },
            rule: 'BLADE_DAMAGE with crack requires severity >= 4',
          }));
        }
      }

      return prisma.finding.create({
        data: {
          inspectionId,
          category,
          severity: adjustedSeverity,
          estimatedCost,
          notes,
        },
        include: { inspection: true },
      });
    },

    updateFinding: async (
      _: any,
      { id, category, severity, estimatedCost, notes }: any,
      context: GraphQLContext
    ) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);

      const finding = await prisma.finding.findUnique({ where: { id } });
      if (!finding) throw new Error('Finding not found');

      const finalCategory = category || finding.category;
      const finalSeverity = severity !== undefined ? severity : finding.severity;
      const finalNotes = notes !== undefined ? notes : finding.notes;

      // Apply severity rule
      let adjustedSeverity = finalSeverity;
      if (finalCategory === 'BLADE_DAMAGE' && (finalNotes || '').toLowerCase().includes('crack')) {
        adjustedSeverity = Math.max(4, finalSeverity);
      }

      return prisma.finding.update({
        where: { id },
        data: {
          ...(category && { category }),
          ...(severity !== undefined && { severity: adjustedSeverity }),
          ...(estimatedCost !== undefined && { estimatedCost }),
          ...(notes !== undefined && { notes }),
        },
        include: { inspection: true },
      });
    },

    deleteFinding: async (_: any, { id }: any, context: GraphQLContext) => {
      requireRole(context, Role.ADMIN);
      await prisma.finding.delete({ where: { id } });
      return true;
    },

    generateRepairPlan: async (_: any, { inspectionId }: any, context: GraphQLContext) => {
      requireRole(context, Role.ADMIN, Role.ENGINEER);

      const inspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
        include: { findings: true, turbine: true },
      });

      if (!inspection) throw new Error('Inspection not found');

      // Apply severity rules
      const adjusted = applySeverityRules(inspection.findings);

      const total = adjusted.reduce((sum, f) => sum + (f.estimatedCost || 0), 0);
      const maxSeverity = Math.max(0, ...adjusted.map((f) => f.severity));
      const priority = maxSeverity >= 5 ? 'HIGH' : maxSeverity >= 3 ? 'MEDIUM' : 'LOW';

      const plan = await prisma.repairPlan.upsert({
        where: { inspectionId },
        update: {
          priority: priority as any,
          totalEstimatedCost: total,
          snapshotJson: adjusted,
        },
        create: {
          inspectionId,
          priority: priority as any,
          totalEstimatedCost: total,
          snapshotJson: adjusted,
        },
        include: { inspection: { include: { turbine: true } } },
      });

      // Notify connected clients via SSE and WebSocket with plan data
      notifyPlan(inspectionId, {
        id: plan.id,
        inspectionId: plan.inspectionId,
        priority: plan.priority,
        totalEstimatedCost: plan.totalEstimatedCost,
        createdAt: plan.createdAt,
      });

      return plan;
    },
  },
};
