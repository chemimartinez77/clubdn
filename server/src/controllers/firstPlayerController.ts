import { Request, Response } from 'express';
import { BadgeCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { checkAndUnlockBadges } from './badgeController';

async function getPlayers(eventId: string) {
  const [registrations, eventGuests] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true, profile: { select: { nick: true } } } } }
    }),
    prisma.eventGuest.findMany({
      where: { eventId, invitation: { status: 'USED' } },
      select: { id: true, guestFirstName: true, guestLastName: true }
    })
  ]);

  const members = registrations
    .filter(r => r.user !== null)
    .map(r => {
      const u = r.user!;
      return { id: u.id, name: u.name, nick: u.profile?.nick ?? null, isGuest: false };
    });

  const guests = eventGuests.map(g => ({
    id: g.id,
    name: `${g.guestFirstName} ${g.guestLastName}`,
    nick: null as string | null,
    isGuest: true
  }));

  return { members, guests, allPlayers: [...members, ...guests] };
}

export const getSpinPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const eventId = req.params.id!;
    const { members, allPlayers } = await getPlayers(eventId);

    if (!members.find(m => m.id === userId)) {
      res.status(403).json({ success: false, error: 'Solo los asistentes confirmados pueden girar la ruleta' });
      return;
    }

    if (allPlayers.length < 2) {
      res.status(400).json({ success: false, error: 'Se necesitan al menos 2 asistentes para girar la ruleta' });
      return;
    }

    res.json({ success: true, data: { players: allPlayers } });
  } catch (error) {
    console.error('Error en getSpinPlayers:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const registerSpin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const eventId = req.params.id!;
    const { chosenId } = req.body as { chosenId: string };

    if (!chosenId) {
      res.status(400).json({ success: false, error: 'chosenId requerido' });
      return;
    }

    const { members } = await getPlayers(eventId);

    if (!members.find(m => m.id === userId)) {
      res.status(403).json({ success: false, error: 'Solo los asistentes confirmados pueden girar la ruleta' });
      return;
    }

    // Solo dar logros si es el primer spin del evento
    const existingSpin = await prisma.firstPlayerSpin.findFirst({ where: { eventId } });
    const isFirstSpin = !existingSpin;

    const chosenMemberId = members.find(m => m.id === chosenId)?.id ?? null;

    await prisma.firstPlayerSpin.create({
      data: { eventId, spinnerId: userId, chosenId: chosenMemberId ?? userId }
    });

    if (isFirstSpin) {
      checkAndUnlockBadges(userId, BadgeCategory.GIRADOR_RULETA).catch(console.error);
      if (chosenMemberId) {
        checkAndUnlockBadges(chosenMemberId, BadgeCategory.PRIMER_JUGADOR).catch(console.error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error en registerSpin:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
