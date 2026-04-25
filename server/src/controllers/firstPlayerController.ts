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

    const [registrations, eventGuests] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId, status: 'CONFIRMED' },
        include: { user: { select: { id: true, name: true, profile: { select: { nick: true } } } } }
      }),
      prisma.eventGuest.findMany({
        where: {
          eventId,
          invitation: { status: 'USED' }
        },
        select: { id: true, guestFirstName: true, guestLastName: true }
      })
    ]);

    const confirmedMembers = registrations
      .filter(r => r.user !== null)
      .map(r => {
        const u = r.user!;
        return { id: u.id, name: u.name, nick: u.profile?.nick ?? null };
      });

    if (!confirmedMembers.find(m => m.id === userId)) {
      res.status(403).json({ success: false, error: 'Solo los asistentes confirmados pueden girar la ruleta' });
      return;
    }

    const guests = eventGuests.map(g => ({
      id: g.id,
      name: `${g.guestFirstName} ${g.guestLastName}`,
      nick: null as string | null
    }));

    const allPlayers = [...confirmedMembers, ...guests];

    if (allPlayers.length < 2) {
      res.status(400).json({ success: false, error: 'Se necesitan al menos 2 asistentes para girar la ruleta' });
      return;
    }

    const chosenIdx = Math.floor(Math.random() * allPlayers.length);
    const chosen = allPlayers[chosenIdx]!;

    // Solo se guardan los badges/spin para miembros con cuenta
    const chosenMemberId = confirmedMembers.find(m => m.id === chosen.id)?.id ?? null;

    const spin = await prisma.firstPlayerSpin.create({
      data: { eventId, spinnerId: userId, chosenId: chosenMemberId ?? userId }
    });

    if (chosenMemberId) {
      checkAndUnlockBadges(userId, BadgeCategory.GIRADOR_RULETA).catch(console.error);
      checkAndUnlockBadges(chosenMemberId, BadgeCategory.PRIMER_JUGADOR).catch(console.error);
    } else {
      checkAndUnlockBadges(userId, BadgeCategory.GIRADOR_RULETA).catch(console.error);
    }

    res.json({
      success: true,
      data: {
        spinId: spin.id,
        chosen,
        players: allPlayers
      }
    });
  } catch (error) {
    console.error('Error en spinFirstPlayer:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
