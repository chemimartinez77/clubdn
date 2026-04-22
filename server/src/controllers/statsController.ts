// server/src/controllers/statsController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { RegistrationStatus, EventStatus, BadgeCategory } from '@prisma/client';
import { checkAndUnlockBadges } from './badgeController';
import { notifyEventDisputeConfirmation } from '../services/notificationService';

const formatMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthLabel = (year: number, month: number): string => (
  new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
);

const displayUserName = (name: string, nick?: string | null): string => {
  const cleanNick = nick?.trim();
  return cleanNick || name;
};

/**
 * Marca como COMPLETED todos los eventos/partidas cuya fecha ya ha pasado
 * y crea los registros de GamePlayHistory para los participantes confirmados.
 * Se llama automáticamente al cargar stats para mantener los datos actualizados.
 */
export async function completePassedEvents(): Promise<void> {
  const now = new Date();

  // Buscar eventos candidatos (fecha pasada) que aún no están COMPLETED ni CANCELLED
  const candidateEvents = await prisma.event.findMany({
    where: {
      date: { lt: now },
      status: { notIn: [EventStatus.COMPLETED, EventStatus.CANCELLED] }
    },
    include: {
      registrations: {
        where: { status: RegistrationStatus.CONFIRMED },
        select: { userId: true }
      }
    }
  });

  // Filtrar solo los que ya han terminado según su hora fin real
  // event.date ya viene en UTC con la hora local convertida (ej. 17:00 España = 15:00 UTC)
  // así que usamos directamente el timestamp UTC sin sobreescribir la hora
  const passedEvents = candidateEvents.filter(event => {
    const durationMinutes = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
    const endDate = new Date(event.date.getTime() + durationMinutes * 60 * 1000);
    return endDate <= now;
  });

  if (passedEvents.length === 0) {
    // Aun así limpiar notificaciones caducadas
    await cleanExpiredDisputeNotifications(now);
    return;
  }

  for (const event of passedEvents) {
    // Marcar el evento como completado
    await prisma.event.update({
      where: { id: event.id },
      data: { status: EventStatus.COMPLETED, disputeAsked: true }
    });

    // Notificar al organizador solo si aún no se le había preguntado
    if (!event.disputeAsked) {
      await notifyEventDisputeConfirmation(event.id, event.title, event.createdBy);
    }
  }

  await cleanExpiredDisputeNotifications(now);
}

/**
 * Elimina notificaciones EVENT_DISPUTE_CONFIRMATION con más de 48h de antigüedad.
 */
async function cleanExpiredDisputeNotifications(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({
    where: {
      type: 'EVENT_DISPUTE_CONFIRMATION',
      createdAt: { lt: cutoff }
    }
  });
}

/**
 * Procesa los GamePlayHistory y badges para un evento confirmado como disputado.
 * Se llama desde confirmEventPlayed.
 */
export async function processEventPlayHistory(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: RegistrationStatus.CONFIRMED },
        select: { userId: true }
      }
    }
  });

  if (!event || event.type !== 'PARTIDA' || !event.gameName || !event.gameCategory) return;

  const gameName = event.gameName;
  const gameCategory = event.gameCategory as BadgeCategory;

  for (const { userId } of event.registrations) {
    const alreadyTracked = await prisma.gamePlayHistory.findFirst({
      where: { userId, eventId: event.id }
    });

    if (!alreadyTracked) {
      await prisma.gamePlayHistory.create({
        data: { userId, eventId: event.id, gameName, gameCategory }
      });
      await checkAndUnlockBadges(userId, gameCategory);
    }
  }
}

/**
 * Obtener estadísticas generales del sistema (solo admins)
 */
export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total de usuarios por estado
    const totalUsers = await prisma.user.count();
    const pendingVerification = await prisma.user.count({
      where: { status: 'PENDING_VERIFICATION' }
    });
    const pendingApproval = await prisma.user.count({
      where: { status: 'PENDING_APPROVAL' }
    });
    const approved = await prisma.user.count({
      where: { status: 'APPROVED' }
    });
    const rejected = await prisma.user.count({
      where: { status: 'REJECTED' }
    });
    const suspended = await prisma.user.count({
      where: { status: 'SUSPENDED' }
    });

    // Nuevos registros (últimos 7 y 30 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast7Days = await prisma.user.count({
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const newUsersLast30Days = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    // Usuarios por rol
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    // Últimos login attempts (últimas 24 horas)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const loginAttemptsLast24h = await prisma.loginAttempt.count({
      where: {
        attemptedAt: { gte: last24Hours }
      }
    });

    const successfulLoginsLast24h = await prisma.loginAttempt.count({
      where: {
        attemptedAt: { gte: last24Hours },
        success: true
      }
    });

    const failedLoginsLast24h = await prisma.loginAttempt.count({
      where: {
        attemptedAt: { gte: last24Hours },
        success: false
      }
    });

    // Usuarios más recientes
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            avatar: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        userStats: {
          total: totalUsers,
          byStatus: {
            pendingVerification,
            pendingApproval,
            approved,
            rejected,
            suspended
          },
          byRole: usersByRole.map((r) => ({
            role: r.role,
            count: r._count
          })),
          newUsers: {
            last7Days: newUsersLast7Days,
            last30Days: newUsersLast30Days
          }
        },
        loginStats: {
          last24Hours: {
            total: loginAttemptsLast24h,
            successful: successfulLoginsLast24h,
            failed: failedLoginsLast24h
          }
        },
        recentUsers
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

/**
 * Obtener estadísticas del usuario
 */
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    // Actualizar eventos pasados a COMPLETED y registrar GamePlayHistory
    await completePassedEvents();

    // 1. Eventos asistidos (confirmados y completados)
    const eventsAttended = await prisma.eventRegistration.count({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          status: EventStatus.COMPLETED
        }
      }
    });

    // 2. Partidas jugadas (solo eventos tipo PARTIDA)
    const gamesPlayed = await prisma.eventRegistration.count({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED
        }
      }
    });

    // 3. Top 3 juegos más jugados por el usuario
    const userTopGames = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED,
          gameName: { not: null }
        }
      },
      select: {
        event: {
          select: {
            gameName: true,
            gameImage: true
          }
        }
      }
    });

    // Contar juegos y obtener top 3
    const gameCounts = userTopGames.reduce((acc: Record<string, { count: number; image: string | null }>, reg) => {
      const gameName = reg.event.gameName;
      if (gameName) {
        if (!acc[gameName]) {
          acc[gameName] = { count: 0, image: reg.event.gameImage || null };
        }
        acc[gameName].count++;
      }
      return acc;
    }, {});

    const topGames = Object.entries(gameCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([name, data]) => ({ name, count: data.count, image: data.image }));
    const uniqueGamesPlayed = Object.keys(gameCounts).length;

    // 4. Próximos eventos (confirmados y programados o en curso)
    const upcomingEvents = await prisma.eventRegistration.count({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          status: {
            in: [EventStatus.SCHEDULED, EventStatus.ONGOING]
          },
          date: {
            gte: new Date()
          }
        }
      }
    });

    // 5. Con quién ha jugado más partidas (top 3 compañeros)
    const playedWith = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED
        }
      },
      select: {
        event: {
          select: {
            registrations: {
              where: {
                userId: { not: userId },
                status: RegistrationStatus.CONFIRMED
              },
              select: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Contar partidas con cada usuario
    const playerCounts: Record<string, { name: string; count: number }> = {};
    playedWith.forEach(reg => {
      reg.event.registrations.forEach(otherReg => {
        const playerId = otherReg.user.id;
        if (!playerCounts[playerId]) {
          playerCounts[playerId] = { name: otherReg.user.name, count: 0 };
        }
        playerCounts[playerId].count++;
      });
    });

    const topPlayers = Object.values(playerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 6. Horarios más frecuentes (a qué hora suele jugar)
    const eventsWithTime = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED,
          startHour: { not: null }
        }
      },
      select: {
        event: {
          select: {
            startHour: true
          }
        }
      }
    });

    // Agrupar por rangos horarios
    const timeRanges: Record<string, number> = {
      'Mañana (8-14h)': 0,
      'Tarde (14-20h)': 0,
      'Noche (20-24h)': 0,
      'Madrugada (0-8h)': 0
    };

    eventsWithTime.forEach(reg => {
      const hour = reg.event.startHour;
      if (hour !== null && hour !== undefined) {
        if (hour >= 8 && hour < 14) {
          timeRanges['Mañana (8-14h)'] = (timeRanges['Mañana (8-14h)'] || 0) + 1;
        } else if (hour >= 14 && hour < 20) {
          timeRanges['Tarde (14-20h)'] = (timeRanges['Tarde (14-20h)'] || 0) + 1;
        } else if (hour >= 20 && hour < 24) {
          timeRanges['Noche (20-24h)'] = (timeRanges['Noche (20-24h)'] || 0) + 1;
        } else {
          timeRanges['Madrugada (0-8h)'] = (timeRanges['Madrugada (0-8h)'] || 0) + 1;
        }
      }
    });

    const mostCommonTimeRange = Object.entries(timeRanges)
      .sort(([, a], [, b]) => b - a)[0] || ['N/A', 0];

    // 7. Días de la semana más frecuentes
    const eventsWithDay = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED
        }
      },
      select: {
        event: {
          select: {
            date: true
          }
        }
      }
    });

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    eventsWithDay.forEach(reg => {
      const dayOfWeek = new Date(reg.event.date).getDay();
      if (dayCounts[dayOfWeek] !== undefined) {
        dayCounts[dayOfWeek]++;
      }
    });

    const topDays = dayCounts
      .map((count, index) => ({ day: dayNames[index], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    res.json({
      success: true,
      data: {
        eventsAttended,
        gamesPlayed,
        uniqueGamesPlayed,
        topGames,
        upcomingEvents,
        topPlayers,
        favoriteTimeRange: mostCommonTimeRange[0],
        topDays
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

/**
 * Obtener estadisticas personales completas del usuario.
 */
export const getUserDetailedStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    await completePassedEvents();

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED
        }
      },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            startHour: true,
            startMinute: true,
            createdBy: true,
            gameName: true,
            gameImage: true,
            game: {
              select: {
                thumbnail: true,
                image: true
              }
            },
            registrations: {
              where: {
                status: RegistrationStatus.CONFIRMED
              },
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    profile: {
                      select: {
                        nick: true,
                        avatar: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          date: 'desc'
        }
      }
    });

    const byYear = new Map<number, number>();
    const byMonth = new Map<string, { year: number; month: number; label: string; count: number }>();
    const activityByDate = new Map<string, number>();
    const games = new Map<string, { name: string; count: number; image: string | null; latestEventId: string; latestDate: Date }>();
    const players = new Map<string, { userId: string; name: string; avatar: string | null; count: number; latestEventId: string; latestDate: Date }>();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const timeRangeCounts: Record<'morning' | 'afternoon' | 'evening' | 'night' | 'unknown', number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
      unknown: 0
    };

    let organizedGames = 0;

    for (const { event } of registrations) {
      const eventDate = event.date;
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth() + 1;
      const monthKey = formatMonthKey(eventDate);
      const dateKey = formatDateKey(eventDate);

      byYear.set(year, (byYear.get(year) ?? 0) + 1);
      const monthEntry = byMonth.get(monthKey) ?? { year, month, label: monthLabel(year, month), count: 0 };
      monthEntry.count += 1;
      byMonth.set(monthKey, monthEntry);
      activityByDate.set(dateKey, (activityByDate.get(dateKey) ?? 0) + 1);

      const day = eventDate.getDay();
      if (dayCounts[day] !== undefined) dayCounts[day]++;

      const hour = event.startHour;
      if (hour === null || hour === undefined) {
        timeRangeCounts.unknown++;
      } else if (hour >= 8 && hour < 14) {
        timeRangeCounts.morning++;
      } else if (hour >= 14 && hour < 20) {
        timeRangeCounts.afternoon++;
      } else if (hour >= 20 && hour < 24) {
        timeRangeCounts.evening++;
      } else {
        timeRangeCounts.night++;
      }

      if (event.createdBy === userId) organizedGames++;

      const gameName = event.gameName || event.title;
      const existingGame = games.get(gameName);
      if (!existingGame) {
        games.set(gameName, {
          name: gameName,
          count: 1,
          image: event.game?.image || event.game?.thumbnail || event.gameImage || null,
          latestEventId: event.id,
          latestDate: eventDate
        });
      } else {
        existingGame.count++;
        if (eventDate > existingGame.latestDate) {
          existingGame.latestEventId = event.id;
          existingGame.latestDate = eventDate;
          existingGame.image = event.game?.image || event.game?.thumbnail || event.gameImage || existingGame.image;
        }
      }

      for (const registration of event.registrations) {
        if (registration.userId === userId) continue;
        const existingPlayer = players.get(registration.userId);
        const playerName = displayUserName(registration.user.name, registration.user.profile?.nick);
        if (!existingPlayer) {
          players.set(registration.userId, {
            userId: registration.userId,
            name: playerName,
            avatar: registration.user.profile?.avatar ?? null,
            count: 1,
            latestEventId: event.id,
            latestDate: eventDate
          });
        } else {
          existingPlayer.count++;
          if (eventDate > existingPlayer.latestDate) {
            existingPlayer.latestEventId = event.id;
            existingPlayer.latestDate = eventDate;
          }
        }
      }
    }

    const gamesPlayed = registrations.length;
    const byMonthList = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, ...value }));

    res.json({
      success: true,
      data: {
        summary: {
          gamesPlayed,
          organizedGames,
          joinedGames: gamesPlayed - organizedGames,
          uniqueGames: games.size,
          uniquePlayers: players.size
        },
        byYear: Array.from(byYear.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, count]) => ({ year, count })),
        byMonth: byMonthList,
        activityByDate: Array.from(activityByDate.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
        dayOfWeek: dayCounts.map((count, index) => ({ day: dayNames[index], count })),
        timeRanges: [
          { key: 'morning', label: 'Manana (8-14h)', count: timeRangeCounts.morning },
          { key: 'afternoon', label: 'Tarde (14-20h)', count: timeRangeCounts.afternoon },
          { key: 'evening', label: 'Noche (20-24h)', count: timeRangeCounts.evening },
          { key: 'night', label: 'Madrugada (0-8h)', count: timeRangeCounts.night },
          { key: 'unknown', label: 'Sin hora', count: timeRangeCounts.unknown }
        ],
        games: Array.from(games.values())
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
          .map(game => ({
            ...game,
            latestDate: game.latestDate.toISOString()
          })),
        players: Array.from(players.values())
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
          .map(player => ({
            ...player,
            latestDate: player.latestDate.toISOString()
          }))
      }
    });
  } catch (error) {
    console.error('Error al obtener estadisticas personales detalladas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadisticas personales'
    });
  }
};

/**
 * Obtener eventos asistidos del usuario (detallados)
 */
export const getUserEventsAttended = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const events = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          status: EventStatus.COMPLETED
        }
      },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            gameName: true,
            gameImage: true,
            bggId: true,
            date: true,
            startHour: true,
            startMinute: true,
            durationHours: true,
            durationMinutes: true,
            maxAttendees: true,
            location: true,
            status: true,
            registrations: {
              where: {
                status: RegistrationStatus.CONFIRMED
              },
              select: {
                id: true
              }
            },
            invitations: {
              where: {
                status: {
                  in: ['PENDING', 'PENDING_APPROVAL', 'USED']
                }
              },
              select: {
                id: true
              }
            },
            game: {
              select: {
                thumbnail: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          date: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: events.map(e => e.event)
    });

  } catch (error) {
    console.error('Error al obtener eventos asistidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener eventos asistidos'
    });
  }
};

/**
 * Obtener partidas jugadas del usuario (detalladas)
 */
export const getUserGamesPlayed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const games = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          type: 'PARTIDA',
          status: EventStatus.COMPLETED
        }
      },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            gameName: true,
            gameImage: true,
            bggId: true,
            date: true,
            startHour: true,
            startMinute: true,
            durationHours: true,
            durationMinutes: true,
            maxAttendees: true,
            location: true,
            status: true,
            registrations: {
              where: {
                status: RegistrationStatus.CONFIRMED
              },
              select: {
                id: true
              }
            },
            invitations: {
              where: {
                status: {
                  in: ['PENDING', 'PENDING_APPROVAL', 'USED']
                }
              },
              select: {
                id: true
              }
            },
            game: {
              select: {
                thumbnail: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          date: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: games.map(g => g.event)
    });

  } catch (error) {
    console.error('Error al obtener partidas jugadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener partidas jugadas'
    });
  }
};

/**
 * Obtener próximos eventos del usuario (detallados)
 */
export const getUserUpcomingEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const now = new Date();
    // Traemos eventos SCHEDULED u ONGOING sin filtrar por fecha — lo haremos en código
    // para poder comparar con la hora de FIN (no de inicio)
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        event: {
          status: {
            in: [EventStatus.SCHEDULED, EventStatus.ONGOING]
          },
          date: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // ventana de 24h atrás
          }
        }
      },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            gameName: true,
            gameImage: true,
            bggId: true,
            date: true,
            startHour: true,
            startMinute: true,
            durationHours: true,
            durationMinutes: true,
            maxAttendees: true,
            location: true,
            status: true,
            registrations: {
              where: {
                status: RegistrationStatus.CONFIRMED
              },
              select: {
                id: true
              }
            },
            invitations: {
              where: {
                status: {
                  in: ['PENDING', 'PENDING_APPROVAL', 'USED']
                }
              },
              select: {
                id: true
              }
            },
            game: {
              select: {
                thumbnail: true,
                image: true
              }
            },
            linkedPreviousEvent: {
              select: {
                id: true,
                title: true,
                gameName: true,
                gameImage: true,
                bggId: true,
                startHour: true,
                startMinute: true,
                durationHours: true,
                durationMinutes: true,
                status: true,
                date: true,
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          date: 'asc'
        }
      }
    });

    // Filtrar: solo mostrar si la hora de fin aún no ha pasado
    const events = registrations
      .map(r => ({
        ...r.event,
        registeredCount: r.event.registrations.length + r.event.invitations.length
      }))
      .filter(event => {
        const durationMins = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
        const endDate = new Date(event.date.getTime() + durationMins * 60 * 1000);
        return endDate > now;
      });

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Error al obtener próximos eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener próximos eventos'
    });
  }
};

/**
 * Obtener estadísticas globales del club
 */
export const getClubStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Top 3 juegos más jugados en el club
    const clubEvents = await prisma.event.findMany({
      where: {
        type: 'PARTIDA',
        status: EventStatus.COMPLETED,
        gameName: { not: null }
      },
      select: {
        gameName: true,
        gameImage: true
      }
    });

    const gameCounts = clubEvents.reduce((acc: Record<string, { count: number; image: string | null }>, event) => {
      const gameName = event.gameName;
      if (gameName) {
        if (!acc[gameName]) {
          acc[gameName] = { count: 0, image: event.gameImage || null };
        }
        acc[gameName].count++;
      }
      return acc;
    }, {});

    const clubTopGames = Object.entries(gameCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([name, data]) => ({ name, count: data.count, image: data.image }));

    res.json({
      success: true,
      data: {
        topGames: clubTopGames
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del club:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del club'
    });
  }
};
