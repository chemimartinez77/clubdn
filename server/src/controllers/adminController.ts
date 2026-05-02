// server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import {
  sendApprovalEmail,
  sendRejectionEmail,
  sendVerificationEmail,
} from '../services/emailService';

/**
 * Listar solicitudes pendientes de aprobaci�n
 * GET /api/admin/pending-approvals
 */
export const getPendingApprovals = async (_req: Request, res: Response) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: {
          in: ['PENDING_VERIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        status: true,
        emailVerified: true,
        verificationEmailSentAt: true,
        tokenExpiry: true,
        approvedAt: true,
        rejectedAt: true,
        rejectionReason: true,
        approvedByAdmin: {
          select: {
            name: true,
          },
        },
        rejectedByAdmin: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: pendingUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        status: user.status,
        emailVerified: user.emailVerified,
        verificationEmailSentAt: user.verificationEmailSentAt,
        tokenExpiry: user.tokenExpiry,
        approvedAt: user.approvedAt,
        rejectedAt: user.rejectedAt,
        rejectionReason: user.rejectionReason,
        approvedByName: user.approvedByAdmin?.name || null,
        rejectedByName: user.rejectedByAdmin?.name || null,
      })),
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
 * Revocar un registro pendiente
 * POST /api/admin/revoke-registration/:userId
 */
export const revokeRegistration = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requerido',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        membership: { select: { id: true } },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.status !== 'PENDING_VERIFICATION' && user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden revocar registros pendientes',
      });
    }

    if (user.membership) {
      return res.status(400).json({
        success: false,
        message: 'No se puede revocar un usuario que ya tenga membresía',
      });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.status(200).json({
      success: true,
      message: 'Registro revocado correctamente',
    });
  } catch (error) {
    console.error('Error al revocar registro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al revocar el registro',
    });
  }
};

/**
 * Reenviar email de verificación desde administración
 * POST /api/admin/resend-verification/:userId
 */
export const resendUserVerificationEmail = async (req: Request, res: Response) => {
  try {
    if (process.env.EMAIL_DISABLED === 'true') {
      return res.status(503).json({
        success: false,
        message: 'El reenvío de verificación está temporalmente deshabilitado. Inténtalo de nuevo en unas horas.',
      });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requerido',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.status !== 'PENDING_VERIFICATION' || user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede reenviar la verificación a usuarios pendientes de verificar el email',
      });
    }

    const verificationToken = randomUUID();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiry,
      },
    });

    await sendVerificationEmail(user.email, user.name, verificationToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationEmailSentAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Correo de verificación reenviado',
    });
  } catch (error) {
    console.error('Error al reenviar verificación desde admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al reenviar el correo de verificación',
    });
  }
};

/**
 * Aprobar usuario
 * POST /api/admin/approve/:userId
 */
export const approveUser = async (req: Request, res: Response) => {
  try {
    if (process.env.EMAIL_DISABLED === 'true') {
      return res.status(503).json({
        success: false,
        message: 'Las aprobaciones están temporalmente deshabilitadas porque el servicio de email no está disponible. Inténtalo de nuevo en unas horas.',
      });
    }

    const { userId } = req.params;
    const { customMessage, membershipType } = req.body;
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

    const validMembershipTypes = ['EN_PRUEBAS', 'COLABORADOR', 'SOCIO', 'FAMILIAR'];
    if (!membershipType || !validMembershipTypes.includes(membershipType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de membresía requerido y debe ser válido',
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

    // Actualizar usuario y crear membresía en una transacción
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });

      await tx.membership.create({
        data: {
          userId,
          type: membershipType,
          startDate: new Date(),
          trialStartDate: membershipType === 'EN_PRUEBAS' ? new Date() : null,
        },
      });
    });

    // Enviar email de aprobaci�n
    const displayName: string = user.name ?? 'Usuario';
    try {
      await sendApprovalEmail(userEmail, displayName, customMessage);
    } catch (emailError) {
      console.error("Error al enviar email de aprobacion:", emailError);
    }

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
    if (process.env.EMAIL_DISABLED === 'true') {
      return res.status(503).json({
        success: false,
        message: 'Los rechazos están temporalmente deshabilitados porque el servicio de email no está disponible. Inténtalo de nuevo en unas horas.',
      });
    }

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
