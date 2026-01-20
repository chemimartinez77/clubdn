// server/src/controllers/memberController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { MemberData, MembersResponse } from '../types/members';
import { getPaymentStatus } from '../utils/paymentStatus';

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
      paymentStatus: paymentStatusFilter = 'all',
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

    // Build membership filter object
    const membershipFilter: any = {};

    // Membership type filter
    if (membershipType !== 'all') {
      if (membershipType === 'BAJA') {
        membershipFilter.fechaBaja = { not: null };
      } else {
        membershipFilter.type = membershipType;
        membershipFilter.fechaBaja = null;
      }
    }

    // Date range filter (startDate)
    if (dateFrom || dateTo) {
      membershipFilter.startDate = {};
      if (dateFrom) membershipFilter.startDate.gte = new Date(dateFrom as string);
      if (dateTo) membershipFilter.startDate.lte = new Date(dateTo as string);
    }

    // Apply membership filter
    if (Object.keys(membershipFilter).length > 0) {
      where.membership = membershipFilter;
    } else {
      // For 'all' with no date filter, we want users with membership (active or inactive)
      where.membership = { isNot: null };
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
            select: {
              month: true,
              year: true
            }
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
      const computedPaymentStatus = getPaymentStatus({
        payments: user.payments,
        startDate: user.membership?.startDate || null
      });

      // Determine membership type
      let membershipType: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | null = null;
      if (user.membership) {
        if (user.membership.fechaBaja) {
          membershipType = 'BAJA';
        } else {
          membershipType = user.membership.type;
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipType,
        startDate: user.membership?.startDate.toISOString() || null,
        fechaBaja: user.membership?.fechaBaja?.toISOString() || null,
        paymentStatus: computedPaymentStatus,
        monthlyFee: user.membership ? parseFloat(user.membership.monthlyFee.toString()) : null,
        phone: user.profile?.phone || null,
        lastPaymentDate: user.membership?.lastPaymentDate?.toISOString() || null
      };
    });

    // Apply payment status filter if specified
    let filteredMembers = membersData;
    if (paymentStatusFilter !== 'all') {
      filteredMembers = membersData.filter(m => m.paymentStatus === paymentStatusFilter);
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
      paymentStatus: paymentStatusFilter = 'all'
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

    // Build membership filter object
    const membershipFilterExport: any = {};

    // Membership type filter
    if (membershipType !== 'all') {
      if (membershipType === 'BAJA') {
        membershipFilterExport.fechaBaja = { not: null };
      } else {
        membershipFilterExport.type = membershipType;
        membershipFilterExport.fechaBaja = null;
      }
    }

    // Date range filter (startDate)
    if (dateFrom || dateTo) {
      membershipFilterExport.startDate = {};
      if (dateFrom) membershipFilterExport.startDate.gte = new Date(dateFrom as string);
      if (dateTo) membershipFilterExport.startDate.lte = new Date(dateTo as string);
    }

    // Apply membership filter
    if (Object.keys(membershipFilterExport).length > 0) {
      where.membership = membershipFilterExport;
    } else {
      // For 'all' with no date filter, we want users with membership (active or inactive)
      where.membership = { isNot: null };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        membership: true,
        profile: { select: { phone: true } },
        payments: {
          select: {
            month: true,
            year: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Build CSV content
    const csvHeader = 'Nombre,Email,Tipo de Membresía,Fecha de Incorporación,Fecha de Baja,Estado de Pago,Cuota Mensual,Teléfono\n';

    const csvRows = users.map(user => {
      const membershipType = user.membership?.fechaBaja
        ? 'BAJA'
        : user.membership?.type || '';
      const startDate = user.membership?.startDate
        ? new Date(user.membership.startDate).toLocaleDateString('es-ES')
        : '';
      const fechaBaja = user.membership?.fechaBaja
        ? new Date(user.membership.fechaBaja).toLocaleDateString('es-ES')
        : '';
      const computedPaymentStatus = getPaymentStatus({
        payments: user.payments,
        startDate: user.membership?.startDate || null
      });
      const paymentStatusText = computedPaymentStatus === 'PAGADO'
        ? 'Pagado'
        : computedPaymentStatus === 'PENDIENTE'
        ? 'Pendiente'
        : computedPaymentStatus === 'IMPAGADO'
        ? 'Impagado'
        : computedPaymentStatus === 'ANO_COMPLETO'
        ? 'Año completo'
        : 'Nuevo';
      const monthlyFee = user.membership?.monthlyFee || '';
      const phone = user.profile?.phone || '';

      // Apply payment status filter
      if (paymentStatusFilter !== 'all') {
        const currentPaymentStatus = computedPaymentStatus;
        if (currentPaymentStatus !== paymentStatusFilter) return null;
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
