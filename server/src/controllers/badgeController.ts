// server/src/controllers/badgeController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { BadgeCategory, InvitationStatus } from '@prisma/client';

/**
 * Obtener todos los badges del usuario autenticado
 */
export const getUserBadges = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Obtener badges desbloqueados
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badgeDefinition: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    // Obtener todas las definiciones de badges
    const allBadgeDefinitions = await prisma.badgeDefinition.findMany({
      orderBy: [
        { category: 'asc' },
        { level: 'asc' }
      ]
    });

    // Calcular progreso por categoría
    const progressByCategory = await calculateBadgeProgress(userId);

    res.status(200).json({
      success: true,
      data: {
        unlockedBadges: userBadges,
        allBadges: allBadgeDefinitions,
        progress: progressByCategory
      }
    });
  } catch (error) {
    console.error('Error al obtener badges:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener badges'
    });
  }
};

/**
 * Obtener badges de cualquier usuario (público)
 */
export const getUserBadgesById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badgeDefinition: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: { badges: userBadges }
    });
  } catch (error) {
    console.error('Error al obtener badges del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener badges'
    });
  }
};

/**
 * Marcar un badge desbloqueado como descubierto por el usuario autenticado
 */
export const revealBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { badgeDefinitionId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    if (!badgeDefinitionId) {
      res.status(400).json({
        success: false,
        message: 'Falta el identificador del badge'
      });
      return;
    }

    const userBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeDefinitionId: {
          userId,
          badgeDefinitionId
        }
      }
    });

    if (!userBadge) {
      res.status(404).json({
        success: false,
        message: 'No tienes ese badge desbloqueado'
      });
      return;
    }

    const revealedAt = userBadge.revealedAt ?? new Date();

    const updatedBadge = await prisma.userBadge.update({
      where: { id: userBadge.id },
      data: {
        revealedAt
      },
      include: {
        badgeDefinition: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        badge: updatedBadge
      }
    });
  } catch (error) {
    console.error('Error al marcar badge como descubierto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar badge como descubierto'
    });
  }
};

/**
 * Calcular progreso de badges por categoría
 */
async function getCategoryCount(userId: string, category: BadgeCategory): Promise<number> {
  if (category === BadgeCategory.ORGANIZADOR) {
    return prisma.event.count({
      where: { createdBy: userId, status: { in: ['SCHEDULED', 'ONGOING', 'COMPLETED'] } }
    });
  }
  if (category === BadgeCategory.REPETIDOR) {
    const groups = await prisma.gamePlayHistory.groupBy({
      by: ['gameName'],
      where: { userId, event: { disputeResult: true } },
      having: { gameName: { _count: { gte: 3 } } }
    });
    return groups.length;
  }
  if (category === BadgeCategory.INVITADOR) {
    const invitadorStartBadge = await prisma.badgeDefinition.findFirst({
      where: { category: BadgeCategory.INVITADOR },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!invitadorStartBadge) {
      return 0;
    }

    return prisma.invitation.count({
      where: {
        memberId: userId,
        status: InvitationStatus.USED,
        usedAt: { gte: invitadorStartBadge.createdAt }
      }
    });
  }
  if (category === BadgeCategory.VALIDADOR) {
    // Solo cuenta el que fue escaneado (muestra su QR)
    const validations = await prisma.gameValidation.findMany({
      where: { scannedId: userId },
      select: { eventId: true },
      distinct: ['eventId']
    });
    return validations.length;
  }
  if (category === BadgeCategory.TESTIGO_MESA) {
    // Solo cuenta el que escanea el QR (testigo con la cámara)
    const validations = await prisma.gameValidation.findMany({
      where: { scannerId: userId },
      select: { eventId: true },
      distinct: ['eventId']
    });
    return validations.length;
  }
  if (category === BadgeCategory.AUDITOR_LUDICO) {
    // Cuenta solo confirmaciones manuales del organizador de partidas celebradas
    return prisma.event.count({
      where: { createdBy: userId, disputeResult: true, disputeConfirmedManually: true }
    });
  }
  if (category === BadgeCategory.CONOCEDOR_GENEROS) {
    return prisma.genreConsensusHistory.count({ where: { userId } });
  }
  if (category === BadgeCategory.FOTOGRAFO) {
    const groups = await prisma.eventPhoto.groupBy({
      by: ['eventId'],
      where: { uploadedById: userId }
    });
    return groups.length;
  }
  if (category === BadgeCategory.PRIMER_JUGADOR) {
    return prisma.firstPlayerSpin.count({ where: { chosenId: userId } });
  }
  if (category === BadgeCategory.GIRADOR_RULETA) {
    // Cuenta los eventos donde este usuario fue el PRIMERO en girar (un premio por partida)
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM (
        SELECT DISTINCT ON ("eventId") "eventId", "spinnerId"
        FROM "FirstPlayerSpin"
        ORDER BY "eventId", "createdAt" ASC
      ) first_spins
      WHERE "spinnerId" = ${userId}
    `;
    return Number(result[0]?.count ?? 0);
  }
  return prisma.gamePlayHistory.count({ where: { userId, gameCategory: category, event: { disputeResult: true } } });
}

async function calculateBadgeProgress(userId: string) {
  const categoryRows = await prisma.badgeDefinition.findMany({
    select: { category: true },
    distinct: ['category']
  });
  const categories = categoryRows.map(row => row.category);
  const progress: Record<string, { count: number; nextBadge?: any }> = {};

  for (const category of categories) {
    const count = await getCategoryCount(userId, category);

    const nextBadge = await prisma.badgeDefinition.findFirst({
      where: { category, requiredCount: { gt: count } },
      orderBy: { requiredCount: 'asc' }
    });

    progress[category] = { count, nextBadge: nextBadge || undefined };
  }

  return progress;
}

/**
 * Verificar y desbloquear badges automáticamente
 * Esta función se llama después de que un usuario asiste a un evento
 */
export const checkAndUnlockBadges = async (
  userId: string,
  gameCategory: BadgeCategory | null
): Promise<void> => {
  if (!gameCategory) return;

  try {
    const count = await getCategoryCount(userId, gameCategory);

    // Encontrar badges que debería tener desbloqueados
    const eligibleBadges = await prisma.badgeDefinition.findMany({
      where: {
        category: gameCategory,
        requiredCount: { lte: count }
      }
    });

    // Desbloquear badges que aún no tiene
    for (const badge of eligibleBadges) {
      const existing = await prisma.userBadge.findUnique({
        where: {
          userId_badgeDefinitionId: {
            userId,
            badgeDefinitionId: badge.id
          }
        }
      });

      if (!existing) {
        // Desbloquear el badge
        await prisma.userBadge.create({
          data: {
            userId,
            badgeDefinitionId: badge.id
          }
        });

        // Crear notificación
        await prisma.notification.create({
          data: {
            userId,
            type: 'BADGE_UNLOCKED',
            title: '¡Nuevo logro desbloqueado!',
            message: `Has desbloqueado el badge "${badge.name}" en la categoría ${getCategoryDisplayName(badge.category)}`,
            metadata: {
              badgeId: badge.id,
              badgeName: badge.name,
              category: badge.category,
              level: badge.level
            }
          }
        });

        console.log(`✅ Badge desbloqueado: ${badge.name} para usuario ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error al verificar y desbloquear badges:', error);
  }
};

/**
 * Registrar juego jugado y verificar badges
 */
export const trackGamePlayed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { eventId, gameName, gameCategory } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    if (!eventId || !gameName) {
      res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
      return;
    }

    // Verificar que el usuario asistió al evento
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId,
        status: 'CONFIRMED'
      }
    });

    if (!registration) {
      res.status(403).json({
        success: false,
        message: 'No estás registrado en este evento'
      });
      return;
    }

    // Registrar el juego jugado
    const gamePlay = await prisma.gamePlayHistory.create({
      data: {
        userId,
        eventId,
        gameName,
        gameCategory: gameCategory || null
      }
    });

    // Verificar y desbloquear badges
    if (gameCategory) {
      await checkAndUnlockBadges(userId, gameCategory as BadgeCategory);
    }

    res.status(200).json({
      success: true,
      data: { gamePlay },
      message: 'Juego registrado correctamente'
    });
  } catch (error) {
    console.error('Error al registrar juego jugado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar juego'
    });
  }
};

/**
 * Obtener historial de juegos jugados del usuario
 */
export const getGamePlayHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const history = await prisma.gamePlayHistory.findMany({
      where: { userId, event: { disputeResult: true } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      },
      orderBy: {
        playedAt: 'desc'
      },
      take: 100 // Últimos 100 juegos
    });

    res.status(200).json({
      success: true,
      data: { history }
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial'
    });
  }
};

/**
 * Obtener estadísticas de juegos por categoría
 */
export const getGameStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const categoryRows = await prisma.badgeDefinition.findMany({
      select: { category: true },
      distinct: ['category']
    });
    const categories = categoryRows.map(row => row.category);
    const stats: Record<string, number> = {};

    for (const category of categories) {
      const uniqueGames = await prisma.gamePlayHistory.findMany({
        where: {
          userId,
          gameCategory: category,
          event: { disputeResult: true }
        },
        select: {
          gameName: true
        },
        distinct: ['gameName']
      });

      stats[category] = uniqueGames.length;
    }

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Helper: Nombre display de categoría
function getCategoryDisplayName(category: BadgeCategory): string {
  const names: Record<BadgeCategory, string> = {
    [BadgeCategory.EUROGAMES]: 'Eurogames',
    [BadgeCategory.TEMATICOS]: 'Temáticos',
    [BadgeCategory.WARGAMES]: 'Wargames',
    [BadgeCategory.ROL]: 'Rol',
    [BadgeCategory.MINIATURAS]: 'Miniaturas',
    [BadgeCategory.WARHAMMER]: 'Warhammer',
    [BadgeCategory.FILLERS_PARTY]: 'Fillers / Party',
    [BadgeCategory.CARTAS_LCG_TCG]: 'Cartas / LCG / TCG',
    [BadgeCategory.ABSTRACTOS]: 'Abstractos',
    [BadgeCategory.CATALOGADOR]: 'Catalogador',
    [BadgeCategory.ORGANIZADOR]: 'Organizador',
    [BadgeCategory.REPETIDOR]: 'Repetidor',
    [BadgeCategory.INVITADOR]: 'Invitador',
    [BadgeCategory.VALIDADOR]: 'Validador',
    [BadgeCategory.TESTIGO_MESA]: 'Testigo de Mesa',
    [BadgeCategory.AUDITOR_LUDICO]: 'Auditor Lúdico',
    [BadgeCategory.CONOCEDOR_GENEROS]: 'Conocedor de Géneros',
    [BadgeCategory.FOTOGRAFO]: 'Fotógrafo',
    [BadgeCategory.PRIMER_JUGADOR]: 'Primer Jugador',
    [BadgeCategory.GIRADOR_RULETA]: 'Girador de Ruleta'
  };
  return names[category];
}

/**
 * Procesar voto de categoría de juego.
 * Si 2 usuarios votan la misma categoría para un bggId, se fija en Game.confirmedCategory
 * y ambos reciben 1 punto para el badge CONOCEDOR_GENEROS.
 */
export const processGameCategoryVote = async (
  userId: string,
  bggId: string,
  category: BadgeCategory
): Promise<void> => {
  try {
    // Si el juego ya tiene categoría confirmada, no hacer nada
    const game = await prisma.game.findUnique({
      where: { id: bggId },
      select: { confirmedCategory: true }
    });
    if (!game || game.confirmedCategory !== null) return;

    // Upsert del voto (el usuario puede cambiar su voto previo)
    await prisma.gameCategoryVote.upsert({
      where: { bggId_userId: { bggId, userId } },
      update: { category },
      create: { bggId, userId, category }
    });

    // Contar votos por categoría
    const votes = await prisma.gameCategoryVote.findMany({
      where: { bggId },
      select: { userId: true, category: true }
    });

    // Agrupar por categoría
    const countByCategory: Record<string, string[]> = {};
    for (const vote of votes) {
      if (!countByCategory[vote.category]) countByCategory[vote.category] = [];
      countByCategory[vote.category]!.push(vote.userId);
    }

    // Buscar si alguna categoría tiene >= 2 votos
    const winner = Object.entries(countByCategory).find(([, voters]) => voters.length >= 2);
    if (!winner) return;

    const [winningCategory, voters] = winner;

    // Fijar categoría confirmada en el juego
    await prisma.game.update({
      where: { id: bggId },
      data: { confirmedCategory: winningCategory as BadgeCategory }
    });

    // Acreditar punto a los 2 primeros votantes de la categoría ganadora
    const winningVoters = voters.slice(0, 2);
    for (const voterId of winningVoters) {
      // Crear registro de consenso (@@unique evita duplicados si ya existía)
      await prisma.genreConsensusHistory.upsert({
        where: { userId_bggId: { userId: voterId, bggId } },
        update: {},
        create: { userId: voterId, bggId, category: winningCategory as BadgeCategory }
      });
      await checkAndUnlockBadges(voterId, BadgeCategory.CONOCEDOR_GENEROS);
    }

    console.log(`[CONOCEDOR_GENEROS] Juego ${bggId} fijado como ${winningCategory}. Puntos a: ${winningVoters.join(', ')}`);
  } catch (error) {
    console.error('[CONOCEDOR_GENEROS] Error procesando voto:', error);
  }
};
