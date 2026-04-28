import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../config/database';
import type { EffectiveUserRole } from '../../../utils/roles';

interface JwtPayload {
  userId: string;
  email: string;
  role: EffectiveUserRole;
  impersonatedBy?: string;
}

export interface AuthenticatedMatchUser {
  userId: string;
  email: string;
  role: EffectiveUserRole;
  impersonatedBy?: string;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }

  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

export async function resolveAuthenticatedMatchUser(req: Request): Promise<AuthenticatedMatchUser | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { status: true },
    });

    if (!user || user.status === 'BAJA' || user.status === 'SUSPENDED') {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
