// server/src/middleware/marketplaceAccess.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

const ELIGIBLE_TYPES = ['SOCIO', 'COLABORADOR', 'EN_PRUEBAS', 'FAMILIAR'];

/**
 * Middleware que verifica que el usuario tiene acceso al mercadillo:
 * - status APPROVED
 * - sin fechaBaja activa
 * - membership.type en [SOCIO, COLABORADOR, EN_PRUEBAS, FAMILIAR]
 */
export const requireMarketplaceAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        membership: {
          select: { type: true, fechaBaja: true }
        }
      }
    });

    if (!user || user.status !== 'APPROVED') {
      res.status(403).json({ success: false, message: 'Acceso no autorizado al mercadillo' });
      return;
    }

    if (!user.membership || user.membership.fechaBaja) {
      res.status(403).json({ success: false, message: 'Necesitas una membresía activa para acceder al mercadillo' });
      return;
    }

    if (!ELIGIBLE_TYPES.includes(user.membership.type)) {
      res.status(403).json({ success: false, message: 'Tu tipo de membresía no tiene acceso al mercadillo' });
      return;
    }

    next();
  } catch (error) {
    console.error('Error en marketplaceAccess middleware:', error);
    res.status(500).json({ success: false, message: 'Error al verificar acceso' });
  }
};
