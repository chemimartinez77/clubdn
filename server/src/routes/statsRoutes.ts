// server/src/routes/statsRoutes.ts
import { Router } from 'express';
import { getAdminStats } from '../controllers/statsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.get('/admin', authenticate, requireAdmin, getAdminStats);

export default router;
