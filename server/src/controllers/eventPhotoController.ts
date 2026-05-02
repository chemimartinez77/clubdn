// server/src/controllers/eventPhotoController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../config/database';
import { BadgeCategory, Prisma, RegistrationStatus } from '@prisma/client';
import { checkAndUnlockBadges } from './badgeController';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tipos de imagen permitidos
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Tamaño máximo: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Máximo de fotos por evento
const MAX_PHOTOS_PER_EVENT = 8;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

// Verificar si el usuario puede subir fotos (solo SOCIO o COLABORADOR registrados en el evento)
const canUploadPhoto = async (userId: string, eventId: string): Promise<boolean> => {
  // Verificar membresía activa
  const membership = await prisma.membership.findUnique({
    where: { userId }
  });

  if (!membership || membership.fechaBaja) {
    return false;
  }

  // Solo SOCIO y COLABORADOR pueden subir fotos
  if (membership.type !== 'SOCIO' && membership.type !== 'COLABORADOR') {
    return false;
  }

  // Verificar que está registrado en el evento
  const registration = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: { eventId, userId }
    }
  });

  return registration?.status === 'CONFIRMED';
};

/**
 * Obtener fotos de un evento
 */
export const getEventPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    // Verificar que el evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
      return;
    }

    const photos = await prisma.eventPhoto.findMany({
      where: { eventId },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        caption: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: photos
    });
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener fotos'
    });
  }
};

/**
 * Buscar juegos con fotos para el filtro de la fototeca
 */
export const searchPhotoLibraryGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const search = typeof q === 'string' ? q.trim() : '';

    if (search.length < 2) {
      res.status(400).json({
        success: false,
        message: 'Escribe al menos 2 caracteres para buscar'
      });
      return;
    }

    const normalizedSearch = search
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const photos = await prisma.eventPhoto.findMany({
      where: {
        event: {
          type: 'PARTIDA',
          status: { not: 'CANCELLED' },
          OR: [
            { gameName: { contains: search, mode: 'insensitive' } },
            {
              game: {
                is: {
                  name: { contains: search, mode: 'insensitive' }
                }
              }
            }
          ]
        }
      },
      select: {
        event: {
          select: {
            bggId: true,
            gameName: true,
            gameImage: true,
            game: {
              select: {
                id: true,
                name: true,
                image: true,
                thumbnail: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 150
    });

    const normalize = (value: string) =>
      value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const uniqueGames = new Map<string, {
      bggId: string;
      gameName: string;
      gameImage: string | null;
    }>();

    for (const photo of photos) {
      const bggId = photo.event.bggId?.trim();
      const resolvedGameName = photo.event.game?.name?.trim() || photo.event.gameName?.trim();

      if (!bggId || !resolvedGameName) continue;
      if (!normalize(resolvedGameName).includes(normalizedSearch)) continue;
      if (uniqueGames.has(bggId)) continue;

      uniqueGames.set(bggId, {
        bggId,
        gameName: resolvedGameName,
        gameImage: photo.event.game?.thumbnail || photo.event.game?.image || photo.event.gameImage || null
      });

      if (uniqueGames.size >= 10) break;
    }

    res.json({
      success: true,
      data: Array.from(uniqueGames.values())
    });
  } catch (error) {
    console.error('Error al buscar juegos para la fototeca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar juegos para la fototeca'
    });
  }
};

/**
 * Buscar participantes para el filtro de la fototeca
 */
export const searchPhotoLibraryParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const search = typeof q === 'string' ? q.trim() : '';

    if (search.length < 2) {
      res.status(400).json({
        success: false,
        message: 'Escribe al menos 2 caracteres para buscar'
      });
      return;
    }

    const matchingUsers = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          {
            profile: {
              is: {
                nick: { contains: search, mode: 'insensitive' }
              }
            }
          }
        ],
        eventRegistrations: {
          some: {
            status: RegistrationStatus.CONFIRMED,
            event: {
              type: 'PARTIDA',
              status: { not: 'CANCELLED' },
              photos: {
                some: {}
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        profile: {
          select: {
            nick: true,
            avatar: true
          }
        }
      },
      orderBy: { name: 'asc' },
      take: 10
    });

    res.json({
      success: true,
      data: matchingUsers.map((user) => ({
        id: user.id,
        name: user.name,
        nick: user.profile?.nick ?? null,
        avatar: user.profile?.avatar ?? null
      }))
    });
  } catch (error) {
    console.error('Error al buscar participantes para la fototeca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar participantes para la fototeca'
    });
  }
};

/**
 * Listado global de fotos para la fototeca
 */
export const getPhotoLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(Number(req.query.page) || DEFAULT_PAGE, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const bggId = typeof req.query.bggId === 'string' ? req.query.bggId.trim() : '';
    const participantUserId = typeof req.query.participantUserId === 'string' ? req.query.participantUserId.trim() : '';
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : '';
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo.trim() : '';

    const eventWhere: Prisma.EventWhereInput = {
      type: 'PARTIDA',
      status: { not: 'CANCELLED' }
    };

    if (search) {
      eventWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { gameName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (bggId) {
      eventWhere.bggId = bggId;
    }

    if (participantUserId) {
      eventWhere.registrations = {
        some: {
          userId: participantUserId,
          status: RegistrationStatus.CONFIRMED
        }
      };
    }

    const eventDateFilters: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      const parsedDateFrom = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(parsedDateFrom.getTime())) {
        eventDateFilters.gte = parsedDateFrom;
      }
    }
    if (dateTo) {
      const parsedDateTo = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(parsedDateTo.getTime())) {
        eventDateFilters.lte = parsedDateTo;
      }
    }
    if (Object.keys(eventDateFilters).length > 0) {
      eventWhere.date = eventDateFilters;
    }

    const photoWhere: Prisma.EventPhotoWhereInput = {
      event: eventWhere
    };

    if (search) {
      photoWhere.OR = [
        { caption: { contains: search, mode: 'insensitive' } },
        { event: eventWhere }
      ];
    }

    const [total, photos] = await Promise.all([
      prisma.eventPhoto.count({ where: photoWhere }),
      prisma.eventPhoto.findMany({
        where: photoWhere,
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          caption: true,
          createdAt: true,
          uploadedBy: {
            select: {
              id: true,
              name: true
            }
          },
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              gameName: true,
              gameImage: true,
              bggId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    res.json({
      success: true,
      data: {
        photos: photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          caption: photo.caption,
          createdAt: photo.createdAt,
          uploadedBy: photo.uploadedBy,
          event: {
            id: photo.event.id,
            title: photo.event.title,
            date: photo.event.date,
            gameName: photo.event.gameName,
            gameImage: photo.event.gameImage,
            bggId: photo.event.bggId
          }
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(Math.ceil(total / pageSize), 1)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener la fototeca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la fototeca'
    });
  }
};

/**
 * Subir foto a un evento
 */
export const uploadEventPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { eventId } = req.params;
    const { caption } = req.body;
    const file = req.file;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    // Verificar que el evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
      return;
    }

    if (!eventId) {
      res.status(400).json({
        success: false,
        message: 'ID de evento requerido'
      });
      return;
    }

    // Verificar permisos
    const canUpload = await canUploadPhoto(userId, eventId);
    if (!canUpload) {
      res.status(403).json({
        success: false,
        message: 'Solo los socios o colaboradores inscritos en el evento pueden subir fotos'
      });
      return;
    }

    // Verificar límite de fotos
    const photoCount = await prisma.eventPhoto.count({
      where: { eventId }
    });

    if (photoCount >= MAX_PHOTOS_PER_EVENT) {
      res.status(400).json({
        success: false,
        message: `El evento ya tiene el máximo de ${MAX_PHOTOS_PER_EVENT} fotos`
      });
      return;
    }

    // Verificar que se subió un archivo
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
      return;
    }

    // Verificar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WebP'
      });
      return;
    }

    // Verificar tamaño
    if (file.size > MAX_FILE_SIZE) {
      res.status(400).json({
        success: false,
        message: 'La imagen excede el tamaño máximo permitido (10MB)'
      });
      return;
    }

    // Subir a Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `clubdn/events/${eventId}`,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' }, // Limitar tamaño máximo
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

    // Generar URL de miniatura
    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:low' }
      ]
    });

    // Guardar en BD
    const photo = await prisma.eventPhoto.create({
      data: {
        eventId,
        cloudinaryId: uploadResult.public_id,
        url: uploadResult.secure_url,
        thumbnailUrl,
        uploadedById: userId,
        caption: caption?.trim() || null
      },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        caption: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Acreditar punto de FOTOGRAFO si es la primera foto del usuario en esta partida
    const photoCountForUser = await prisma.eventPhoto.count({
      where: { eventId, uploadedById: userId }
    });
    if (photoCountForUser === 1) {
      await checkAndUnlockBadges(userId, BadgeCategory.FOTOGRAFO);
    }

    res.status(201).json({
      success: true,
      message: 'Foto subida correctamente',
      data: photo
    });
  } catch (error) {
    console.error('Error al subir foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir foto'
    });
  }
};

/**
 * Eliminar foto de un evento (solo el que subió o admin)
 */
export const deleteEventPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { eventId, photoId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    // Buscar la foto
    const photo = await prisma.eventPhoto.findFirst({
      where: {
        id: photoId,
        eventId
      }
    });

    if (!photo) {
      res.status(404).json({
        success: false,
        message: 'Foto no encontrada'
      });
      return;
    }

    // Verificar permisos: solo quien subió la foto o admin
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || String(userRole) === 'CHEMI';
    if (photo.uploadedById !== userId && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta foto'
      });
      return;
    }

    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(photo.cloudinaryId);
    } catch (cloudinaryError) {
      console.error('Error al eliminar de Cloudinary:', cloudinaryError);
      // Continuar aunque falle Cloudinary
    }

    // Eliminar de BD
    await prisma.eventPhoto.delete({
      where: { id: photoId }
    });

    res.json({
      success: true,
      message: 'Foto eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar foto'
    });
  }
};
