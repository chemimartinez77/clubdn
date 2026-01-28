// server/src/controllers/badgeController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { BadgeCategory } from '@prisma/client';

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
 * Calcular progreso de badges por categoría
 */
async function calculateBadgeProgress(userId: string) {
  const categories = Object.values(BadgeCategory);
  const progress: Record<string, { count: number; nextBadge?: any }> = {};

  for (const category of categories) {
    // Contar juegos únicos jugados en esta categoría
    const uniqueGames = await prisma.gamePlayHistory.findMany({
      where: {
        userId,
        gameCategory: category
      },
      select: {
        gameName: true
      },
      distinct: ['gameName']
    });

    const count = uniqueGames.length;

    // Encontrar el siguiente badge a desbloquear
    const nextBadge = await prisma.badgeDefinition.findFirst({
      where: {
        category,
        requiredCount: { gt: count }
      },
      orderBy: {
        requiredCount: 'asc'
      }
    });

    progress[category] = {
      count,
      nextBadge: nextBadge || undefined
    };
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
    // Contar juegos únicos en esta categoría
    const uniqueGames = await prisma.gamePlayHistory.findMany({
      where: {
        userId,
        gameCategory
      },
      select: {
        gameName: true
      },
      distinct: ['gameName']
    });

    const count = uniqueGames.length;

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
      where: { userId },
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

    const categories = Object.values(BadgeCategory);
    const stats: Record<string, number> = {};

    for (const category of categories) {
      const uniqueGames = await prisma.gamePlayHistory.findMany({
        where: {
          userId,
          gameCategory: category
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
    [BadgeCategory.FILLERS_PARTY]: 'Fillers / Party'
  };
  return names[category];
}
