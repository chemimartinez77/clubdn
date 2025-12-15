"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = void 0;
const database_1 = require("../config/database");
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
//# sourceMappingURL=statsController.js.map