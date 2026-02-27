// server/src/controllers/profileController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tipos de imagen permitidos para avatar
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

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
          emailUpdates: true,
          notifyNewEvents: true,
          notifyEventChanges: true,
          notifyEventCancelled: true,
          notifyInvitations: true
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
      emailUpdates,
      notifyNewEvents,
      notifyEventChanges,
      notifyEventCancelled,
      notifyInvitations,
      allowEventInvitations,
      noughterColor
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
          emailUpdates: emailUpdates ?? true,
          notifyNewEvents: notifyNewEvents ?? true,
          notifyEventChanges: notifyEventChanges ?? true,
          notifyEventCancelled: notifyEventCancelled ?? true,
          notifyInvitations: notifyInvitations ?? true,
          allowEventInvitations: allowEventInvitations ?? true,
          noughterColor: noughterColor ?? null
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
          ...(emailUpdates !== undefined && { emailUpdates }),
          ...(notifyNewEvents !== undefined && { notifyNewEvents }),
          ...(notifyEventChanges !== undefined && { notifyEventChanges }),
          ...(notifyEventCancelled !== undefined && { notifyEventCancelled }),
          ...(notifyInvitations !== undefined && { notifyInvitations }),
          ...(allowEventInvitations !== undefined && { allowEventInvitations }),
          ...(noughterColor !== undefined && { noughterColor })
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

/**
 * Subir avatar del usuario autenticado
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const file = req.file;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

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

    // Buscar perfil existente para obtener avatar anterior (si existe)
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    // Eliminar avatar anterior de Cloudinary si existe
    if (existingProfile?.avatar) {
      try {
        // Extraer public_id del URL de Cloudinary
        const urlParts = existingProfile.avatar.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1] || '';
        const folderPath = urlParts.slice(-3, -1).join('/');
        const filename = filenameWithExt.split('.')[0] || '';
        if (filename) {
          const publicId = `${folderPath}/${filename}`;
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (deleteError) {
        console.error('Error al eliminar avatar anterior:', deleteError);
        // Continuar aunque falle la eliminación
      }
    }

    // Subir a Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `clubdn/avatars`,
          public_id: userId, // Usar el userId como nombre para sobrescribir
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

    // Actualizar o crear perfil con la nueva URL del avatar
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        avatar: uploadResult.secure_url,
        favoriteGames: [],
        notifications: true,
        emailUpdates: true
      },
      update: {
        avatar: uploadResult.secure_url
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

    res.status(200).json({
      success: true,
      data: { profile, avatarUrl: uploadResult.secure_url },
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

const TOUR_FIELD_MAP: Record<string, 'tourDismissed' | 'calendarTourDismissed' | 'feedbackTourDismissed' | 'createPartidaTourDismissed'> = {
  home: 'tourDismissed',
  calendar: 'calendarTourDismissed',
  feedback: 'feedbackTourDismissed',
  createPartida: 'createPartidaTourDismissed'
};

/**
 * Guardar preferencia del tour (dismiss permanente)
 * Body: { tour: 'home' | 'calendar' | 'feedback' }
 */
export const dismissTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const tourKey = req.body?.tour || 'home';
    const field = TOUR_FIELD_MAP[tourKey];
    if (!field) {
      res.status(400).json({ success: false, message: 'Tour no válido' });
      return;
    }

    await prisma.userProfile.upsert({
      where: { userId },
      update: { [field]: true },
      create: {
        userId,
        [field]: true,
        favoriteGames: [],
        emailUpdates: true
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al guardar preferencia del tour:', error);
    res.status(500).json({ success: false, message: 'Error al guardar preferencia' });
  }
};
