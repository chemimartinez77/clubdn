import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { FinancialAttachmentType, FinancialCategoryType } from '@prisma/client';
import { prisma } from '../config/database';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MOVEMENT_INCLUDE = {
  category: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  attachments: {
    orderBy: {
      createdAt: 'asc' as const
    }
  }
};

type UploadedAttachment = {
  url: string;
  fileType: FinancialAttachmentType;
  fileName: string;
  cloudinaryId: string;
};

const getCategoryColor = (type: FinancialCategoryType) =>
  type === 'INGRESO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

const getUploadedFiles = (req: Request): Express.Multer.File[] => {
  const files = req.files as Express.Multer.File[] | undefined;
  return Array.isArray(files) ? files : [];
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap(item => parseStringArray(item))
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [trimmed];
};

const validateAttachmentFiles = (files: Express.Multer.File[]) => {
  if (files.length > MAX_ATTACHMENTS) {
    return `Solo se permiten hasta ${MAX_ATTACHMENTS} adjuntos por movimiento`;
  }

  for (const file of files) {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';

    if (!isImage && !isPdf) {
      return 'Solo se permiten imágenes o archivos PDF';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Cada archivo debe pesar como máximo 20MB';
    }
  }

  return null;
};

const uploadAttachment = async (file: Express.Multer.File): Promise<UploadedAttachment> => {
  const isImage = file.mimetype.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';
  const uploadResult = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'clubdn/financial-movements',
        resource_type: resourceType,
        access_mode: 'public',
        ...(isImage ? { transformation: [{ quality: 'auto:good' }] } : {})
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer);
  });

  return {
    url: uploadResult.secure_url,
    fileType: isImage ? FinancialAttachmentType.IMAGE : FinancialAttachmentType.PDF,
    fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    cloudinaryId: uploadResult.public_id
  };
};

const deleteCloudinaryResource = async (
  cloudinaryId: string,
  fileType: FinancialAttachmentType
) => {
  try {
    await cloudinary.uploader.destroy(cloudinaryId, {
      resource_type: fileType === FinancialAttachmentType.PDF ? 'raw' : 'image'
    });
  } catch (error) {
    console.error('Error deleting financial attachment from Cloudinary:', error);
  }
};

const cleanupUploadedAttachments = async (attachments: UploadedAttachment[]) => {
  await Promise.all(
    attachments.map(attachment => deleteCloudinaryResource(attachment.cloudinaryId, attachment.fileType))
  );
};

const parseMovementPayload = (body: Request['body']) => {
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
  const amountRaw = typeof body.amount === 'string' || typeof body.amount === 'number' ? String(body.amount) : '';
  const dateRaw = typeof body.date === 'string' ? body.date : '';
  const descriptionRaw = typeof body.description === 'string' ? body.description.trim() : '';
  const amount = Number.parseFloat(amountRaw);
  const movementDate = new Date(dateRaw);

  return {
    categoryId,
    amount,
    description: descriptionRaw,
    movementDate,
    isValid: Boolean(
      categoryId &&
      amountRaw !== '' &&
      Number.isFinite(amount) &&
      !Number.isNaN(movementDate.getTime())
    )
  };
};

// ==================== CATEGORÍAS ====================

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.financialCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movements: true }
        }
      }
    });

    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching financial categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las categorías'
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const icon = typeof req.body.icon === 'string' ? req.body.icon.trim() : '';
    const type = req.body.type === 'INGRESO' ? FinancialCategoryType.INGRESO : FinancialCategoryType.GASTO;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio'
      });
    }

    const existing = await prisma.financialCategory.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    const category = await prisma.financialCategory.create({
      data: {
        name,
        type,
        icon: icon || '💰',
        color: getCategoryColor(type),
        showInBalance: true
      }
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating financial category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la categoría'
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
    const icon = typeof req.body.icon === 'string' ? req.body.icon.trim() : undefined;
    const type = req.body.type === 'INGRESO' || req.body.type === 'GASTO'
      ? req.body.type as FinancialCategoryType
      : undefined;
    const { showInBalance } = req.body;

    const category = await prisma.financialCategory.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    if (name && name !== category.name) {
      const existing = await prisma.financialCategory.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }
    }

    const nextType = type ?? category.type;

    const updatedCategory = await prisma.financialCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(type && { type, color: getCategoryColor(nextType) }),
        ...(showInBalance !== undefined && { showInBalance: Boolean(showInBalance) })
      }
    });

    return res.json({
      success: true,
      data: updatedCategory,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating financial category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la categoría'
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.financialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movements: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    if (category._count.movements > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una categoría con movimientos asociados'
      });
    }

    await prisma.financialCategory.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting financial category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la categoría'
    });
  }
};

// ==================== MOVIMIENTOS ====================

export const getMovements = async (req: Request, res: Response) => {
  try {
    const { year, month, categoryId } = req.query;

    const where: Record<string, unknown> = {};

    if (year) {
      where.year = parseInt(year as string, 10);
    }

    if (month) {
      where.month = parseInt(month as string, 10);
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const movements = await prisma.financialMovement.findMany({
      where,
      include: MOVEMENT_INCLUDE,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('Error fetching financial movements:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los movimientos'
    });
  }
};

export const createMovement = async (req: Request, res: Response) => {
  const uploadedAttachments: UploadedAttachment[] = [];

  try {
    const userId = req.user!.userId;
    const files = getUploadedFiles(req);
    const attachmentError = validateAttachmentFiles(files);

    if (attachmentError) {
      return res.status(400).json({
        success: false,
        message: attachmentError
      });
    }

    const payload = parseMovementPayload(req.body);

    if (!payload.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Categoría, monto y fecha son obligatorios'
      });
    }

    const category = await prisma.financialCategory.findUnique({
      where: { id: payload.categoryId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    for (const file of files) {
      uploadedAttachments.push(await uploadAttachment(file));
    }

    const year = payload.movementDate.getFullYear();
    const month = payload.movementDate.getMonth() + 1;

    const movement = await prisma.financialMovement.create({
      data: {
        categoryId: payload.categoryId,
        amount: Math.abs(payload.amount),
        description: payload.description || null,
        date: payload.movementDate,
        year,
        month,
        createdBy: userId,
        attachments: uploadedAttachments.length > 0 ? {
          create: uploadedAttachments.map(attachment => ({
            url: attachment.url,
            fileType: attachment.fileType,
            fileName: attachment.fileName,
            cloudinaryId: attachment.cloudinaryId
          }))
        } : undefined
      },
      include: MOVEMENT_INCLUDE
    });

    return res.status(201).json({
      success: true,
      data: movement,
      message: 'Movimiento creado exitosamente'
    });
  } catch (error) {
    await cleanupUploadedAttachments(uploadedAttachments);
    console.error('Error creating financial movement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el movimiento'
    });
  }
};

export const updateMovement = async (req: Request, res: Response) => {
  const uploadedAttachments: UploadedAttachment[] = [];

  try {
    const { id } = req.params;
    const files = getUploadedFiles(req);
    const attachmentError = validateAttachmentFiles(files);

    if (attachmentError) {
      return res.status(400).json({
        success: false,
        message: attachmentError
      });
    }

    const movement = await prisma.financialMovement.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    const nextCategoryId = typeof req.body.categoryId === 'string' && req.body.categoryId.trim()
      ? req.body.categoryId.trim()
      : movement.categoryId;

    if (nextCategoryId !== movement.categoryId) {
      const category = await prisma.financialCategory.findUnique({
        where: { id: nextCategoryId }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
    }

    const keepAttachmentIds = parseStringArray(req.body.keepAttachmentIds);
    const keepSet = new Set(keepAttachmentIds);
    const invalidKeepId = keepAttachmentIds.find(
      attachmentId => !movement.attachments.some(attachment => attachment.id === attachmentId)
    );

    if (invalidKeepId) {
      return res.status(400).json({
        success: false,
        message: 'Uno de los adjuntos a conservar no pertenece al movimiento'
      });
    }

    if (keepSet.size + files.length > MAX_ATTACHMENTS) {
      return res.status(400).json({
        success: false,
        message: `Solo se permiten hasta ${MAX_ATTACHMENTS} adjuntos por movimiento`
      });
    }

    for (const file of files) {
      uploadedAttachments.push(await uploadAttachment(file));
    }

    let year = movement.year;
    let month = movement.month;
    let movementDate = movement.date;

    if (typeof req.body.date === 'string' && req.body.date) {
      const parsedDate = new Date(req.body.date);

      if (Number.isNaN(parsedDate.getTime())) {
        await cleanupUploadedAttachments(uploadedAttachments);
        return res.status(400).json({
          success: false,
          message: 'La fecha del movimiento no es válida'
        });
      }

      movementDate = parsedDate;
      year = parsedDate.getFullYear();
      month = parsedDate.getMonth() + 1;
    }

    if (req.body.amount !== undefined && req.body.amount !== '') {
      const parsedAmount = Number.parseFloat(String(req.body.amount));

      if (!Number.isFinite(parsedAmount)) {
        await cleanupUploadedAttachments(uploadedAttachments);
        return res.status(400).json({
          success: false,
          message: 'La cantidad del movimiento no es válida'
        });
      }
    }

    const attachmentsToDelete = movement.attachments.filter(
      attachment => !keepSet.has(attachment.id)
    );

    const updatedMovement = await prisma.$transaction(async tx => {
      if (attachmentsToDelete.length > 0) {
        await tx.financialMovementAttachment.deleteMany({
          where: {
            id: {
              in: attachmentsToDelete.map(attachment => attachment.id)
            }
          }
        });
      }

      return tx.financialMovement.update({
        where: { id },
        data: {
          ...(req.body.categoryId && { categoryId: nextCategoryId }),
          ...(req.body.amount !== undefined && req.body.amount !== '' && {
            amount: Math.abs(Number.parseFloat(String(req.body.amount)))
          }),
          ...(req.body.description !== undefined && {
            description: typeof req.body.description === 'string' && req.body.description.trim()
              ? req.body.description.trim()
              : null
          }),
          ...(req.body.date && { date: movementDate, year, month }),
          ...(uploadedAttachments.length > 0 && {
            attachments: {
              create: uploadedAttachments.map(attachment => ({
                url: attachment.url,
                fileType: attachment.fileType,
                fileName: attachment.fileName,
                cloudinaryId: attachment.cloudinaryId
              }))
            }
          })
        },
        include: MOVEMENT_INCLUDE
      });
    });

    await Promise.all(
      attachmentsToDelete.map(attachment =>
        deleteCloudinaryResource(attachment.cloudinaryId, attachment.fileType)
      )
    );

    return res.json({
      success: true,
      data: updatedMovement,
      message: 'Movimiento actualizado exitosamente'
    });
  } catch (error) {
    await cleanupUploadedAttachments(uploadedAttachments);
    console.error('Error updating financial movement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el movimiento'
    });
  }
};

export const deleteMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const movement = await prisma.financialMovement.findUnique({
      where: { id },
      include: {
        attachments: true
      }
    });

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    await prisma.financialMovement.delete({
      where: { id }
    });

    await Promise.all(
      movement.attachments.map(attachment =>
        deleteCloudinaryResource(attachment.cloudinaryId, attachment.fileType)
      )
    );

    return res.json({
      success: true,
      message: 'Movimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting financial movement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el movimiento'
    });
  }
};

// ==================== ESTADÍSTICAS Y BALANCE ====================

export const getAnnualBalance = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'El año es obligatorio'
      });
    }

    const selectedYear = parseInt(year as string, 10);

    const categories = await prisma.financialCategory.findMany({
      where: { showInBalance: true },
      orderBy: { name: 'asc' }
    });

    const movements = await prisma.financialMovement.findMany({
      where: {
        year: selectedYear,
        category: {
          showInBalance: true
        }
      },
      include: {
        category: true
      }
    });

    const balanceByCategory = categories.map(category => {
      const categoryMovements = movements.filter(m => m.categoryId === category.id);
      const monthlyTotals = Array(12).fill(0);

      categoryMovements.forEach(movementItem => {
        const monthIndex = movementItem.month - 1;
        monthlyTotals[monthIndex] += movementItem.amount;
      });

      const totalYear = monthlyTotals.reduce((sum, amount) => sum + amount, 0);

      return {
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color
        },
        monthlyTotals,
        totalYear,
        transactionCount: categoryMovements.length
      };
    });

    const monthlyTotals = Array(12).fill(0);
    balanceByCategory.forEach(catBalance => {
      const sign = catBalance.category.type === 'INGRESO' ? 1 : -1;
      catBalance.monthlyTotals.forEach((amount, index) => {
        monthlyTotals[index] += sign * amount;
      });
    });

    const totalYear = monthlyTotals.reduce((sum, amount) => sum + amount, 0);

    return res.json({
      success: true,
      data: {
        year: selectedYear,
        categories: balanceByCategory,
        monthlyTotals,
        totalYear
      }
    });
  } catch (error) {
    console.error('Error fetching annual balance:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el balance anual'
    });
  }
};

export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'El año es obligatorio'
      });
    }

    const selectedYear = parseInt(year as string, 10);

    const totalMovements = await prisma.financialMovement.count({
      where: { year: selectedYear }
    });

    const allMovements = await prisma.financialMovement.findMany({
      where: { year: selectedYear },
      include: { category: { select: { type: true } } }
    });

    const totalIncomes = allMovements
      .filter(m => m.category.type === 'INGRESO')
      .reduce((sum, movement) => sum + movement.amount, 0);
    const totalExpenses = allMovements
      .filter(m => m.category.type === 'GASTO')
      .reduce((sum, movement) => sum + movement.amount, 0);
    const balance = totalIncomes - totalExpenses;

    return res.json({
      success: true,
      data: {
        year: selectedYear,
        totalMovements,
        totalIncomes,
        totalExpenses,
        balance
      }
    });
  } catch (error) {
    console.error('Error fetching financial statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas'
    });
  }
};
