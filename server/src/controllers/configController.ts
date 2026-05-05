// server/src/controllers/configController.ts
import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_CLUB_INTERESTS, normalizeClubInterestCatalog } from '../utils/clubInterests';

const prisma = new PrismaClient();
const DEFAULT_CLUB_INTERESTS_JSON = DEFAULT_CLUB_INTERESTS as unknown as Prisma.InputJsonValue;

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
          clubName: 'Club Dreadnought',
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
          clubInterestsCatalog: DEFAULT_CLUB_INTERESTS_JSON,
          defaultCurrency: 'EUR',
          inviteMaxActive: 5,
          inviteMaxMonthly: 10,
          inviteMaxGuestYear: 5,
          inviteAllowSelfValidation: false,
          personalStatsEnabled: true
        }
      });
    }

    // Normalizar membershipTypes a array por si el campo Json está corrompido
    const data = {
      ...config,
      membershipTypes: Array.isArray(config.membershipTypes) ? config.membershipTypes : [],
      clubInterestsCatalog: normalizeClubInterestCatalog(config.clubInterestsCatalog)
    };

    return res.json({
      success: true,
      data
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
 * Obtener configuración pública (sin autenticación)
 */
export const getPublicConfig = async (_req: Request, res: Response) => {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' },
      select: { loginParticleStyle: true, loanEnabled: true, personalStatsEnabled: true, spinEffect: true }
    });

    return res.json({
      success: true,
      data: {
        loginParticleStyle: config?.loginParticleStyle ?? 'white',
        loanEnabled: config?.loanEnabled ?? false,
        personalStatsEnabled: config?.personalStatsEnabled ?? true,
        spinEffect: config?.spinEffect ?? 'ruleta'
      }
    });
  } catch (error) {
    console.error('[CONFIG] Error al obtener configuración pública:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la configuración'
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
      clubInterestsCatalog,
      defaultCurrency,
      inviteMaxActive,
      inviteMaxMonthly,
      inviteMaxGuestYear,
      inviteAllowSelfValidation,
      loginParticleStyle,
      loanEnabled,
      loanDurationDays,
      loanQueueNotifyHours,
      loanMaxActivePerUser,
      personalStatsEnabled,
      spinEffect
    } = req.body;

    const normalizedClubInterestsCatalog = clubInterestsCatalog !== undefined
      ? normalizeClubInterestCatalog(clubInterestsCatalog)
      : undefined;

    const config = await prisma.clubConfig.upsert({
      where: { id: 'club_config' },
      update: {
        ...(clubName && { clubName }),
        ...(clubEmail !== undefined && { clubEmail }),
        ...(clubPhone !== undefined && { clubPhone }),
        ...(clubAddress !== undefined && { clubAddress }),
        ...(membershipTypes && { membershipTypes }),
        ...(normalizedClubInterestsCatalog !== undefined && {
          clubInterestsCatalog: normalizedClubInterestsCatalog as unknown as Prisma.InputJsonValue
        }),
        ...(defaultCurrency && { defaultCurrency }),
        ...(inviteMaxActive !== undefined && { inviteMaxActive }),
        ...(inviteMaxMonthly !== undefined && { inviteMaxMonthly }),
        ...(inviteMaxGuestYear !== undefined && { inviteMaxGuestYear }),
        ...(inviteAllowSelfValidation !== undefined && { inviteAllowSelfValidation }),
        ...(loginParticleStyle !== undefined && { loginParticleStyle }),
        ...(loanEnabled !== undefined && { loanEnabled }),
        ...(loanDurationDays !== undefined && { loanDurationDays }),
        ...(loanQueueNotifyHours !== undefined && { loanQueueNotifyHours }),
        ...(loanMaxActivePerUser !== undefined && { loanMaxActivePerUser }),
        ...(personalStatsEnabled !== undefined && { personalStatsEnabled }),
        ...(spinEffect !== undefined && { spinEffect })
      },
      create: {
        id: 'club_config',
        clubName: clubName || 'Club Dreadnought',
        clubEmail,
        clubPhone,
        clubAddress,
        membershipTypes: membershipTypes || [],
        clubInterestsCatalog: (normalizedClubInterestsCatalog ?? DEFAULT_CLUB_INTERESTS) as unknown as Prisma.InputJsonValue,
        defaultCurrency: defaultCurrency || 'EUR',
        inviteMaxActive: inviteMaxActive ?? 5,
        inviteMaxMonthly: inviteMaxMonthly ?? 10,
        inviteMaxGuestYear: inviteMaxGuestYear ?? 5,
        inviteAllowSelfValidation: inviteAllowSelfValidation ?? false,
        loginParticleStyle: loginParticleStyle ?? 'white',
        loanEnabled: loanEnabled ?? false,
        loanDurationDays: loanDurationDays ?? 14,
        loanQueueNotifyHours: loanQueueNotifyHours ?? 48,
        loanMaxActivePerUser: loanMaxActivePerUser ?? 0,
        personalStatsEnabled: personalStatsEnabled ?? true,
        spinEffect: spinEffect ?? 'ruleta'
      }
    });

    return res.json({
      success: true,
      data: {
        ...config,
        membershipTypes: Array.isArray(config.membershipTypes) ? config.membershipTypes : [],
        clubInterestsCatalog: normalizeClubInterestCatalog(config.clubInterestsCatalog)
      },
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

export const getOnboardingConfig = async (_req: Request, res: Response) => {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' },
      select: { clubInterestsCatalog: true }
    });

    return res.json({
      success: true,
      data: {
        clubInterestsCatalog: normalizeClubInterestCatalog(config?.clubInterestsCatalog)
      }
    });
  } catch (error) {
    console.error('[CONFIG] Error al obtener configuración de onboarding:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la configuración de onboarding'
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
