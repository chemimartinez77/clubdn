import { Request, Response } from 'express';
import { prisma } from '../config/database';

function displayName(user: { name: string; profile: { nick: string | null } | null }): string {
  return user.profile?.nick || user.name;
}

export const searchExperts = async (req: Request, res: Response) => {
  try {
    const { gameId = '' } = req.query as Record<string, string>;

    if (!gameId) {
      return res.json({ success: true, data: { game: null, players: [] } });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, name: true, thumbnail: true, yearPublished: true },
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Juego no encontrado' });
    }

    const nameContains = { contains: game.name, mode: 'insensitive' as const };

    // 1. Propietarios con ludoteca pública (por gameId exacto)
    const ownersPromise = prisma.userGame.findMany({
      where: {
        gameId,
        own: true,
        status: 'active',
        user: { profile: { ludotecaPublica: true } },
      },
      select: { userId: true },
    });

    // 2. Historial de partidas (gameName texto libre, sin FK)
    const historyPromise = prisma.gamePlayHistory.findMany({
      where: { gameName: nameContains },
      select: { userId: true },
    });

    // 3. Asistentes a eventos con ese juego (por bggId exacto o gameName)
    const eventsPromise = prisma.event.findMany({
      where: {
        OR: [{ bggId: gameId }, { gameName: nameContains }],
        status: { not: 'CANCELLED' as any },
      },
      select: {
        registrations: {
          where: { status: 'CONFIRMED' },
          select: { userId: true },
        },
      },
    });

    const [owners, history, events] = await Promise.all([ownersPromise, historyPromise, eventsPromise]);

    const ownerSet = new Set(owners.map((o) => o.userId));
    const playCountMap = new Map<string, number>();
    for (const h of history) {
      playCountMap.set(h.userId, (playCountMap.get(h.userId) ?? 0) + 1);
    }
    const attendedSet = new Set(events.flatMap((e) => e.registrations.map((r) => r.userId)));

    const allUserIds = new Set([...ownerSet, ...playCountMap.keys(), ...attendedSet]);

    if (allUserIds.size === 0) {
      return res.json({ success: true, data: { game, players: [] } });
    }

    const userInfos = await prisma.user.findMany({
      where: { id: { in: [...allUserIds] } },
      select: {
        id: true,
        name: true,
        profile: { select: { nick: true, avatar: true, ludotecaPublica: true } },
      },
    });

    const players = userInfos
      .map((u) => ({
        userId: u.id,
        displayName: displayName(u),
        avatar: u.profile?.avatar ?? null,
        ludotecaPublica: u.profile?.ludotecaPublica ?? true,
        ownsGame: ownerSet.has(u.id),
        playCount: playCountMap.get(u.id) ?? 0,
        hasAttended: attendedSet.has(u.id),
      }))
      .sort((a, b) => {
        if (a.ownsGame !== b.ownsGame) return a.ownsGame ? -1 : 1;
        return b.playCount - a.playCount;
      });

    return res.json({ success: true, data: { game, players } });
  } catch (error) {
    console.error('[QUIEN_SABE_JUGAR] Error en searchExperts:', error);
    return res.status(500).json({ success: false, message: 'Error al buscar jugadores' });
  }
};
