// server/src/controllers/reportController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../config/database';
import { ReportPriority, ReportStatus, ReportType, ReportSeverity } from '@prisma/client';

// Configurar Cloudinary (reutiliza el mismo esquema usado en otros controladores)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ALLOWED_SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SCREENSHOT_SIZE = 8 * 1024 * 1024; // 8MB

const getOriginUrl = (req: Request, bodyOrigin?: string | null): string | null => {
  const headerOrigin = req.headers.referer || req.headers.origin;
  return (headerOrigin || bodyOrigin || null) as string | null;
};

export const createReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const { type, title, description, perceivedSeverity, originUrl } = req.body;
    const file = req.file;

    if (!type || !title || !description || !perceivedSeverity) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
      return;
    }

    if (!Object.values(ReportType).includes(type)) {
      res.status(400).json({ success: false, message: 'Tipo de reporte inválido' });
      return;
    }

    if (!Object.values(ReportSeverity).includes(perceivedSeverity)) {
      res.status(400).json({ success: false, message: 'Gravedad percibida inválida' });
      return;
    }

    let screenshotUrl: string | undefined;
    if (file) {
      if (!ALLOWED_SCREENSHOT_TYPES.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: 'Tipo de imagen no permitido'
        });
        return;
      }

      if (file.size > MAX_SCREENSHOT_SIZE) {
        res.status(400).json({
          success: false,
          message: 'La captura excede el tamaño máximo permitido (8MB)'
        });
        return;
      }

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'clubdn/reports',
            transformation: [{ quality: 'auto:good' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      screenshotUrl = uploadResult.secure_url;
    }

    const report = await prisma.report.create({
      data: {
        userId,
        type,
        title: title.trim(),
        description: description.trim(),
        perceivedSeverity,
        screenshotUrl,
        originUrl: getOriginUrl(req, originUrl)
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: report,
      message: 'Reporte creado correctamente'
    });
  } catch (error) {
    console.error('Error al crear reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear reporte'
    });
  }
};

export const listReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const { mine, status, sort } = req.query;

    const where: any = {};
    if (mine === 'true') where.userId = userId;
    if (status && typeof status === 'string') {
      if (!Object.values(ReportStatus).includes(status as ReportStatus)) {
        res.status(400).json({ success: false, message: 'Estado inválido' });
        return;
      }
      where.status = status;
    }

    const orderBy =
      sort === 'votes'
        ? [{ votesCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const reports = await prisma.report.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    const votes = await prisma.reportVote.findMany({
      where: { userId, reportId: { in: reports.map((r) => r.id) } },
      select: { reportId: true }
    });

    const votedSet = new Set(votes.map((v) => v.reportId));
    const data = reports.map((report) => ({
      ...report,
      hasVoted: votedSet.has(report.id)
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error al listar reportes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reportes' });
  }
};

export const toggleVote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingReport = await tx.report.findUnique({ where: { id } });
      if (!existingReport) {
        return null;
      }

      const existingVote = await tx.reportVote.findUnique({
        where: { reportId_userId: { reportId: id, userId } }
      });

      if (existingVote) {
        await tx.reportVote.delete({
          where: { id: existingVote.id }
        });
        const updated = await tx.report.update({
          where: { id },
          data: { votesCount: { decrement: 1 } }
        });
        return { report: updated, voted: false };
      }

      await tx.reportVote.create({
        data: { reportId: id, userId }
      });
      const updated = await tx.report.update({
        where: { id },
        data: { votesCount: { increment: 1 } }
      });
      return { report: updated, voted: true };
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Reporte no encontrado' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { votesCount: result.report.votesCount, voted: result.voted }
    });
  } catch (error) {
    console.error('Error al votar reporte:', error);
    res.status(500).json({ success: false, message: 'Error al votar reporte' });
  }
};

export const updateReportAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, internalPriority, devResponse } = req.body;

    const updateData: {
      status?: ReportStatus;
      internalPriority?: ReportPriority;
      devResponse?: string | null;
    } = {};

    if (status) {
      if (!Object.values(ReportStatus).includes(status)) {
        res.status(400).json({ success: false, message: 'Estado inválido' });
        return;
      }
      updateData.status = status;
    }

    if (internalPriority) {
      if (!Object.values(ReportPriority).includes(internalPriority)) {
        res.status(400).json({ success: false, message: 'Prioridad inválida' });
        return;
      }
      updateData.internalPriority = internalPriority;
    }

    if (devResponse !== undefined) {
      updateData.devResponse = devResponse ? String(devResponse).trim() : null;
    }

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte actualizado'
    });
  } catch (error) {
    console.error('Error al actualizar reporte:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar reporte' });
  }
};
