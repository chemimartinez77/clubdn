// server/src/controllers/shareLinkController.ts
import { Request, Response } from 'express';
import { InvitationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { generateInvitationToken } from '../utils/invitationToken';
import { notifyAdminsGuestConflict } from '../services/notificationService';

const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutos

const isValidPhone = (value: string) => /^\+?\d{6,15}$/.test(value.replace(/\s/g, ''));

const isValidSpanishDni = (value: string): boolean => {
  if (!/^\d{8}[A-Z]$/.test(value)) return false;
  const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
  return value[8] === LETTERS[parseInt(value.slice(0, 8), 10) % 23];
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const buildInviteUrl = (token: string) => {
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/join/${token}`;
};

const buildQrUrl = (token: string) => {
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/invite/${token}`;
};

/**
 * GET /api/share/invite/:token — Datos públicos del evento para el invitado (sin auth)
 * El token es el token de la Invitation RESERVED.
 */
export const getShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        member: {
          select: { id: true, name: true }
        },
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
              where: {
                status: {
                  in: [InvitationStatus.PENDING, InvitationStatus.USED, InvitationStatus.PENDING_APPROVAL]
                }
              },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!invitation || invitation.status !== InvitationStatus.RESERVED) {
      res.status(404).json({ success: false, message: 'Enlace no válido' });
      return;
    }

    const reservationExpired =
      invitation.expiresAt !== null && invitation.expiresAt < new Date();

    const event = invitation.event;
    const occupied = event.registrations.length + event.invitations.length;
    const isFull = occupied >= event.maxAttendees || reservationExpired;
    const isActive =
      event.status === 'SCHEDULED' &&
      startOfDay(new Date(event.date)) >= startOfDay(new Date());

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
          registeredCount: occupied,
          gameName: event.gameName,
          gameImage: event.game?.image || event.game?.thumbnail || event.gameImage || null,
          location: event.location,
          requiresApproval: event.requiresApproval,
          isFull,
          isActive
        },
        invitedBy: { id: invitation.member.id, name: invitation.member.name }
      }
    });
  } catch (error) {
    console.error('Error al obtener share link:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * POST /api/share/generate — Genera reserva y devuelve URL con token único de la Invitation (requiere auth)
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
            status: {
              in: [InvitationStatus.RESERVED, InvitationStatus.PENDING, InvitationStatus.USED, InvitationStatus.PENDING_APPROVAL]
            }
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

    // Verificar aforo (excluyendo reservas expiradas ya canceladas arriba)
    const activeInvitations = event.invitations.filter(
      inv =>
        inv.status !== InvitationStatus.RESERVED ||
        (inv.expiresAt !== null && inv.expiresAt > new Date())
    );
    const totalOccupied = event.registrations.length + activeInvitations.length;

    if (totalOccupied >= event.maxAttendees) {
      res.status(400).json({ success: false, message: 'Evento completo' });
      return;
    }

    // Crear siempre una nueva reserva con token único
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

    res.status(200).json({ success: true, data: { url: buildInviteUrl(invitationToken) } });
  } catch (error) {
    console.error('Error al generar share link:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * GET /api/share/lookup?dni=12345678A&phone=%2B34612345678 — Lookup público de invitado por DNI + teléfono
 * Devuelve: { match: 'none' | 'both' | 'conflict', firstName?, lastName? }
 */
export const lookupGuest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni, phone } = req.query;

    if (typeof dni !== 'string' || typeof phone !== 'string') {
      res.status(400).json({ success: false, message: 'Parámetros inválidos' });
      return;
    }

    const normalizedDni = dni.trim().toUpperCase().replace(/[-\s]/g, '');
    const normalizedPhone = phone.trim().replace(/\s/g, '');

    if (!isValidSpanishDni(normalizedDni) || !isValidPhone(normalizedPhone)) {
      res.status(400).json({ success: false, message: 'DNI o teléfono no válidos' });
      return;
    }

    const matches = await prisma.invitation.findMany({
      where: {
        status: { in: [InvitationStatus.PENDING, InvitationStatus.USED] },
        OR: [
          { guestDniNormalized: normalizedDni },
          { guestPhone: normalizedPhone },
        ],
      },
      select: {
        guestDniNormalized: true,
        guestPhone: true,
        guestFirstName: true,
        guestLastName: true,
      },
    });

    if (matches.length === 0) {
      res.status(200).json({ success: true, data: { match: 'none' } });
      return;
    }

    const dniMatches = matches.some(m => m.guestDniNormalized === normalizedDni);
    const phoneMatches = matches.some(m => m.guestPhone === normalizedPhone);

    if (!dniMatches || !phoneMatches) {
      notifyAdminsGuestConflict(normalizedDni, normalizedPhone).catch(err =>
        console.error('Error enviando alerta de conflicto de invitado:', err)
      );
      res.status(200).json({ success: true, data: { match: 'conflict' } });
      return;
    }

    const hasConflict = matches.some(m => {
      const thisDni = m.guestDniNormalized === normalizedDni;
      const thisPhone = m.guestPhone === normalizedPhone;
      return thisDni !== thisPhone;
    });

    if (hasConflict) {
      notifyAdminsGuestConflict(normalizedDni, normalizedPhone).catch(err =>
        console.error('Error enviando alerta de conflicto de invitado:', err)
      );
      res.status(200).json({ success: true, data: { match: 'conflict' } });
      return;
    }

    const known = matches.find(
      m => m.guestDniNormalized === normalizedDni && m.guestPhone === normalizedPhone
    );
    res.status(200).json({
      success: true,
      data: {
        match: 'both',
        firstName: known?.guestFirstName ?? '',
        lastName: known?.guestLastName ?? '',
      },
    });
  } catch (error) {
    console.error('Error en lookup de invitado:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * POST /api/share/invite/:token/request — El invitado rellena sus datos y confirma la reserva (sin auth)
 * El token identifica exactamente la Invitation RESERVED a completar.
 */
export const requestViaShareLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { guestFirstName, guestLastName, guestDni, guestPhone, honeypot } = req.body;

    // Honeypot: si está relleno es un bot
    if (honeypot) {
      res.status(201).json({ success: true, message: 'Solicitud registrada.' });
      return;
    }

    if (!guestFirstName?.trim() || !guestLastName?.trim()) {
      res.status(400).json({ success: false, message: 'Nombre y apellidos requeridos' });
      return;
    }

    const normalizedDni = typeof guestDni === 'string' ? guestDni.trim().toUpperCase().replace(/[-\s]/g, '') : '';
    if (!isValidSpanishDni(normalizedDni)) {
      res.status(400).json({ success: false, message: 'DNI no válido' });
      return;
    }

    if (!guestPhone || !isValidPhone(guestPhone)) {
      res.status(400).json({ success: false, message: 'Número de teléfono no válido' });
      return;
    }

    const normalizedPhone = guestPhone.replace(/\s/g, '');

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            date: true,
            status: true,
            title: true
          }
        }
      }
    });

    if (!invitation || invitation.status !== InvitationStatus.RESERVED) {
      res.status(404).json({ success: false, message: 'Enlace no válido' });
      return;
    }

    const event = invitation.event;

    if (event.status !== 'SCHEDULED') {
      res.status(400).json({ success: false, message: 'Evento no disponible' });
      return;
    }

    if (startOfDay(new Date(event.date)) < startOfDay(new Date())) {
      res.status(400).json({ success: false, message: 'Evento ya pasado' });
      return;
    }

    if (invitation.expiresAt !== null && invitation.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        message: 'La reserva ha expirado. Pide a tu invitador un nuevo enlace.'
      });
      return;
    }

    // Verificar que ese teléfono no tiene ya una invitación activa para este evento
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        eventId: event.id,
        guestPhone: normalizedPhone,
        status: {
          in: [InvitationStatus.PENDING, InvitationStatus.USED]
        }
      }
    });

    if (existingInvitation) {
      res.status(400).json({
        success: false,
        message: 'Ya existe una invitación para este teléfono en esta partida'
      });
      return;
    }

    const newStatus = InvitationStatus.PENDING;

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        guestFirstName: guestFirstName.trim(),
        guestLastName: guestLastName.trim(),
        guestDniNormalized: normalizedDni,
        guestPhone: normalizedPhone,
        status: newStatus,
        expiresAt: null
      }
    });

    const qrUrl = buildQrUrl(token!);

    res.status(201).json({
      success: true,
      data: {
        qrUrl,
        requiresApproval: false,
        eventTitle: event.title,
        eventDate: event.date
      },
      message: 'Plaza reservada. Muestra el QR al entrar al club.'
    });
  } catch (error) {
    console.error('Error al solicitar plaza:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};
