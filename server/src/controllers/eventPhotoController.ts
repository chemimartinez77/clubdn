// server/src/controllers/eventPhotoController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

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
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
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
