// server/src/controllers/memberController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { MemberData, MembersResponse } from '../types/members';

/**
 * GET /api/admin/members
 * Get paginated members list with filters
 */
export const getMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      membershipType = 'all',
      dateFrom,
      dateTo,
      paymentStatus = 'all',
      page = '1',
      pageSize = '25'
    } = req.query;

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const skip = (pageNum - 1) * pageSizeNum;

    // Build where clause
    const where: any = {
      status: 'APPROVED',
    };

    // Search filter (name or email)
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Membership type filter
    if (membershipType !== 'all') {
      if (membershipType === 'BAJA') {
        where.membership = {
          fechaBaja: { not: null }
        };
      } else {
        where.membership = {
          type: membershipType,
          fechaBaja: null
        };
      }
    } else {
      // For 'all', we want users with membership (active or inactive)
      where.membership = { isNot: null };
    }

    // Date range filter (startDate)
    if (dateFrom || dateTo) {
      if (!where.membership) where.membership = {};
      where.membership.startDate = {};
      if (dateFrom) where.membership.startDate.gte = new Date(dateFrom as string);
      if (dateTo) where.membership.startDate.lte = new Date(dateTo as string);
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          membership: true,
          profile: {
            select: { phone: true }
          },
          payments: {
            where: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1
            },
            take: 1
          }
        },
        skip,
        take: pageSizeNum,
        orderBy: { name: 'asc' }
      }),
      prisma.user.count({ where })
    ]);

    // Calculate payment status for each member
    const membersData: MemberData[] = users.map(user => {
      const hasCurrentMonthPayment = user.payments.length > 0;

      // Determine membership type
      let membershipType: 'SOCIO' | 'COLABORADOR' | 'BAJA' | null = null;
      if (user.membership) {
        if (user.membership.fechaBaja) {
          membershipType = 'BAJA';
        } else {
          membershipType = user.membership.type;
        }
      }

      // Calculate payment status
      const paymentStatus = hasCurrentMonthPayment ? 'al_dia' : 'con_retrasos';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipType,
        startDate: user.membership?.startDate.toISOString() || null,
        fechaBaja: user.membership?.fechaBaja?.toISOString() || null,
        paymentStatus,
        monthlyFee: user.membership ? parseFloat(user.membership.monthlyFee.toString()) : null,
        phone: user.profile?.phone || null,
        lastPaymentDate: user.membership?.lastPaymentDate?.toISOString() || null
      };
    });

    // Apply payment status filter if specified
    let filteredMembers = membersData;
    if (paymentStatus !== 'all') {
      filteredMembers = membersData.filter(m => m.paymentStatus === paymentStatus);
    }

    const response: MembersResponse = {
      members: filteredMembers,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSizeNum,
        totalMembers: totalCount,
        totalPages: Math.ceil(totalCount / pageSizeNum)
      }
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener miembros'
    });
  }
};

/**
 * POST /api/admin/members/:memberId/mark-baja
 * Mark a member as BAJA (inactive)
 */
export const markMemberAsBaja = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const { fechaBaja } = req.body;

    const membership = await prisma.membership.findUnique({
      where: { userId: memberId }
    });

    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Membresía no encontrada'
      });
      return;
    }

    if (membership.fechaBaja) {
      res.status(400).json({
        success: false,
        message: 'El miembro ya está marcado como BAJA'
      });
      return;
    }

    await prisma.membership.update({
      where: { userId: memberId },
      data: {
        fechaBaja: fechaBaja ? new Date(fechaBaja) : new Date(),
        isActive: false
      }
    });

    res.status(200).json({
      success: true,
      message: 'Miembro marcado como BAJA exitosamente'
    });
  } catch (error) {
    console.error('Error marking member as BAJA:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar miembro como BAJA'
    });
  }
};

/**
 * GET /api/admin/members/export/csv
 * Export members to CSV with same filters as list view
 */
export const exportMembersCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      membershipType = 'all',
      dateFrom,
      dateTo,
      paymentStatus = 'all'
    } = req.query;

    const where: any = {
      status: 'APPROVED',
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (membershipType !== 'all') {
      if (membershipType === 'BAJA') {
        where.membership = { fechaBaja: { not: null } };
      } else {
        where.membership = { type: membershipType, fechaBaja: null };
      }
    } else {
      where.membership = { isNot: null };
    }

    if (dateFrom || dateTo) {
      if (!where.membership) where.membership = {};
      where.membership.startDate = {};
      if (dateFrom) where.membership.startDate.gte = new Date(dateFrom as string);
      if (dateTo) where.membership.startDate.lte = new Date(dateTo as string);
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        membership: true,
        profile: { select: { phone: true } },
        payments: {
          where: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1
          },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    // Build CSV content
    const csvHeader = 'Nombre,Email,Tipo de Membresía,Fecha de Incorporación,Fecha de Baja,Estado de Pago,Cuota Mensual,Teléfono\n';

    const csvRows = users.map(user => {
      const hasCurrentMonthPayment = user.payments.length > 0;
      const membershipType = user.membership?.fechaBaja
        ? 'BAJA'
        : user.membership?.type || '';
      const startDate = user.membership?.startDate
        ? new Date(user.membership.startDate).toLocaleDateString('es-ES')
        : '';
      const fechaBaja = user.membership?.fechaBaja
        ? new Date(user.membership.fechaBaja).toLocaleDateString('es-ES')
        : '';
      const paymentStatusText = hasCurrentMonthPayment ? 'Al día' : 'Con retrasos';
      const monthlyFee = user.membership?.monthlyFee || '';
      const phone = user.profile?.phone || '';

      // Apply payment status filter
      if (paymentStatus !== 'all') {
        const currentPaymentStatus = hasCurrentMonthPayment ? 'al_dia' : 'con_retrasos';
        if (currentPaymentStatus !== paymentStatus) return null;
      }

      return `"${user.name}","${user.email}","${membershipType}","${startDate}","${fechaBaja}","${paymentStatusText}","${monthlyFee}","${phone}"`;
    }).filter(row => row !== null).join('\n');

    const csvContent = csvHeader + csvRows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="miembros_${new Date().toISOString().split('T')[0]}.csv"`);

    // Add BOM for Excel UTF-8 compatibility
    res.write('\uFEFF');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.error('Error exporting members CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar CSV'
    });
  }
};
