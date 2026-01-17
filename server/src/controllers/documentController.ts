// server/src/controllers/documentController.ts
import { Request, Response } from 'express';
import { PrismaClient, DocumentVisibility, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

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

// Verificar si el usuario puede acceder a un documento según su visibilidad
const canAccessDocument = (visibility: DocumentVisibility, userRole: UserRole): boolean => {
  switch (visibility) {
    case 'PUBLIC':
      return true;
    case 'ADMIN':
      return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    case 'SUPER_ADMIN':
      return userRole === 'SUPER_ADMIN';
    default:
      return false;
  }
};

// Verificar si el usuario es admin
const isAdmin = (role: UserRole): boolean => {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};

/**
 * Listar documentos (filtrados según rol del usuario)
 */
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { search, visibility } = req.query;

    // Construir filtro base según rol
    let visibilityFilter: DocumentVisibility[] = ['PUBLIC'];

    if (user.role === 'ADMIN') {
      visibilityFilter = ['PUBLIC', 'ADMIN'];
    } else if (user.role === 'SUPER_ADMIN') {
      visibilityFilter = ['PUBLIC', 'ADMIN', 'SUPER_ADMIN'];
    }

    // Si el admin filtra por visibilidad específica
    if (visibility && isAdmin(user.role) && visibilityFilter.includes(visibility as DocumentVisibility)) {
      visibilityFilter = [visibility as DocumentVisibility];
    }

    const where: any = {
      visibility: { in: visibilityFilter }
    };

    // Búsqueda por título
    if (search && typeof search === 'string') {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // Obtener documentos SIN el contenido binario (para rendimiento)
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        visibility: true,
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
 * Descargar un documento específico
 */
export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

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

    // Verificar permisos
    if (!canAccessDocument(document.visibility, user.role)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este documento'
      });
      return;
    }

    // Enviar archivo
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.filename)}"`);
    res.setHeader('Content-Length', document.size.toString());
    res.send(document.content);
  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar documento'
    });
  }
};

/**
 * Subir un nuevo documento (solo admin)
 */
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const file = req.file;
    const { title, visibility } = req.body;

    // Verificar que sea admin
    if (!isAdmin(user.role)) {
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

    // Crear documento en BD
    const document = await prisma.document.create({
      data: {
        title: title.trim(),
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        content: file.buffer,
        visibility: docVisibility,
        uploadedById: user.id
      },
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        visibility: true,
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
    const user = (req as any).user;
    const { id } = req.params;

    // Verificar que sea admin
    if (!isAdmin(user.role)) {
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

    // Eliminar
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
    const user = (req as any).user;

    if (!isAdmin(user.role)) {
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
