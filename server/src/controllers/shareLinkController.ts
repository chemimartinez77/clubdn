// server/src/controllers/shareLinkController.ts
import { Request, Response } from 'express';
import { InvitationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { generateInvitationToken } from '../utils/invitationToken';

const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutos

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
            description: true,
            date: true,
            startHour: true,
            startMinute: true,
            durationHours: true,
            durationMinutes: true,
            status: true,
            maxAttendees: true,
            gameName: true,
            gameImage: true,
            location: true,
            requiresApproval: true,
            game: {
              select: { image: true, thumbnail: true }
            },
            registrations: {
              where: { status: 'CONFIRMED' },
              select: { id: true }
            },
            invitations: {
              where: { status: { in: [InvitationStatus.PENDING, InvitationStatus.USED, InvitationStatus.PENDING_APPROVAL] } },
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

    // Verificar si la reserva asociada a este enlace ha expirado
    const reservation = await prisma.invitation.findFirst({
      where: {
        memberId: link.memberId,
        eventId: event.id,
        status: InvitationStatus.RESERVED
      },
      select: { expiresAt: true }
    });

    const reservationExpired = reservation
      ? reservation.expiresAt !== null && reservation.expiresAt < new Date()
      : true;

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          startHour: event.startHour,
          startMinute: event.startMinute,
          durationHours: event.durationHours,
          durationMinutes: event.durationMinutes,
          status: event.status,
          maxAttendees: event.maxAttendees,
          registeredCount: event.registrations.length + event.invitations.length,
          gameName: event.gameName,
          gameImage: event.game?.image || event.game?.thumbnail || event.gameImage || null,
          location: event.location,
          requiresApproval: event.requiresApproval,
          isFull: isFull || reservationExpired,
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
 * POST /api/share/generate — Genera el enlace y reserva una plaza por 15 min (requiere auth)
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
      select: {
        id: true,
        status: true,
        date: true,
        maxAttendees: true,
        registrations: {
          where: { status: 'CONFIRMED' },
          select: { id: true }
        },
        invitations: {
          where: {
            status: { in: [InvitationStatus.RESERVED, InvitationStatus.PENDING, InvitationStatus.USED, InvitationStatus.PENDING_APPROVAL] }
          },
          select: { id: true, status: true, expiresAt: true }
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

    if (startOfDay(new Date(event.date)) < startOfDay(new Date())) {
      res.status(400).json({ success: false, message: 'Evento ya pasado' });
      return;
    }

    // Cancelar reservas expiradas de este socio para este evento
    await prisma.invitation.updateMany({
      where: {
        memberId: userId,
        eventId,
        status: InvitationStatus.RESERVED,
        expiresAt: { lt: new Date() }
      },
      data: { status: InvitationStatus.CANCELLED }
    });

    // Comprobar si ya tiene una reserva activa
    const activeReservation = await prisma.invitation.findFirst({
      where: {
        memberId: userId,
        eventId,
        status: InvitationStatus.RESERVED,
        expiresAt: { gt: new Date() }
      }
    });

    // Verificar aforo (excluyendo reservas expiradas ya canceladas arriba)
    const activeInvitations = event.invitations.filter(inv =>
      inv.status !== InvitationStatus.RESERVED ||
      (inv.expiresAt !== null && inv.expiresAt > new Date())
    );
    const totalOccupied = event.registrations.length + activeInvitations.length;

    if (!activeReservation && totalOccupied >= event.maxAttendees) {
      res.status(400).json({ success: false, message: 'Evento completo' });
      return;
    }

    // Obtener o crear el share link
    let shareToken: string;
    const existingLink = await prisma.eventShareLink.findUnique({
      where: { eventId_memberId: { eventId, memberId: userId } }
    });

    if (existingLink) {
      shareToken = existingLink.token;
    } else {
      shareToken = generateInvitationToken();
      await prisma.eventShareLink.create({
        data: { token: shareToken, eventId, memberId: userId }
      });
    }

    // Crear reserva si no hay una activa
    if (!activeReservation) {
      const invitationToken = generateInvitationToken();
      await prisma.invitation.create({
        data: {
          token: invitationToken,
          memberId: userId,
          eventId,
          validDate: new Date(event.date),
          status: InvitationStatus.RESERVED,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS)
        }
      });
    }

    res.status(200).json({ success: true, data: { url: buildShareUrl(shareToken) } });
  } catch (error) {
    console.error('Error al generar share link:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * POST /api/share/:token/request — El invitado rellena sus datos y confirma la reserva (sin auth)
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

    // Buscar reserva activa de este socio para este evento
    const reservation = await prisma.invitation.findFirst({
      where: {
        memberId: link.memberId,
        eventId: event.id,
        status: InvitationStatus.RESERVED
      }
    });

    if (!reservation) {
      // No hay reserva activa — puede que haya expirado; verificar aforo y crear nueva
      const totalOccupied = event.registrations.length + event.invitations.length;
      if (totalOccupied >= event.maxAttendees) {
        res.status(400).json({ success: false, message: 'Evento completo o la reserva ha expirado' });
        return;
      }
    } else if (reservation.expiresAt !== null && reservation.expiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'La reserva ha expirado. Pide a tu invitador un nuevo enlace.' });
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

    const newStatus = event.requiresApproval ? InvitationStatus.PENDING_APPROVAL : InvitationStatus.PENDING;

    if (reservation) {
      // Actualizar la reserva existente con los datos del invitado
      await prisma.invitation.update({
        where: { id: reservation.id },
        data: {
          guestFirstName: guestFirstName.trim(),
          guestLastName: guestLastName.trim(),
          guestPhone: normalizedPhone,
          status: newStatus,
          expiresAt: null
        }
      });
    } else {
      // Crear nueva invitación si no había reserva (aforo ya verificado arriba)
      const invitationToken = generateInvitationToken();
      await prisma.invitation.create({
        data: {
          token: invitationToken,
          memberId: link.memberId,
          guestFirstName: guestFirstName.trim(),
          guestLastName: guestLastName.trim(),
          guestPhone: normalizedPhone,
          eventId: event.id,
          validDate: new Date(event.date),
          status: newStatus
        }
      });
    }

    // Notificar al organizador si requiere aprobación
    if (event.requiresApproval && event.createdBy) {
      const { notifyRegistrationPending } = await import('../services/notificationService');
      await notifyRegistrationPending(event.id, event.title, event.createdBy, `${guestFirstName.trim()} ${guestLastName.trim()}`);
    }

    const invitationForQr = reservation
      ? await prisma.invitation.findUnique({ where: { id: reservation.id }, select: { token: true } })
      : await prisma.invitation.findFirst({
          where: { memberId: link.memberId, eventId: event.id, status: newStatus },
          orderBy: { createdAt: 'desc' },
          select: { token: true }
        });

    const qrUrl = buildInviteUrl(invitationForQr!.token);

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
