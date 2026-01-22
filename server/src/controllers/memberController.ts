// server/src/controllers/memberController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../config/database';
import { MemberData, MembersResponse } from '../types/members';
import { getPaymentStatus } from '../utils/paymentStatus';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeDni = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

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
 * GET /api/admin/members/:memberId/profile
 * Obtener ficha editable del miembro (solo admin)
 */
export const getMemberProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: memberId },
      include: {
        membership: true,
        profile: true,
        payments: {
          select: {
            month: true,
            year: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Miembro no encontrado'
      });
      return;
    }

    let profile = user.profile;
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId: user.id,
          favoriteGames: [],
          notifications: true,
          emailUpdates: true
        }
      });
    }

    const paymentStatus = getPaymentStatus({
      payments: user.payments,
      startDate: user.membership?.startDate || null
    });

    const membershipType = user.membership?.fechaBaja
      ? 'BAJA'
      : user.membership?.type || null;

    res.status(200).json({
      success: true,
      data: {
        member: {
          id: user.id,
          name: user.name,
          email: user.email,
          membershipType,
          startDate: user.membership?.startDate?.toISOString() || null,
          fechaBaja: user.membership?.fechaBaja?.toISOString() || null,
          paymentStatus,
          profile: {
            id: profile.id,
            avatar: profile.avatar,
            firstName: profile.firstName,
            lastName: profile.lastName,
            dni: profile.dni,
            imageConsentActivities: profile.imageConsentActivities,
            imageConsentSocial: profile.imageConsentSocial
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching member profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ficha del miembro'
    });
  }
};

/**
 * PUT /api/admin/members/:memberId/profile
 * Actualizar ficha editable del miembro (solo admin)
 */
export const updateMemberProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const {
      firstName,
      lastName,
      dni,
      avatar,
      imageConsentActivities,
      imageConsentSocial
    } = req.body;

    if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Nombre requerido'
      });
      return;
    }

    if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Apellidos requeridos'
      });
      return;
    }

    if (!dni || typeof dni !== 'string' || normalizeDni(dni).length < 5) {
      res.status(400).json({
        success: false,
        message: 'DNI requerido'
      });
      return;
    }

    const normalizedFirstName = normalizeText(firstName);
    const normalizedLastName = normalizeText(lastName);
    const normalizedDni = normalizeDni(dni);

    const existingUser = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'Miembro no encontrado'
      });
      return;
    }

    const [updatedUser, profile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: `${normalizedFirstName} ${normalizedLastName}`.trim()
        },
        select: {
          id: true,
          name: true,
          email: true,
          membership: true,
          payments: {
            select: { month: true, year: true }
          }
        }
      }),
      prisma.userProfile.upsert({
        where: { userId: existingUser.id },
        create: {
          userId: existingUser.id,
          avatar: avatar ?? null,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          dni: normalizeText(dni),
          dniNormalized: normalizedDni,
          imageConsentActivities: !!imageConsentActivities,
          imageConsentSocial: !!imageConsentSocial,
          favoriteGames: [],
          notifications: true,
          emailUpdates: true
        },
        update: {
          avatar: avatar ?? null,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          dni: normalizeText(dni),
          dniNormalized: normalizedDni,
          imageConsentActivities: !!imageConsentActivities,
          imageConsentSocial: !!imageConsentSocial
        }
      })
    ]);

    const paymentStatus = getPaymentStatus({
      payments: updatedUser.payments,
      startDate: updatedUser.membership?.startDate || null
    });

    const membershipType = updatedUser.membership?.fechaBaja
      ? 'BAJA'
      : updatedUser.membership?.type || null;

    res.status(200).json({
      success: true,
      message: 'Ficha del miembro actualizada',
      data: {
        member: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          membershipType,
          startDate: updatedUser.membership?.startDate?.toISOString() || null,
          fechaBaja: updatedUser.membership?.fechaBaja?.toISOString() || null,
          paymentStatus,
          profile: {
            id: profile.id,
            avatar: profile.avatar,
            firstName: profile.firstName,
            lastName: profile.lastName,
            dni: profile.dni,
            imageConsentActivities: profile.imageConsentActivities,
            imageConsentSocial: profile.imageConsentSocial
          }
        }
      }
    });
  } catch (error) {
    console.error('Error updating member profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar ficha del miembro'
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

/**
 * POST /api/admin/members/:memberId/avatar
 * Upload avatar for a member (admin only)
 */
export const uploadMemberAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
      return;
    }

    // Verificar tipo de archivo
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WebP'
      });
      return;
    }

    // Verificar tamaño
    if (file.size > MAX_AVATAR_SIZE) {
      res.status(400).json({
        success: false,
        message: 'La imagen excede el tamaño máximo permitido (5MB)'
      });
      return;
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: memberId },
      include: { profile: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    // Eliminar avatar anterior de Cloudinary si existe
    if (user.profile?.avatar) {
      try {
        const urlParts = user.profile.avatar.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1] || '';
        const folderPath = urlParts.slice(-3, -1).join('/');
        const filename = filenameWithExt.split('.')[0] || '';
        if (filename) {
          const publicId = `${folderPath}/${filename}`;
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (deleteError) {
        console.error('Error al eliminar avatar anterior:', deleteError);
      }
    }

    // Subir a Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `clubdn/avatars`,
          public_id: memberId,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    // Actualizar perfil con la nueva URL del avatar
    const profile = await prisma.userProfile.upsert({
      where: { userId: memberId },
      create: {
        userId: memberId,
        avatar: uploadResult.secure_url,
        favoriteGames: [],
        notifications: true,
        emailUpdates: true
      },
      update: {
        avatar: uploadResult.secure_url
      }
    });

    res.status(200).json({
      success: true,
      data: { avatarUrl: uploadResult.secure_url },
      message: 'Avatar actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir avatar'
    });
  }
};
