// server/src/controllers/announcementController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { notifyNewAnnouncement } from '../services/notificationService';

export const listAnnouncements = async (_req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, name: true } }
      }
    });
    res.json({ success: true, data: announcements });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener anuncios' });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, pinned } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ success: false, message: 'El contenido es obligatorio' });
      return;
    }
    const announcement = await prisma.announcement.create({
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        pinned: pinned ?? false,
        authorId: req.user!.userId
      },
      include: { author: { select: { id: true, name: true } } }
    });
    notifyNewAnnouncement(announcement.id, announcement.title, announcement.content);
    res.status(201).json({ success: true, data: announcement });
  } catch {
    res.status(500).json({ success: false, message: 'Error al crear anuncio' });
  }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, pinned } = req.body;
    if (content !== undefined && !content?.trim()) {
      res.status(400).json({ success: false, message: 'El contenido no puede estar vacío' });
      return;
    }
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title?.trim() || null }),
        ...(content !== undefined && { content: content.trim() }),
        ...(pinned !== undefined && { pinned })
      },
      include: { author: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data: announcement });
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar anuncio' });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar anuncio' });
  }
};

export const notifyAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
      return;
    }
    await notifyNewAnnouncement(announcement.id, announcement.title, announcement.content);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Error al enviar notificación' });
  }
};
