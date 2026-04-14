// server/src/controllers/profileController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { notifyAdminsOnboardingCompleted } from '../services/notificationService';
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

const shouldAutoCompleteOnboarding = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true }
  });

  return user?.status === 'APPROVED';
};

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
      const onboardingCompleted = await shouldAutoCompleteOnboarding(userId);

      profile = await prisma.userProfile.create({
        data: {
          userId,
          onboardingCompleted,
          favoriteGames: [],
          notifications: true,
          emailUpdates: false,
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

    // Incluir calendarToken del usuario (campo nuevo, puede no existir en el cliente Prisma aún)
    let calendarToken: string | null = null;
    try {
      const userRaw = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { calendarToken: true }
      });
      calendarToken = userRaw?.calendarToken ?? null;
    } catch {
      // Si el campo no existe aún en la BD (migración pendiente), devolvemos null
    }

    res.status(200).json({
      success: true,
      data: { profile: { ...profile, calendarToken } }
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

    const [profile, badges] = await Promise.all([
      prisma.userProfile.findUnique({
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
      }),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badgeDefinition: true },
        orderBy: { unlockedAt: 'desc' }
      })
    ]);

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
      iban: isOwnProfile ? profile.iban : null,
      imageConsentActivities: isOwnProfile ? profile.imageConsentActivities : undefined,
      imageConsentSocial: isOwnProfile ? profile.imageConsentSocial : undefined,
      notifications: isOwnProfile ? profile.notifications : undefined,
      emailUpdates: isOwnProfile ? profile.emailUpdates : undefined
    };

    res.status(200).json({
      success: true,
      data: { profile: sanitizedProfile, badges }
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
      nick,
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
      noughterColor,
      defaultScreen,
      eventsDefaultView,
      eventsAccordionMode,
      eventButtonStyle
    } = req.body;

    // Buscar o crear perfil
    let profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      // Crear perfil si no existe
      const onboardingCompleted = await shouldAutoCompleteOnboarding(userId);

      profile = await prisma.userProfile.create({
        data: {
          userId,
          avatar,
          nick: nick?.trim() || null,
          phone,
          birthDate: birthDate ? new Date(birthDate) : null,
          bio,
          favoriteGames: favoriteGames || [],
          playStyle,
          discord,
          telegram,
          notifications: notifications ?? true,
          emailUpdates: false,
          notifyNewEvents: notifyNewEvents ?? true,
          notifyEventChanges: notifyEventChanges ?? true,
          notifyEventCancelled: notifyEventCancelled ?? true,
          notifyInvitations: notifyInvitations ?? true,
          allowEventInvitations: allowEventInvitations ?? true,
          noughterColor: noughterColor ?? null,
          defaultScreen: defaultScreen ?? 'home',
          onboardingCompleted
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
          ...(nick !== undefined && { nick: nick?.trim() || null }),
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
          ...(noughterColor !== undefined && { noughterColor }),
          ...(defaultScreen !== undefined && { defaultScreen }),
          ...(eventsDefaultView !== undefined && { eventsDefaultView }),
          ...(eventsAccordionMode !== undefined && { eventsAccordionMode }),
          ...(eventButtonStyle !== undefined && { eventButtonStyle })
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
        emailUpdates: false
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
        emailUpdates: false
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al guardar preferencia del tour:', error);
    res.status(500).json({ success: false, message: 'Error al guardar preferencia' });
  }
};

/**
 * Completar onboarding — marca onboardingCompleted = true y notifica a admins
 */
export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const {
      firstName,
      lastName,
      dni,
      phone,
      address,
      city,
      province,
      postalCode,
      iban,
      imageConsentActivities,
      imageConsentSocial,
    } = req.body;

    // Validar campos obligatorios
    const missing = [];
    if (!firstName?.trim()) missing.push('firstName');
    if (!lastName?.trim()) missing.push('lastName');
    if (!dni?.trim()) missing.push('dni');
    if (!phone?.trim()) missing.push('phone');
    if (!address?.trim()) missing.push('address');
    if (!city?.trim()) missing.push('city');
    if (!province?.trim()) missing.push('province');
    if (!postalCode?.trim()) missing.push('postalCode');
    if (!iban?.trim()) missing.push('iban');

    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `Faltan campos obligatorios: ${missing.join(', ')}` });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    const dniNormalized = dni.trim().toUpperCase().replace(/\s/g, '');

    await prisma.userProfile.upsert({
      where: { userId },
      update: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim(),
        dniNormalized,
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
        iban: iban.trim(),
        imageConsentActivities: imageConsentActivities === true,
        imageConsentSocial: imageConsentSocial === true,
        onboardingCompleted: true,
      },
      create: {
        userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim(),
        dniNormalized,
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
        iban: iban.trim(),
        imageConsentActivities: imageConsentActivities === true,
        imageConsentSocial: imageConsentSocial === true,
        onboardingCompleted: true,
        favoriteGames: [],
        emailUpdates: false,
      }
    });

    // Notificar a admins
    try {
      await notifyAdminsOnboardingCompleted(user?.name ?? userId, user?.email ?? '');
    } catch (e) {
      console.error('Error notificando onboarding:', e);
    }

    res.status(200).json({ success: true, message: 'Onboarding completado' });
  } catch (error) {
    console.error('Error al completar onboarding:', error);
    res.status(500).json({ success: false, message: 'Error al guardar los datos' });
  }
};
