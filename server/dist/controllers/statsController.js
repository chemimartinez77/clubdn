"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClubStats = exports.getUserStats = exports.getAdminStats = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
/**
 * Obtener estadísticas generales del sistema (solo admins)
 */
const getAdminStats = async (_req, res) => {
    try {
        // Total de usuarios por estado
        const totalUsers = await database_1.prisma.user.count();
        const pendingVerification = await database_1.prisma.user.count({
            where: { status: 'PENDING_VERIFICATION' }
        });
        const pendingApproval = await database_1.prisma.user.count({
            where: { status: 'PENDING_APPROVAL' }
        });
        const approved = await database_1.prisma.user.count({
            where: { status: 'APPROVED' }
        });
        const rejected = await database_1.prisma.user.count({
            where: { status: 'REJECTED' }
        });
        const suspended = await database_1.prisma.user.count({
            where: { status: 'SUSPENDED' }
        });
        // Nuevos registros (últimos 7 y 30 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersLast7Days = await database_1.prisma.user.count({
            where: {
                createdAt: { gte: sevenDaysAgo }
            }
        });
        const newUsersLast30Days = await database_1.prisma.user.count({
            where: {
                createdAt: { gte: thirtyDaysAgo }
            }
        });
        // Usuarios por rol
        const usersByRole = await database_1.prisma.user.groupBy({
            by: ['role'],
            _count: true
        });
        // Últimos login attempts (últimas 24 horas)
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);
        const loginAttemptsLast24h = await database_1.prisma.loginAttempt.count({
            where: {
                attemptedAt: { gte: last24Hours }
            }
        });
        const successfulLoginsLast24h = await database_1.prisma.loginAttempt.count({
            where: {
                attemptedAt: { gte: last24Hours },
                success: true
            }
        });
        const failedLoginsLast24h = await database_1.prisma.loginAttempt.count({
            where: {
                attemptedAt: { gte: last24Hours },
                success: false
            }
        });
        // Usuarios más recientes
        const recentUsers = await database_1.prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true
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
    }
    catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};
exports.getAdminStats = getAdminStats;
/**
 * Obtener estadísticas del usuario
 */
const getUserStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'No autorizado' });
            return;
        }
        // 1. Eventos asistidos (confirmados y completados)
        const eventsAttended = await database_1.prisma.eventRegistration.count({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    status: client_1.EventStatus.COMPLETED
                }
            }
        });
        // 2. Partidas jugadas (solo eventos tipo PARTIDA)
        const gamesPlayed = await database_1.prisma.eventRegistration.count({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    type: 'PARTIDA',
                    status: client_1.EventStatus.COMPLETED
                }
            }
        });
        // 3. Top 3 juegos más jugados por el usuario
        const userTopGames = await database_1.prisma.eventRegistration.findMany({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    type: 'PARTIDA',
                    status: client_1.EventStatus.COMPLETED,
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
        const gameCounts = userTopGames.reduce((acc, reg) => {
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
        // 4. Próximos eventos (confirmados y programados o en curso)
        const upcomingEvents = await database_1.prisma.eventRegistration.count({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    status: {
                        in: [client_1.EventStatus.SCHEDULED, client_1.EventStatus.ONGOING]
                    },
                    date: {
                        gte: new Date()
                    }
                }
            }
        });
        // 5. Con quién ha jugado más partidas (top 3 compañeros)
        const playedWith = await database_1.prisma.eventRegistration.findMany({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    type: 'PARTIDA',
                    status: client_1.EventStatus.COMPLETED
                }
            },
            select: {
                event: {
                    select: {
                        registrations: {
                            where: {
                                userId: { not: userId },
                                status: client_1.RegistrationStatus.CONFIRMED
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
        const playerCounts = {};
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
        const eventsWithTime = await database_1.prisma.eventRegistration.findMany({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    type: 'PARTIDA',
                    status: client_1.EventStatus.COMPLETED,
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
        const timeRanges = {
            'Mañana (8-12h)': 0,
            'Tarde (12-18h)': 0,
            'Noche (18-24h)': 0,
            'Madrugada (0-8h)': 0
        };
        eventsWithTime.forEach(reg => {
            const hour = reg.event.startHour;
            if (hour !== null && hour !== undefined) {
                if (hour >= 8 && hour < 12) {
                    timeRanges['Mañana (8-12h)'] = (timeRanges['Mañana (8-12h)'] || 0) + 1;
                }
                else if (hour >= 12 && hour < 18) {
                    timeRanges['Tarde (12-18h)'] = (timeRanges['Tarde (12-18h)'] || 0) + 1;
                }
                else if (hour >= 18 && hour < 24) {
                    timeRanges['Noche (18-24h)'] = (timeRanges['Noche (18-24h)'] || 0) + 1;
                }
                else {
                    timeRanges['Madrugada (0-8h)'] = (timeRanges['Madrugada (0-8h)'] || 0) + 1;
                }
            }
        });
        const mostCommonTimeRange = Object.entries(timeRanges)
            .sort(([, a], [, b]) => b - a)[0] || ['N/A', 0];
        // 7. Días de la semana más frecuentes
        const eventsWithDay = await database_1.prisma.eventRegistration.findMany({
            where: {
                userId,
                status: client_1.RegistrationStatus.CONFIRMED,
                event: {
                    type: 'PARTIDA',
                    status: client_1.EventStatus.COMPLETED
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
                topGames,
                upcomingEvents,
                topPlayers,
                favoriteTimeRange: mostCommonTimeRange[0],
                topDays
            }
        });
    }
    catch (error) {
        console.error('Error al obtener estadísticas del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};
exports.getUserStats = getUserStats;
/**
 * Obtener estadísticas globales del club
 */
const getClubStats = async (_req, res) => {
    try {
        // Top 3 juegos más jugados en el club
        const clubEvents = await database_1.prisma.event.findMany({
            where: {
                type: 'PARTIDA',
                status: client_1.EventStatus.COMPLETED,
                gameName: { not: null }
            },
            select: {
                gameName: true,
                gameImage: true
            }
        });
        const gameCounts = clubEvents.reduce((acc, event) => {
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
    }
    catch (error) {
        console.error('Error al obtener estadísticas del club:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del club'
        });
    }
};
exports.getClubStats = getClubStats;
//# sourceMappingURL=statsController.js.map