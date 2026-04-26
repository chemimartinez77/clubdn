// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import type { EffectiveUserRole } from '../utils/roles';
import { isAdminLikeRole, isElevatedRole } from '../utils/roles';

interface JwtPayload {
  userId: string;
  email: string;
  role: EffectiveUserRole;
  impersonatedBy?: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    // Verificar que el usuario no está dado de baja o suspendido
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { status: true }
    });

    if (!user || user.status === 'BAJA' || user.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        status: user?.status ?? 'NOT_FOUND'
      });
      return;
    }

    // Adjuntar info del usuario al request
    req.user = {
      ...decoded,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isAdminLikeRole(req.user?.role)) {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
    return;
  }
  next();
};

export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isElevatedRole(req.user?.role)) {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos elevados.'
    });
    return;
  }
  next();
};
