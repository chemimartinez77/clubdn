// server/src/controllers/shareLinkController.ts
import { Request, Response } from 'express';
import { InvitationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { generateInvitationToken } from '../utils/invitationToken';

// Acepta formato E.164 (+34612345678) o número local (612345678)
const isValidPhone = (value: string) => /^\+?\d{6,15}$/.test(value.replace(/\s/g, ''));

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const buildShareUrl = (token: string) => {
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/join/${token}`;
};

const buildInviteUrl = (token: string) => {
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/invite/${token}`;
};

/**
 * GET /api/share/:token — Obtener datos públicos del evento y del padrino (sin auth)
 */
export const getShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const link = await prisma.eventShareLink.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            startHour: true,
            startMinute: true,
            durationHours: true,
            durationMinutes: true,
            status: true,
            maxAttendees: true,
            gameName: true,
            location: true,
            requiresApproval: true,
            registrations: {
              where: { status: 'CONFIRMED' },
              select: { id: true }
            },
            invitations: {
              where: { status: { in: [InvitationStatus.PENDING, InvitationStatus.USED] } },
              select: { id: true }
            }
          }
        },
        member: {
          select: { id: true, name: true }
        }
      }
    });

    if (!link) {
      res.status(404).json({ success: false, message: 'Enlace no válido' });
      return;
    }

    const event = link.event;
    const isFull = (event.registrations.length + event.invitations.length) >= event.maxAttendees;
    const isActive = event.status === 'SCHEDULED' && startOfDay(new Date(event.date)) >= startOfDay(new Date());

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          startHour: event.startHour,
          startMinute: event.startMinute,
          durationHours: event.durationHours,
          durationMinutes: event.durationMinutes,
          status: event.status,
          maxAttendees: event.maxAttendees,
          registeredCount: event.registrations.length + event.invitations.length,
          gameName: event.gameName,
          location: event.location,
          requiresApproval: event.requiresApproval,
          isFull,
          isActive
        },
        invitedBy: { id: link.member.id, name: link.member.name }
      }
    });
  } catch (error) {
    console.error('Error al obtener share link:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * POST /api/share/generate — Generar o reutilizar token para el usuario autenticado (requiere auth)
 */
export const generateShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { eventId } = req.body;

    if (!userId || !eventId) {
      res.status(400).json({ success: false, message: 'Datos inválidos' });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, date: true }
    });

    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Evento no disponible' });
      return;
    }

    if (startOfDay(new Date(event.date)) < startOfDay(new Date())) {
      res.status(400).json({ success: false, message: 'Evento ya pasado' });
      return;
    }

    // Buscar o crear token único por (evento + socio)
    const existing = await prisma.eventShareLink.findUnique({
      where: { eventId_memberId: { eventId, memberId: userId } }
    });

    if (existing) {
      res.status(200).json({ success: true, data: { url: buildShareUrl(existing.token) } });
      return;
    }

    const token = generateInvitationToken();
    await prisma.eventShareLink.create({
      data: { token, eventId, memberId: userId }
    });

    res.status(201).json({ success: true, data: { url: buildShareUrl(token) } });
  } catch (error) {
    console.error('Error al generar share link:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * POST /api/share/:token/request — El invitado rellena sus datos y reserva su plaza (sin auth)
 */
export const requestViaShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { guestFirstName, guestLastName, guestPhone, honeypot } = req.body;

    // Honeypot: si está relleno es un bot
    if (honeypot) {
      res.status(201).json({ success: true, message: 'Solicitud registrada.' });
      return;
    }

    if (!guestFirstName?.trim() || !guestLastName?.trim()) {
      res.status(400).json({ success: false, message: 'Nombre y apellidos requeridos' });
      return;
    }

    if (!guestPhone || !isValidPhone(guestPhone)) {
      res.status(400).json({ success: false, message: 'Número de teléfono no válido' });
      return;
    }

    const normalizedPhone = guestPhone.replace(/\s/g, '');

    const link = await prisma.eventShareLink.findUnique({
      where: { token },
      include: {
        event: {
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
              select: { id: true }
            },
            invitations: {
              where: { status: { in: [InvitationStatus.PENDING, InvitationStatus.USED, InvitationStatus.PENDING_APPROVAL] } },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!link) {
      res.status(404).json({ success: false, message: 'Enlace no válido' });
      return;
    }

    const event = link.event;

    if (event.status !== 'SCHEDULED') {
      res.status(400).json({ success: false, message: 'Evento no disponible' });
      return;
    }

    if (startOfDay(new Date(event.date)) < startOfDay(new Date())) {
      res.status(400).json({ success: false, message: 'Evento ya pasado' });
      return;
    }

    const totalOccupied = event.registrations.length + event.invitations.length;
    if (totalOccupied >= event.maxAttendees) {
      res.status(400).json({ success: false, message: 'Evento completo' });
      return;
    }

    // Verificar que ese teléfono no tiene ya una invitación activa para este evento
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        eventId: event.id,
        guestPhone: normalizedPhone,
        status: { in: [InvitationStatus.PENDING, InvitationStatus.USED, InvitationStatus.PENDING_APPROVAL] }
      }
    });

    if (existingInvitation) {
      res.status(400).json({ success: false, message: 'Ya existe una invitación para este teléfono en esta partida' });
      return;
    }

    const invitationToken = generateInvitationToken();
    const status = event.requiresApproval ? InvitationStatus.PENDING_APPROVAL : InvitationStatus.PENDING;

    await prisma.invitation.create({
      data: {
        token: invitationToken,
        memberId: link.memberId,
        guestFirstName: guestFirstName.trim(),
        guestLastName: guestLastName.trim(),
        guestPhone: normalizedPhone,
        eventId: event.id,
        validDate: new Date(event.date),
        status
      }
    });

    // Notificar al organizador si requiere aprobación
    if (event.requiresApproval && event.createdBy) {
      const { notifyRegistrationPending } = await import('../services/notificationService');
      await notifyRegistrationPending(event.id, event.title, event.createdBy, `${guestFirstName.trim()} ${guestLastName.trim()}`);
    }

    const qrUrl = buildInviteUrl(invitationToken);

    res.status(201).json({
      success: true,
      data: {
        qrUrl,
        requiresApproval: event.requiresApproval,
        eventTitle: event.title,
        eventDate: event.date
      },
      message: event.requiresApproval
        ? 'Solicitud enviada. El organizador debe aprobarla.'
        : 'Plaza reservada. Muestra el QR al entrar al club.'
    });
  } catch (error) {
    console.error('Error al solicitar plaza:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};
