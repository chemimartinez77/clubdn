import { Request, Response } from 'express';
import { BadgeCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { checkAndUnlockBadges } from './badgeController';

export const spinFirstPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const eventId = req.params.id;
    if (!eventId) {
      res.status(400).json({ success: false, error: 'ID de partida requerido' });
      return;
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true } } }
    });

    // Excluye registros sin usuario (invitados externos sin cuenta)
    const confirmedMembers = registrations
      .filter(r => r.user !== null)
      .map(r => r.user as { id: string; name: string });

    if (!confirmedMembers.find(m => m.id === userId)) {
      res.status(403).json({ success: false, error: 'Solo los asistentes confirmados pueden girar la ruleta' });
      return;
    }

    if (confirmedMembers.length < 2) {
      res.status(400).json({ success: false, error: 'Se necesitan al menos 2 asistentes para girar la ruleta' });
      return;
    }

    const chosenIdx = Math.floor(Math.random() * confirmedMembers.length);
    const chosen = confirmedMembers[chosenIdx]!;

    const spin = await prisma.firstPlayerSpin.create({
      data: { eventId, spinnerId: userId, chosenId: chosen.id }
    });

    checkAndUnlockBadges(userId, BadgeCategory.GIRADOR_RULETA).catch(console.error);
    checkAndUnlockBadges(chosen.id, BadgeCategory.PRIMER_JUGADOR).catch(console.error);

    res.json({
      success: true,
      data: {
        spinId: spin.id,
        chosen,
        players: confirmedMembers
      }
    });
  } catch (error) {
    console.error('Error en spinFirstPlayer:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
