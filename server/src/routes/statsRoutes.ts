// server/src/routes/statsRoutes.ts
import { Router } from 'express';
import {
  getAdminStats,
  getUserStats,
  getClubStats,
  getUserEventsAttended,
  getUserGamesPlayed,
  getUserUpcomingEvents
} from '../controllers/statsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Estadísticas de admin (requiere permisos)
router.get('/admin', authenticate, requireAdmin, getAdminStats);

// Estadísticas del usuario autenticado
router.get('/user', authenticate, getUserStats);

// Estadísticas globales del club (públicas para usuarios autenticados)
router.get('/club', authenticate, getClubStats);

// Detalles de eventos del usuario
router.get('/user/events-attended', authenticate, getUserEventsAttended);
router.get('/user/games-played', authenticate, getUserGamesPlayed);
router.get('/user/upcoming-events', authenticate, getUserUpcomingEvents);

export default router;
