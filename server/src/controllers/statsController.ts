// server/src/controllers/statsController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

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
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};
