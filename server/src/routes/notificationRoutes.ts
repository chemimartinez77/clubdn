// server/src/routes/notificationRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener notificaciones del usuario
router.get('/', getNotifications);

// Obtener conteo de no leídas
router.get('/unread-count', getUnreadCount);

// Marcar todas como leídas
router.patch('/mark-all-read', markAllAsRead);

// Marcar una como leída
router.patch('/:id/read', markAsRead);

// Eliminar una notificación
router.delete('/:id', deleteNotification);

export default router;
