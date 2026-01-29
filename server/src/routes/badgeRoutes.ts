// server/src/routes/badgeRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserBadges,
  getUserBadgesById,
  trackGamePlayed,
  getGamePlayHistory,
  getGameStats
} from '../controllers/badgeController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/badges/my-badges
 * Obtener badges del usuario autenticado con progreso
 */
router.get('/my-badges', getUserBadges);

/**
 * GET /api/badges/user/:userId
 * Obtener badges de un usuario específico (público)
 */
router.get('/user/:userId', getUserBadgesById);

/**
 * POST /api/badges/track-game
 * Registrar un juego jugado (admin o usuario después de evento)
 */
router.post('/track-game', trackGamePlayed);

/**
 * GET /api/badges/game-history
 * Obtener historial de juegos jugados
 */
router.get('/game-history', getGamePlayHistory);

/**
 * GET /api/badges/stats
 * Obtener estadísticas de juegos por categoría
 */
router.get('/stats', getGameStats);

export default router;
