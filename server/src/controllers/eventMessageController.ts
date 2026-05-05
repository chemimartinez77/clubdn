import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { isAdminLikeRole } from '../utils/roles';
import type { EffectiveUserRole } from '../utils/roles';

const MAX_CONTENT_LENGTH = 500;

async function canAccessChat(eventId: string, userId: string, role: EffectiveUserRole): Promise<boolean> {
  if (isAdminLikeRole(role)) return true;
  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  });
  return !!registration && registration.status !== 'CANCELLED';
}

function calcChatClosedAt(event: {
  date: Date;
  startHour: number | null;
  startMinute: number | null;
  durationHours: number | null;
  durationMinutes: number | null;
}): Date | null {
  if (event.startHour === null) return null;
  const start = new Date(event.date);
  start.setHours(event.startHour, event.startMinute ?? 0, 0, 0);
  const totalMinutes = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
  if (totalMinutes <= 0) return null;
  const end = new Date(start.getTime() + totalMinutes * 60 * 1000);
  return new Date(end.getTime() + 3 * 60 * 60 * 1000);
}

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id as string;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const hasAccess = await canAccessChat(eventId, userId, role);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'No tienes acceso al chat de este evento' });
      return;
    }

    const messages = await prisma.eventMessage.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            profile: { select: { nick: true, avatar: true } },
          },
        },
      },
    });

    res.json({ success: true, data: messages });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener mensajes' });
  }
};

export const postMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id as string;
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío' });
      return;
    }
    if (content.trim().length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ success: false, message: `El mensaje no puede superar ${MAX_CONTENT_LENGTH} caracteres` });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { date: true, startHour: true, startMinute: true, durationHours: true, durationMinutes: true },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    const closedAt = calcChatClosedAt(event);
    if (closedAt && new Date() > closedAt) {
      res.status(403).json({ success: false, message: 'El chat de este evento está cerrado' });
      return;
    }

    const hasAccess = await canAccessChat(eventId, userId, role);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'No tienes acceso al chat de este evento' });
      return;
    }

    const message = await prisma.eventMessage.create({
      data: { eventId, userId, content: content.trim() },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            profile: { select: { nick: true, avatar: true } },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch {
    res.status(500).json({ success: false, message: 'Error al enviar mensaje' });
  }
};
