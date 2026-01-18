// server/src/middleware/membership.ts
import { Request, Response, NextFunction } from 'express';
import { MembershipType } from '@prisma/client';
import { prisma } from '../config/database';

export const requireMembershipTypes = (allowedTypes: MembershipType[]) => {
  const allowed = new Set(allowedTypes);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
        return;
      }

      const membership = await prisma.membership.findUnique({
        where: { userId },
        select: {
          id: true,
          type: true,
          isActive: true
        }
      });

      if (!membership || !membership.isActive || !allowed.has(membership.type)) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado por tipo de membresia'
        });
        return;
      }

      req.membership = membership;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al validar la membresia'
      });
    }
  };
};
