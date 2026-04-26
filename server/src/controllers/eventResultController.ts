// server/src/controllers/eventResultController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { isElevatedRole } from '../utils/roles';

/**
 * GET /api/events/:eventId/results
 * Devuelve los resultados de una partida.
 */
export const getEventResults = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const results = await prisma.eventResult.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, profile: { select: { nick: true, avatar: true } } } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ isWinner: 'desc' }, { score: 'desc' }],
    });

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('[EVENT_RESULT] Error en getEventResults:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener los resultados' });
  }
};

/**
 * PUT /api/events/:eventId/results
 * Reemplaza todos los resultados del evento.
 * Solo puede hacerlo un usuario registrado en el evento o el organizador.
 * Body: { results: Array<{ userId?, guestName?, score?, isWinner?, notes? }> }
 */
export const upsertEventResults = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const createdBy = req.user!.userId;
    const { results } = req.body as {
      results: {
        userId?: string;
        guestName?: string;
        score?: number;
        isWinner?: boolean;
        notes?: string;
      }[];
    };

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere al menos un resultado' });
    }

    // Verificar que el evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: { where: { status: 'CONFIRMED' }, select: { userId: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    // Solo el organizador o un participante confirmado puede guardar resultados
    const isSuperAdmin = isElevatedRole(req.user!.role);
    const isOrganizer = event.createdBy === createdBy;
    const isParticipant = event.registrations.some((r) => r.userId === createdBy);

    if (!isSuperAdmin && !isOrganizer && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Solo el organizador o los participantes confirmados pueden registrar resultados',
      });
    }

    // Validación temporal: hasta 24h tras el fin estimado (bypass para SUPER_ADMIN)
    if (!isSuperAdmin) {
      const eventStart = new Date(event.date);
      const durationMinutes = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
      const eventEnd = new Date(eventStart.getTime() + durationMinutes * 60 * 1000);
      const windowClose = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() > windowClose) {
        return res.status(400).json({ success: false, message: 'El plazo para editar resultados ha expirado' });
      }
    }

    // Si hay empate y nadie está marcado como ganador, marcar al de mayor score
    let processedResults = results.map((r) => ({ ...r }));
    const anyWinner = processedResults.some((r) => r.isWinner);
    if (!anyWinner) {
      const maxScore = Math.max(...processedResults.map((r) => r.score ?? -Infinity));
      if (isFinite(maxScore)) {
        processedResults = processedResults.map((r) => ({
          ...r,
          isWinner: r.score === maxScore,
        }));
      }
    }

    // Reemplazar resultados en transacción
    await prisma.$transaction([
      prisma.eventResult.deleteMany({ where: { eventId: eventId as string } }),
      prisma.eventResult.createMany({
        data: processedResults.map((r) => ({
          eventId: eventId as string,
          userId: r.userId ?? null,
          guestName: r.guestName ?? null,
          score: r.score ?? null,
          isWinner: r.isWinner ?? false,
          notes: r.notes ?? null,
          createdBy,
        })),
      }),
    ]);

    const saved = await prisma.eventResult.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, profile: { select: { nick: true, avatar: true } } } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ isWinner: 'desc' }, { score: 'desc' }],
    });

    return res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[EVENT_RESULT] Error en upsertEventResults:', error);
    return res.status(500).json({ success: false, message: 'Error al guardar los resultados' });
  }
};
