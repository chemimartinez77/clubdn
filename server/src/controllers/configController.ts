// server/src/controllers/configController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Obtener la configuración del club
 */
export const getClubConfig = async (_req: Request, res: Response) => {
  try {
    let config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' }
    });

    // Si no existe configuración, crear una por defecto
    if (!config) {
      config = await prisma.clubConfig.create({
        data: {
          id: 'club_config',
          clubName: 'Club DN',
          membershipTypes: [
            {
              type: 'SOCIO',
              displayName: 'Socio',
              price: 19,
              hasKey: true,
              description: 'Socio con llave. Requiere 1 año como colaborador + aprobación'
            },
            {
              type: 'COLABORADOR',
              displayName: 'Colaborador',
              price: 15,
              hasKey: false,
              description: 'Colaborador sin llave'
            },
            {
              type: 'FAMILIAR',
              displayName: 'Familiar',
              price: 10,
              hasKey: false,
              description: 'Familiar vinculado a un socio'
            },
            {
              type: 'EN_PRUEBAS',
              displayName: 'En Pruebas',
              price: 0,
              hasKey: false,
              description: 'Periodo de prueba gratuito'
            },
            {
              type: 'BAJA',
              displayName: 'Baja',
              price: 0,
              hasKey: false,
              description: 'Usuario dado de baja'
            }
          ],
          defaultCurrency: 'EUR',
          inviteMaxActive: 5,
          inviteMaxMonthly: 10,
          inviteMaxGuestYear: 5,
          inviteAllowSelfValidation: false
        }
      });
    }

    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[CONFIG] Error al obtener configuración:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la configuración del club'
    });
  }
};

/**
 * Actualizar la configuración del club (solo admins)
 */
export const updateClubConfig = async (req: Request, res: Response) => {
  try {
    const {
      clubName,
      clubEmail,
      clubPhone,
      clubAddress,
      membershipTypes,
      defaultCurrency,
      inviteMaxActive,
      inviteMaxMonthly,
      inviteMaxGuestYear,
      inviteAllowSelfValidation
    } = req.body;

    const config = await prisma.clubConfig.upsert({
      where: { id: 'club_config' },
      update: {
        ...(clubName && { clubName }),
        ...(clubEmail !== undefined && { clubEmail }),
        ...(clubPhone !== undefined && { clubPhone }),
        ...(clubAddress !== undefined && { clubAddress }),
        ...(membershipTypes && { membershipTypes }),
        ...(defaultCurrency && { defaultCurrency }),
        ...(inviteMaxActive !== undefined && { inviteMaxActive }),
        ...(inviteMaxMonthly !== undefined && { inviteMaxMonthly }),
        ...(inviteMaxGuestYear !== undefined && { inviteMaxGuestYear }),
        ...(inviteAllowSelfValidation !== undefined && { inviteAllowSelfValidation })
      },
      create: {
        id: 'club_config',
        clubName: clubName || 'Club DN',
        clubEmail,
        clubPhone,
        clubAddress,
        membershipTypes: membershipTypes || [],
        defaultCurrency: defaultCurrency || 'EUR',
        inviteMaxActive: inviteMaxActive ?? 5,
        inviteMaxMonthly: inviteMaxMonthly ?? 10,
        inviteMaxGuestYear: inviteMaxGuestYear ?? 5,
        inviteAllowSelfValidation: inviteAllowSelfValidation ?? false
      }
    });

    return res.json({
      success: true,
      data: config,
      message: 'Configuración actualizada correctamente'
    });
  } catch (error) {
    console.error('[CONFIG] Error al actualizar configuración:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la configuración del club'
    });
  }
};

/**
 * Obtener solo los tipos de membresía
 */
export const getMembershipTypes = async (_req: Request, res: Response) => {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' },
      select: { membershipTypes: true }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    return res.json({
      success: true,
      data: config.membershipTypes
    });
  } catch (error) {
    console.error('[CONFIG] Error al obtener tipos de membresía:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los tipos de membresía'
    });
  }
};
