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

// IMPORTANTE: Las rutas específicas DEBEN ir antes que las rutas con parámetros dinámicos

// Obtener conteo de no leídas (ANTES de /:id)
router.get('/unread-count', getUnreadCount);

// Marcar todas como leídas (ANTES de /:id)
router.patch('/mark-all-read', markAllAsRead);

// Obtener notificaciones del usuario
router.get('/', getNotifications);

// Marcar una como leída
router.patch('/:id/read', markAsRead);

// Eliminar una notificación
router.delete('/:id', deleteNotification);

export default router;
