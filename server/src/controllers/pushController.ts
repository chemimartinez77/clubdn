import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendPushToAll, sendPushToUser } from '../services/pushService';

export async function registerDevice(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { token, platform } = req.body as { token?: string; platform?: string };

  if (!token) {
    res.status(400).json({ success: false, message: 'Token requerido' });
    return;
  }

  await prisma.pushDevice.upsert({
    where: { token },
    update: { userId, platform: platform ?? 'android', updatedAt: new Date() },
    create: { userId, token, platform: platform ?? 'android' },
  });

  res.json({ success: true });
}

export async function unregisterDevice(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ success: false, message: 'Token requerido' });
    return;
  }

  await prisma.pushDevice.deleteMany({ where: { token } });
  res.json({ success: true });
}

export async function sendPushToUserById(req: Request, res: Response): Promise<void> {
  const { userId, title, body, data } = req.body as { userId?: string; title?: string; body?: string; data?: Record<string, string> };

  if (!userId || !title || !body) {
    res.status(400).json({ success: false, message: 'userId, title y body son requeridos' });
    return;
  }

  try {
    await sendPushToUser(userId, title, body, data);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ success: false, message });
  }
}

export async function sendPushNotification(req: Request, res: Response): Promise<void> {
  const { title, body, data } = req.body as { title?: string; body?: string; data?: Record<string, string> };

  if (!title || !body) {
    res.status(400).json({ success: false, message: 'title y body son requeridos' });
    return;
  }

  try {
    const result = await sendPushToAll(title, body, data);
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ success: false, message });
  }
}
