// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getPendingApprovals,
  approveUser,
  rejectUser,
} from '../controllers/adminController';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/pending-approvals
 * Listar solicitudes pendientes de aprobación
 */
router.get('/pending-approvals', getPendingApprovals);

/**
 * POST /api/admin/approve/:userId
 * Aprobar un usuario
 */
router.post('/approve/:userId', approveUser);

/**
 * POST /api/admin/reject/:userId
 * Rechazar un usuario
 */
router.post('/reject/:userId', rejectUser);

export default router;
