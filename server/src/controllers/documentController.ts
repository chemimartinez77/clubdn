// server/src/controllers/documentController.ts
import { Request, Response } from 'express';
import { PrismaClient, DocumentVisibility, UserRole } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tipos de archivo permitidos
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Tamaño máximo: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Verificar si el usuario es admin
const isAdmin = (role: UserRole): boolean => {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};

/**
 * Listar documentos (filtrados según rol del usuario)
 */
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role as UserRole;
    const { search, visibility } = req.query;

    // Construir filtro base según rol
    let visibilityFilter: DocumentVisibility[] = ['PUBLIC'];

    if (userRole === 'ADMIN') {
      visibilityFilter = ['PUBLIC', 'ADMIN'];
    } else if (userRole === 'SUPER_ADMIN') {
      visibilityFilter = ['PUBLIC', 'ADMIN', 'SUPER_ADMIN'];
    }

    // Si el admin filtra por visibilidad específica
    if (visibility && isAdmin(userRole) && visibilityFilter.includes(visibility as DocumentVisibility)) {
      visibilityFilter = [visibility as DocumentVisibility];
    }

    const where: any = {
      visibility: { in: visibilityFilter }
    };

    // Búsqueda por título
    if (search && typeof search === 'string') {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // Obtener documentos con sus URLs de Cloudinary
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        visibility: true,
        url: true,
        cloudinaryId: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos'
    });
  }
};

/**
 * Subir un nuevo documento (solo admin)
 */
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role as UserRole;
    const file = req.file;
    const { title, visibility } = req.body;

    // Verificar que sea admin
    if (!isAdmin(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden subir documentos'
      });
      return;
    }

    // Verificar que se subió un archivo
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
      return;
    }

    // Verificar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Tipos permitidos: PDF, Word, Excel, JPG, PNG, GIF'
      });
      return;
    }

    // Verificar tamaño
    if (file.size > MAX_FILE_SIZE) {
      res.status(400).json({
        success: false,
        message: 'El archivo excede el tamaño máximo permitido (20MB)'
      });
      return;
    }

    // Verificar título
    if (!title || title.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'El título es obligatorio'
      });
      return;
    }

    // Validar visibilidad
    const validVisibilities: DocumentVisibility[] = ['PUBLIC', 'ADMIN', 'SUPER_ADMIN'];
    const docVisibility = (visibility as DocumentVisibility) || 'PUBLIC';

    if (!validVisibilities.includes(docVisibility)) {
      res.status(400).json({
        success: false,
        message: 'Visibilidad no válida'
      });
      return;
    }

    // Subir a Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'clubdn/documents',
          resource_type: 'auto', // Permite PDF, imágenes, etc.
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    // Crear documento en BD con URL de Cloudinary
    const document = await prisma.document.create({
      data: {
        title: title.trim(),
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        cloudinaryId: uploadResult.public_id,
        url: uploadResult.secure_url,
        visibility: docVisibility,
        uploadedById: userId!
      },
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        visibility: true,
        url: true,
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
      message: 'Documento subido correctamente',
      data: document
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir documento'
    });
  }
};

/**
 * Eliminar un documento (solo admin)
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role as UserRole;
    const { id } = req.params;

    // Verificar que sea admin
    if (!isAdmin(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden eliminar documentos'
      });
      return;
    }

    // Verificar que existe
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
      return;
    }

    // Eliminar de Cloudinary
    try {
      const resourceType = document.mimeType.startsWith('image/') ? 'image' : 'raw';
      await cloudinary.uploader.destroy(document.cloudinaryId, { resource_type: resourceType });
    } catch (cloudinaryError) {
      console.error('Error al eliminar de Cloudinary:', cloudinaryError);
      // Continuar aunque falle Cloudinary (el documento en BD se borrará igual)
    }

    // Eliminar de BD
    await prisma.document.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Documento eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento'
    });
  }
};

/**
 * Obtener estadísticas de documentos (solo admin)
 */
export const getDocumentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role as UserRole;

    if (!isAdmin(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver estadísticas'
      });
      return;
    }

    const [total, publicCount, adminCount, superAdminCount, totalSize] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { visibility: 'PUBLIC' } }),
      prisma.document.count({ where: { visibility: 'ADMIN' } }),
      prisma.document.count({ where: { visibility: 'SUPER_ADMIN' } }),
      prisma.document.aggregate({ _sum: { size: true } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        byVisibility: {
          public: publicCount,
          admin: adminCount,
          superAdmin: superAdminCount
        },
        totalSizeBytes: totalSize._sum.size || 0,
        totalSizeMB: ((totalSize._sum.size || 0) / (1024 * 1024)).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};
