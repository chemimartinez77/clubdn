// server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from '../services/emailService';

/**
 * Listar solicitudes pendientes de aprobaci�n
 * GET /api/admin/pending-approvals
 */
export const getPendingApprovals = async (_req: Request, res: Response) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: pendingUsers,
    });
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las solicitudes pendientes',
    });
  }
};

/**
 * Aprobar usuario
 * POST /api/admin/approve/:userId
 */
export const approveUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { customMessage } = req.body;
    const adminId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requerido',
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar que está pendiente de aprobación
    if (user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Este usuario no está pendiente de aprobación',
      });
    }

    const userEmail = user.email;
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene email'
      });
    }

    // Actualizar usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    // Enviar email de aprobaci�n
    const displayName: string = user.name ?? 'Usuario';
    await sendApprovalEmail(userEmail, displayName, customMessage);

    // Notificar al usuario
    const { notifyUserApproved } = await import('../services/notificationService');
    await notifyUserApproved(userId, displayName);

    return res.status(200).json({
      success: true,
      message: 'Usuario aprobado exitosamente',
    });
  } catch (error) {
    console.error('Error al aprobar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al aprobar el usuario',
    });
  }
};

/**
 * Rechazar usuario
 * POST /api/admin/reject/:userId
 */
export const rejectUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason, customMessage } = req.body;
    const adminId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requerido',
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar que est� pendiente de aprobaci�n
    if (user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Este usuario no est� pendiente de aprobaci�n',
      });
    }

    const userEmail = user.email;
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene email'
      });
    }

    // Actualizar usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'REJECTED',
        rejectedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason || null,
      },
    });

    // Enviar email de rechazo
    const displayName: string = user.name ?? 'Usuario';
    await sendRejectionEmail(userEmail, displayName, reason, customMessage);

    // Notificar al usuario
    const { notifyUserRejected } = await import('../services/notificationService');
    await notifyUserRejected(userId, displayName, reason);

    return res.status(200).json({
      success: true,
      message: 'Usuario rechazado',
    });
  } catch (error) {
    console.error('Error al rechazar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar el usuario',
    });
  }
};
