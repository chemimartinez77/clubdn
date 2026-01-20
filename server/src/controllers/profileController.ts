// server/src/controllers/profileController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * Obtener el perfil del usuario autenticado
 */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Buscar o crear perfil
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            lastLoginAt: true
          }
        }
      }
    });

    // Si no existe el perfil, crearlo con valores por defecto
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId,
          favoriteGames: [],
          notifications: true,
          emailUpdates: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              lastLoginAt: true
            }
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

/**
 * Obtener perfil de cualquier usuario (público)
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Perfil no encontrado'
      });
      return;
    }

    // Ocultar información sensible si no es el propio usuario
    const isOwnProfile = req.user?.userId === userId;
    const sanitizedProfile = {
      ...profile,
      phone: isOwnProfile ? profile.phone : null,
      firstName: isOwnProfile ? profile.firstName : null,
      lastName: isOwnProfile ? profile.lastName : null,
      dni: isOwnProfile ? profile.dni : null,
      dniNormalized: isOwnProfile ? profile.dniNormalized : null,
      imageConsentActivities: isOwnProfile ? profile.imageConsentActivities : undefined,
      imageConsentSocial: isOwnProfile ? profile.imageConsentSocial : undefined,
      notifications: isOwnProfile ? profile.notifications : undefined,
      emailUpdates: isOwnProfile ? profile.emailUpdates : undefined
    };

    res.status(200).json({
      success: true,
      data: { profile: sanitizedProfile }
    });
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

/**
 * Actualizar perfil del usuario autenticado
 */
export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const {
      avatar,
      phone,
      birthDate,
      bio,
      favoriteGames,
      playStyle,
      discord,
      telegram,
      notifications,
      emailUpdates
    } = req.body;

    // Buscar o crear perfil
    let profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      // Crear perfil si no existe
      profile = await prisma.userProfile.create({
        data: {
          userId,
          avatar,
          phone,
          birthDate: birthDate ? new Date(birthDate) : null,
          bio,
          favoriteGames: favoriteGames || [],
          playStyle,
          discord,
          telegram,
          notifications: notifications ?? true,
          emailUpdates: emailUpdates ?? true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              lastLoginAt: true
            }
          }
        }
      });
    } else {
      // Actualizar perfil existente
      profile = await prisma.userProfile.update({
        where: { userId },
        data: {
          ...(avatar !== undefined && { avatar }),
          ...(phone !== undefined && { phone }),
          ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
          ...(bio !== undefined && { bio }),
          ...(favoriteGames !== undefined && { favoriteGames }),
          ...(playStyle !== undefined && { playStyle }),
          ...(discord !== undefined && { discord }),
          ...(telegram !== undefined && { telegram }),
          ...(notifications !== undefined && { notifications }),
          ...(emailUpdates !== undefined && { emailUpdates })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              lastLoginAt: true
            }
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { profile },
      message: 'Perfil actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};
