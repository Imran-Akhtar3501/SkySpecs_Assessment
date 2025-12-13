import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: Role };
  token?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

export function generateToken(userId: string, email: string, role: Role): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): { userId: string; email: string; role: Role } {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    throw new Error('Invalid token');
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function getAuthContext(req?: AuthRequest) {
  return {
    userId: req?.user?.id,
    email: req?.user?.email,
    role: req?.user?.role,
    isAuthenticated: !!req?.user,
  };
}
