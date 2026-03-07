// server/src/routes/pageViewRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { trackPageView, getAnalytics, getUserPageViews, archiveAndReset } from '../controllers/pageViewController';

const router = Router();

/**
 * POST /api/pageviews
 * Registrar una visita de página (cualquier usuario autenticado)
 */
router.post('/', authenticate, trackPageView);

/**
 * GET /api/pageviews/analytics
 * Obtener estadísticas de navegación (solo admin)
 */
router.get('/analytics', authenticate, requireAdmin, getAnalytics);

/**
 * GET /api/pageviews/users/:memberId
 * Obtener historial de páginas de un usuario concreto (solo admin)
 */
router.get('/users/:memberId', authenticate, requireAdmin, getUserPageViews);

/**
 * POST /api/pageviews/archive
 * Archivar datos actuales y resetear contadores (solo admin)
 */
router.post('/archive', authenticate, requireAdmin, archiveAndReset);

export default router;
