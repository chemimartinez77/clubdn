// server/src/controllers/invitationController.ts
import { Request, Response } from 'express';
import { BadgeCategory, InvitationStatus, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { generateInvitationToken } from '../utils/invitationToken';
import { checkAndUnlockBadges } from './badgeController';
import {
  countInvitationsByPersonSearch,
  findInvitationIdsByPersonSearch,
  normalizeSearchTerm,
} from '../utils/personSearch';
const DNI_REGEX = /^\d{8}[A-HJ-NP-TV-Z]$/i;
const NIE_REGEX = /^[XYZ]\d{7}[A-HJ-NP-TV-Z]$/i;
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

const isValidDniNie = (value: string): boolean => {
  const v = value.trim().toUpperCase();
  if (DNI_REGEX.test(v)) {
    const num = parseInt(v.slice(0, 8), 10);
    return v[8] === DNI_LETTERS[num % 23];
  }
  if (NIE_REGEX.test(v)) {
    const prefix: Record<string, string> = { X: '0', Y: '1', Z: '2' };
    const firstChar = v.charAt(0);
    const num = parseInt((prefix[firstChar] ?? '0') + v.slice(1, 8), 10);
    return v[8] === DNI_LETTERS[num % 23];
  }
  return false;
};

const DEFAULT_INVITE_RULES = {
  inviteMaxActive: 5,
  inviteMaxMonthly: 10,
  inviteMaxGuestYear: 5,
  inviteAllowSelfValidation: false
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');


const maskDni = (value: string | null | undefined) => {
  if (!value) return undefined;
  const v = value.trim().toUpperCase();
  if (v.length <= 3) return '*'.repeat(v.length);
  return `${'*'.repeat(v.length - 3)}${v.slice(-3)}`;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const compareDay = (left: Date, right: Date) => {
  const leftKey = getDateKey(left);
  const rightKey = getDateKey(right);
  if (leftKey === rightKey) return 0;
  return leftKey < rightKey ? -1 : 1;
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getInviteConfig = async () => {
  const config = await prisma.clubConfig.findUnique({
    where: { id: 'club_config' },
    select: {
      inviteMaxActive: true,
      inviteMaxMonthly: true,
      inviteMaxGuestYear: true,
      inviteAllowSelfValidation: true
    }
  });

  return {
    inviteMaxActive: config?.inviteMaxActive ?? DEFAULT_INVITE_RULES.inviteMaxActive,
    inviteMaxMonthly: config?.inviteMaxMonthly ?? DEFAULT_INVITE_RULES.inviteMaxMonthly,
    inviteMaxGuestYear: config?.inviteMaxGuestYear ?? DEFAULT_INVITE_RULES.inviteMaxGuestYear,
    inviteAllowSelfValidation: config?.inviteAllowSelfValidation ?? DEFAULT_INVITE_RULES.inviteAllowSelfValidation
  };
};

const buildQrUrl = (token: string) => {
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/invite/${token}`;
};

const mapInvitation = (invitation: any, options?: { includeQr?: boolean }) => {
  const data = {
    id: invitation.id,
    guestFirstName: invitation.guestFirstName,
    guestLastName: invitation.guestLastName,
    guestDniMasked: invitation.guestPhone ? maskDni(invitation.guestPhone) : undefined,
    status: invitation.status,
    validDate: invitation.validDate,
    isExceptional: invitation.isExceptional,
    event: invitation.event
      ? { id: invitation.event.id, title: invitation.event.title, date: invitation.event.date }
      : undefined,
    inviter: invitation.member
      ? { id: invitation.member.id, name: invitation.member.name }
      : undefined,
    validatedBy: invitation.validatedBy
      ? { id: invitation.validatedBy.id, name: invitation.validatedBy.name }
      : undefined,
    usedAt: invitation.usedAt
  } as Record<string, unknown>;

  if (options?.includeQr && invitation.token) {
    data.qrUrl = buildQrUrl(invitation.token);
  }

  return data;
};

export const createInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { eventId, guestFirstName, guestLastName, guestDni, guestPhone, isExceptional } = req.body;
    const dniValue = guestDni || guestPhone; // compatibilidad con nombre antiguo

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    if (!eventId || typeof eventId !== 'string') {
      res.status(400).json({ success: false, message: 'eventId requerido' });
      return;
    }

    if (!guestFirstName || typeof guestFirstName !== 'string' || guestFirstName.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Nombre requerido' });
      return;
    }

    if (!guestLastName || typeof guestLastName !== 'string' || guestLastName.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Apellidos requeridos' });
      return;
    }

    if (dniValue && (typeof dniValue !== 'string' || !isValidDniNie(dniValue))) {
      res.status(400).json({ success: false, message: 'DNI o NIE no válido' });
      return;
    }
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          date: true,
          status: true,
          title: true,
          maxAttendees: true,
          requiresApproval: true,
          createdBy: true,
          registrations: {
            where: { status: 'CONFIRMED' },
            select: { id: true, userId: true }
          },
          invitations: {
            where: { status: { in: [InvitationStatus.PENDING, InvitationStatus.USED] } },
            select: { id: true }
          }
        }
      });

    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Evento no disponible' });
      return;
    }

    const now = new Date();
    const eventDay = startOfDay(new Date(event.date));
    const today = startOfDay(now);
    if (eventDay < today) {
      res.status(400).json({ success: false, message: 'Evento ya pasado' });
      return;
    }

      const confirmedCount = event.registrations.length + event.invitations.length;
    if (confirmedCount >= event.maxAttendees) {
      res.status(400).json({ success: false, message: 'Evento completo' });
      return;
    }

    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isOrganizer = event.createdBy === userId;
    const isAttendee = event.registrations.some(r => r.userId === userId);

    if (!isAdmin && !isOrganizer && !isAttendee) {
      res.status(403).json({ success: false, message: 'Solo los asistentes confirmados pueden invitar' });
      return;
    }

    if (isExceptional && !isAdmin) {
      res.status(403).json({ success: false, message: 'No autorizado para invitaciones excepcionales' });
      return;
    }

    const inviteConfig = await getInviteConfig();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [activeCount, monthlyCount, guestYearCount] = await Promise.all([
      prisma.invitation.count({
        where: {
          memberId: userId,
          status: InvitationStatus.PENDING,
          validDate: { gte: today }
        }
      }),
      prisma.invitation.count({
        where: {
          memberId: userId,
          createdAt: { gte: monthStart, lt: nextMonthStart }
        }
      }),
      dniValue
        ? prisma.invitation.count({
            where: {
              guestDniNormalized: dniValue,
              createdAt: { gte: yearStart }
            }
          })
        : Promise.resolve(0)
    ]);

    if (activeCount >= inviteConfig.inviteMaxActive) {
      res.status(400).json({ success: false, message: 'Limite de invitaciones activas alcanzado' });
      return;
    }

    if (monthlyCount >= inviteConfig.inviteMaxMonthly) {
      res.status(400).json({ success: false, message: 'Limite mensual de invitaciones alcanzado' });
      return;
    }

    if (dniValue && guestYearCount >= inviteConfig.inviteMaxGuestYear) {
      res.status(400).json({ success: false, message: 'Limite anual para este invitado alcanzado' });
      return;
    }

    const token = generateInvitationToken();
    const needsApproval = !!event.requiresApproval && !isOrganizer && !isAdmin;

    const invitationResult = await prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({
        data: {
          token,
          memberId: userId,
          guestFirstName: normalizeText(guestFirstName),
          guestLastName: normalizeText(guestLastName),
          guestPhone: dniValue || null,
          guestDniNormalized: dniValue || null,
          eventId: event.id,
          validDate: eventDay,
          status: needsApproval ? InvitationStatus.PENDING_APPROVAL : InvitationStatus.PENDING,
          isExceptional: !!isExceptional
        },
        include: {
          event: { select: { id: true, title: true, date: true } },
          member: { select: { id: true, name: true } }
        }
      });

      let guest = null;
      if (!needsApproval) {
        guest = await tx.eventGuest.create({
          data: {
            eventId: event.id,
            invitationId: created.id,
            guestFirstName: created.guestFirstName,
            guestLastName: created.guestLastName,
            guestPhone: created.guestPhone
          }
        });
      }

      return { created, guest };
    });

    await prisma.eventAuditLog.create({
      data: {
        eventId: event.id,
        actorId: userId,
        action: 'INVITE',
        targetGuestId: invitationResult.guest?.id ?? null
      }
    });

    if (needsApproval) {
      const { notifyRegistrationPending } = await import('../services/notificationService');
      await notifyRegistrationPending(
        event.id,
        event.title,
        event.createdBy,
        `${normalizeText(guestFirstName)} ${normalizeText(guestLastName)} (invitado por ${invitationResult.created.member?.name ?? 'un socio'})`
      );
    }

    res.status(201).json({
      success: true,
      data: {
        invitation: mapInvitation(invitationResult.created, { includeQr: !needsApproval }),
        qrUrl: needsApproval ? undefined : buildQrUrl(token),
        pendingApproval: needsApproval
      },
      message: needsApproval
        ? 'Invitación enviada. Pendiente de aprobación del organizador.'
        : 'Invitacion creada'
    });
  } catch (error) {
    console.error('[INVITATION] Error al crear invitacion:', error);
    res.status(500).json({ success: false, message: 'Error al crear invitacion' });
  }
};

export const listInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const { eventId, status } = req.query;
    const where: any = { memberId: userId };

    if (eventId && typeof eventId === 'string') {
      where.eventId = eventId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    const invitations = await prisma.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { id: true, title: true, date: true } },
        member: { select: { id: true, name: true } },
        validatedBy: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: invitations.map(invitation => mapInvitation(invitation, { includeQr: true }))
    });
  } catch (error) {
    console.error('[INVITATION] Error al listar invitaciones:', error);
    res.status(500).json({ success: false, message: 'Error al listar invitaciones' });
  }
};

export const cancelInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, createdBy: true } },
        eventGuest: { select: { id: true } }
      }
    });

    if (!invitation) {
      res.status(404).json({ success: false, message: 'Invitacion no encontrada' });
      return;
    }

    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isOwner = invitation.memberId === userId;
    const isOrganizer = invitation.event?.createdBy === userId;

    if (!isAdmin && !isOwner && !isOrganizer) {
      res.status(403).json({ success: false, message: 'No autorizado' });
      return;
    }

    if (invitation.status !== InvitationStatus.PENDING && invitation.status !== InvitationStatus.PENDING_APPROVAL) {
      res.status(400).json({ success: false, message: 'Invitacion ya usada o expirada' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id },
        data: { status: InvitationStatus.CANCELLED }
      });

      if (invitation.eventGuest?.id) {
        await tx.eventGuest.delete({
          where: { id: invitation.eventGuest.id }
        });
      }

      await tx.eventAuditLog.create({
        data: {
          eventId: invitation.eventId,
          actorId: userId,
          action: 'CANCEL_INVITE',
          targetGuestId: null
        }
      });
    });

    res.status(200).json({ success: true, message: 'Invitacion cancelada' });
  } catch (error) {
    console.error('Error al cancelar invitacion:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar invitacion' });
  }
};

export const getInvitationByToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ success: false, message: 'Token requerido' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        event: { select: { id: true, title: true, date: true } },
        member: { select: { id: true, name: true } },
        validatedBy: { select: { id: true, name: true } }
      }
    });

    if (!invitation) {
      res.status(404).json({ success: false, message: 'Invitacion no encontrada' });
      return;
    }

    const now = new Date();
    if (invitation.status === InvitationStatus.PENDING) {
      const dayCompare = compareDay(now, invitation.validDate);
      if (dayCompare > 0) {
        const updated = await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED }
        });
        res.status(200).json({
          success: true,
          data: mapInvitation({ ...invitation, status: updated.status })
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: mapInvitation(invitation)
    });
  } catch (error) {
    console.error('[INVITATION] Error al obtener invitacion:', error);
    res.status(500).json({ success: false, message: 'Error al obtener invitacion' });
  }
};

export const validateInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const validatorId = req.user?.userId;

    if (!token) {
      res.status(400).json({ success: false, message: 'Token requerido' });
      return;
    }

    if (!validatorId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { token },
        include: {
          event: { select: { id: true, title: true, date: true } },
          member: { select: { id: true, name: true } },
          validatedBy: { select: { id: true, name: true } }
        }
      });

      if (!invitation) {
        return { error: { status: 404, message: 'Invitacion no encontrada' } };
      }

      if (invitation.member?.id !== validatorId) {
        return { error: { status: 403, message: 'Solo el socio invitador puede validar esta invitacion' }, invitation };
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return { error: { status: 400, message: 'Invitacion ya usada o expirada' }, invitation };
      }

      const dayCompare = compareDay(now, invitation.validDate);
      if (dayCompare > 0) {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED }
        });
        return { error: { status: 400, message: 'Invitacion expirada' }, invitation };
      }

      if (dayCompare < 0) {
        return { error: { status: 400, message: 'Invitacion no valida hoy' }, invitation };
      }

      const updateResult = await tx.invitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: {
          status: InvitationStatus.USED,
          validatedByUserId: validatorId,
          usedAt: now
        }
      });

      if (updateResult.count === 0) {
        return { error: { status: 409, message: 'Invitacion ya validada' }, invitation };
      }

      const updated = await tx.invitation.findUnique({
        where: { id: invitation.id },
        include: {
          event: { select: { id: true, title: true, date: true } },
          member: { select: { id: true, name: true } },
          validatedBy: { select: { id: true, name: true } }
        }
      });

      return { invitation: updated };
    });

    if (result.error) {
      res.status(result.error.status).json({
        success: false,
        message: result.error.message,
        data: result.invitation ? mapInvitation(result.invitation) : undefined
      });
      return;
    }

    await checkAndUnlockBadges(result.invitation!.member.id, BadgeCategory.INVITADOR);

    res.status(200).json({
      success: true,
      data: mapInvitation(result.invitation),
      message: 'Asistencia del invitado confirmada'
    });
  } catch (error) {
    console.error('[INVITATION] Error al validar invitacion:', error);
    res.status(500).json({ success: false, message: 'Error al validar invitacion' });
  }
};

export const expireInvitations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const result = await prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        validDate: { lt: today }
      },
      data: { status: InvitationStatus.EXPIRED }
    });

    res.status(200).json({
      success: true,
      data: { expired: result.count }
    });
  } catch (error) {
    console.error('[INVITATION] Error al expirar invitaciones:', error);
    res.status(500).json({ success: false, message: 'Error al expirar invitaciones' });
  }
};

// ── Aprobación de invitaciones pendientes ──────────────────────────────────

export const getPendingInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const pendingInvitations = await prisma.invitation.findMany({
      where: { eventId, status: InvitationStatus.PENDING_APPROVAL },
      orderBy: { createdAt: 'asc' },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            profile: { select: { avatar: true, nick: true } }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: pendingInvitations.map(inv => ({
        id: inv.id,
        guestFirstName: inv.guestFirstName,
        guestLastName: inv.guestLastName,
        guestDniMasked: maskDni(inv.guestPhone),
        createdAt: inv.createdAt,
        inviter: { id: inv.member.id, name: inv.member.name, nick: inv.member.profile?.nick ?? null, avatar: inv.member.profile?.avatar ?? null }
      }))
    });
  } catch (error) {
    console.error('[INVITATION] Error al obtener pendientes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener invitaciones pendientes' });
  }
};

export const approveInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: eventId, invitationId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, createdBy: true, maxAttendees: true }
    });

    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (!isAdmin && event.createdBy !== userId) {
      res.status(403).json({ success: false, message: 'No autorizado' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { member: { select: { id: true, name: true } } }
    });

    if (!invitation || invitation.eventId !== eventId) {
      res.status(404).json({ success: false, message: 'Invitación no encontrada' });
      return;
    }

    if (invitation.status !== InvitationStatus.PENDING_APPROVAL) {
      res.status(400).json({ success: false, message: 'Esta invitación ya fue procesada' });
      return;
    }

    // Verificar capacidad (solo CONFIRMED + PENDING|USED, sin contar PENDING_APPROVAL)
    const [confirmedCount, activeInvitations] = await Promise.all([
      prisma.eventRegistration.count({ where: { eventId, status: 'CONFIRMED' } }),
      prisma.invitation.count({ where: { eventId, status: { in: [InvitationStatus.PENDING, InvitationStatus.USED] } } })
    ]);

    if (confirmedCount + activeInvitations >= event.maxAttendees) {
      res.status(400).json({ success: false, message: 'El evento está completo' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.PENDING,
          approvedById: userId,
          approvedAt: new Date()
        }
      });

      const newGuest = await tx.eventGuest.create({
        data: {
          eventId,
          invitationId: invitationId!,
          guestFirstName: invitation.guestFirstName,
          guestLastName: invitation.guestLastName,
          guestPhone: invitation.guestPhone
        }
      });

      await tx.eventAuditLog.create({
        data: { eventId, actorId: userId, action: 'INVITE', targetGuestId: newGuest.id }
      });
    });

    const { notifyRegistrationApproved } = await import('../services/notificationService');
    await notifyRegistrationApproved(
      invitation.memberId,
      eventId,
      event.title
    );

    res.status(200).json({ success: true, message: 'Invitación aprobada' });
  } catch (error) {
    console.error('[INVITATION] Error al aprobar invitación:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar la invitación' });
  }
};

export const rejectInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: eventId, invitationId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, createdBy: true }
    });

    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (!isAdmin && event.createdBy !== userId) {
      res.status(403).json({ success: false, message: 'No autorizado' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation || invitation.eventId !== eventId) {
      res.status(404).json({ success: false, message: 'Invitación no encontrada' });
      return;
    }

    if (invitation.status !== InvitationStatus.PENDING_APPROVAL) {
      res.status(400).json({ success: false, message: 'Esta invitación ya fue procesada' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.CANCELLED }
      });

      await tx.eventAuditLog.create({
        data: { eventId, actorId: userId, action: 'CANCEL_INVITE', targetGuestId: null }
      });
    });

    const { notifyRegistrationRejected } = await import('../services/notificationService');
    await notifyRegistrationRejected(invitation.memberId, eventId, event.title);

    res.status(200).json({ success: true, message: 'Invitación rechazada' });
  } catch (error) {
    console.error('[INVITATION] Error al rechazar invitación:', error);
    res.status(500).json({ success: false, message: 'Error al rechazar la invitación' });
  }
};

// ── Historial de invitados (admin) ────────────────────────────────────────────
export const getInvitationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', search = '', memberId = '' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const normalizedSearch = normalizeSearchTerm(search);

    const where: any = {};
    if (memberId) where.memberId = memberId;
    const [matchedInvitationIds, total] = normalizedSearch
      ? await Promise.all([
          findInvitationIdsByPersonSearch({
            search: normalizedSearch,
            memberId: memberId || undefined,
            limit: limitNum,
            offset: skip,
          }),
          countInvitationsByPersonSearch({
            search: normalizedSearch,
            memberId: memberId || undefined,
          }),
        ])
      : await Promise.all([
          Promise.resolve<string[]>([]),
          prisma.invitation.count({ where }),
        ]);

    if (normalizedSearch) {
      where.id = { in: matchedInvitationIds };
    }

    const invitations = await prisma.invitation.findMany({
      where,
      ...(normalizedSearch ? {} : { skip, take: limitNum }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        guestFirstName: true,
        guestLastName: true,
        guestPhone: true,
        status: true,
        validDate: true,
        createdAt: true,
        usedAt: true,
        member: {
          select: {
            id: true,
            name: true,
            profile: { select: { nick: true, avatar: true } },
            membership: { select: { type: true } },
          },
        },
        event: { select: { id: true, title: true, date: true } },
        validatedBy: { select: { id: true, name: true } },
      },
    });

    const orderedInvitations = normalizedSearch
      ? matchedInvitationIds
          .map(id => invitations.find(invitation => invitation.id === id))
          .filter((invitation): invitation is typeof invitations[number] => !!invitation)
      : invitations;

    res.json({
      success: true,
      data: {
        data: orderedInvitations.map(inv => ({
          ...inv,
          guestDniMasked: maskDni(inv.guestPhone),
          guestPhone: undefined,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('[INVITATION] Error al obtener historial:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial de invitaciones' });
  }
};
