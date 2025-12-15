// server/src/controllers/membershipController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * GET /api/membership/users?year=2025
 * Lista todos los usuarios con su información de membresía y pagos del año especificado
 */
export const getUsersWithMembership = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const users = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        membership: {
          isNot: null
        }
      },
      include: {
        membership: true,
        payments: {
          where: {
            year
          },
          orderBy: { month: 'asc' }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calcular información adicional y mapear pagos por mes
    const usersWithPaymentStatus = users.map(user => {
      const now = new Date();

      // Crear mapa de pagos por mes (1-12)
      const paymentsByMonth: { [key: number]: boolean } = {};
      for (let i = 1; i <= 12; i++) {
        paymentsByMonth[i] = false;
      }

      // Marcar meses pagados
      user.payments.forEach(payment => {
        paymentsByMonth[payment.month] = true;
      });

      // Calcular meses desde que es miembro
      let monthsAsMember = 0;
      if (user.membership) {
        const start = new Date(user.membership.startDate);
        const diffTime = Math.abs(now.getTime() - start.getTime());
        monthsAsMember = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      }

      // Verificar si puede ser SOCIO (1 año como COLABORADOR)
      const canBecomeSocio = user.membership?.type === 'COLABORADOR' && monthsAsMember >= 12;

      // Contar pagos del año
      const paidMonths = Object.values(paymentsByMonth).filter(paid => paid).length;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        membership: user.membership,
        monthsAsMember,
        canBecomeSocio,
        paymentsByMonth,
        paidMonths,
        status: paidMonths === 12 ? 'Año completo' : paidMonths > 0 ? 'En tiempo' : 'Nuevo'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        year,
        users: usersWithPaymentStatus
      }
    });
  } catch (error) {
    console.error('Error fetching users with membership:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios con membresía'
    });
  }
};

/**
 * POST /api/membership/:userId/create
 * Crear membresía para un usuario
 */
export const createMembership = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { type } = req.body;

    if (!type || !['COLABORADOR', 'SOCIO'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Tipo de membresía inválido. Debe ser COLABORADOR o SOCIO'
      });
      return;
    }

    // Verificar que el usuario existe y está aprobado
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    if (user.membership) {
      res.status(400).json({
        success: false,
        message: 'El usuario ya tiene una membresía activa'
      });
      return;
    }

    const monthlyFee = type === 'SOCIO' ? 19.00 : 15.00;
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const membership = await prisma.membership.create({
      data: {
        userId,
        type,
        monthlyFee,
        startDate: now,
        becameSocioAt: type === 'SOCIO' ? now : null,
        nextPaymentDue: nextMonth
      }
    });

    res.status(201).json({
      success: true,
      message: 'Membresía creada correctamente',
      data: { membership }
    });
  } catch (error) {
    console.error('Error creating membership:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear membresía'
    });
  }
};

/**
 * PUT /api/membership/:userId/upgrade-to-socio
 * Promocionar un COLABORADOR a SOCIO
 */
export const upgradeToSocio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const membership = await prisma.membership.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'El usuario no tiene membresía'
      });
      return;
    }

    if (membership.type === 'SOCIO') {
      res.status(400).json({
        success: false,
        message: 'El usuario ya es SOCIO'
      });
      return;
    }

    // Verificar que lleva al menos 1 año
    const now = new Date();
    const start = new Date(membership.startDate);
    const monthsAsMember = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsAsMember < 12) {
      res.status(400).json({
        success: false,
        message: `El usuario debe llevar al menos 12 meses como COLABORADOR. Actualmente lleva ${monthsAsMember} meses.`
      });
      return;
    }

    const updatedMembership = await prisma.membership.update({
      where: { userId },
      data: {
        type: 'SOCIO',
        monthlyFee: 19.00,
        becameSocioAt: now
      }
    });

    res.status(200).json({
      success: true,
      message: 'Usuario promocionado a SOCIO correctamente',
      data: { membership: updatedMembership }
    });
  } catch (error) {
    console.error('Error upgrading to socio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al promocionar a SOCIO'
    });
  }
};

/**
 * POST /api/membership/payment
 * Registrar un pago
 */
export const registerPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { userId, month, year, amount, paymentMethod, reference, notes } = req.body;

    if (!userId || !month || !year || !amount) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: userId, month, year, amount'
      });
      return;
    }

    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        message: 'El mes debe estar entre 1 y 12'
      });
      return;
    }

    // Verificar que el usuario existe y tiene membresía
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true }
    });

    if (!user || !user.membership) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin membresía activa'
      });
      return;
    }

    // Verificar si ya existe un pago para ese mes/año
    const existingPayment = await prisma.payment.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    });

    if (existingPayment) {
      res.status(400).json({
        success: false,
        message: `Ya existe un pago registrado para ${month}/${year}`
      });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        month: parseInt(month),
        year: parseInt(year),
        amount: parseFloat(amount),
        paymentMethod,
        reference,
        notes,
        registeredBy: adminId!
      }
    });

    // Actualizar fecha del último pago en membership
    await prisma.membership.update({
      where: { userId },
      data: {
        lastPaymentDate: new Date(),
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pago registrado correctamente',
      data: { payment }
    });
  } catch (error) {
    console.error('Error registering payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar pago'
    });
  }
};

/**
 * GET /api/membership/payment-status
 * Ver estado de pagos de todos los usuarios
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const users = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        membership: {
          isNot: null
        }
      },
      include: {
        membership: true,
        payments: {
          where: {
            month: currentMonth,
            year: currentYear
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const paymentStatus = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      membershipType: user.membership?.type,
      monthlyFee: user.membership?.monthlyFee,
      hasPaid: user.payments.length > 0,
      paymentDate: user.payments[0]?.paidAt || null
    }));

    const summary = {
      total: users.length,
      paid: paymentStatus.filter(u => u.hasPaid).length,
      pending: paymentStatus.filter(u => !u.hasPaid).length
    };

    res.status(200).json({
      success: true,
      data: {
        currentMonth,
        currentYear,
        summary,
        users: paymentStatus
      }
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de pagos'
    });
  }
};

/**
 * POST /api/membership/payment/toggle
 * Marcar o desmarcar un pago (toggle)
 */
export const togglePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { userId, month, year } = req.body;

    if (!userId || !month || !year) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: userId, month, year'
      });
      return;
    }

    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        message: 'El mes debe estar entre 1 y 12'
      });
      return;
    }

    // Verificar que el usuario existe y tiene membresía
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true }
    });

    if (!user || !user.membership) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin membresía activa'
      });
      return;
    }

    // Verificar si ya existe un pago para ese mes/año
    const existingPayment = await prisma.payment.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    });

    if (existingPayment) {
      // Eliminar el pago (desmarcar)
      await prisma.payment.delete({
        where: {
          userId_month_year: {
            userId,
            month: parseInt(month),
            year: parseInt(year)
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Pago desmarcado correctamente',
        data: { paid: false }
      });
    } else {
      // Crear el pago (marcar)
      const payment = await prisma.payment.create({
        data: {
          userId,
          month: parseInt(month),
          year: parseInt(year),
          amount: user.membership.monthlyFee,
          paymentMethod: 'efectivo',
          registeredBy: adminId!
        }
      });

      // Actualizar fecha del último pago en membership
      await prisma.membership.update({
        where: { userId },
        data: {
          lastPaymentDate: new Date(),
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Pago marcado correctamente',
        data: { paid: true, payment }
      });
    }
  } catch (error) {
    console.error('Error toggling payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar/desmarcar pago'
    });
  }
};

/**
 * POST /api/membership/payment/year
 * Marcar todos los meses del año para un usuario
 */
export const markFullYear = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { userId, year } = req.body;

    if (!userId || !year) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: userId, year'
      });
      return;
    }

    // Verificar que el usuario existe y tiene membresía
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true }
    });

    if (!user || !user.membership) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin membresía activa'
      });
      return;
    }

    // Obtener pagos existentes para este año
    const existingPayments = await prisma.payment.findMany({
      where: {
        userId,
        year: parseInt(year)
      }
    });

    const existingMonths = new Set(existingPayments.map(p => p.month));
    const monthsToCreate = [];

    // Crear pagos para los meses que faltan
    for (let month = 1; month <= 12; month++) {
      if (!existingMonths.has(month)) {
        monthsToCreate.push({
          userId,
          month,
          year: parseInt(year),
          amount: user.membership.monthlyFee,
          paymentMethod: 'efectivo',
          registeredBy: adminId!
        });
      }
    }

    if (monthsToCreate.length > 0) {
      await prisma.payment.createMany({
        data: monthsToCreate
      });

      // Actualizar fecha del último pago en membership
      await prisma.membership.update({
        where: { userId },
        data: {
          lastPaymentDate: new Date(),
          isActive: true
        }
      });
    }

    res.status(201).json({
      success: true,
      message: `Año completo marcado. Se crearon ${monthsToCreate.length} pagos.`,
      data: {
        createdPayments: monthsToCreate.length,
        totalPayments: 12
      }
    });
  } catch (error) {
    console.error('Error marking full year:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar año completo'
    });
  }
};
