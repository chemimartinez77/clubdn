// server/src/routes/configRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getClubConfig,
  updateClubConfig,
  getMembershipTypes
} from '../controllers/configController';

const router = Router();

// Rutas públicas (autenticadas)
router.get('/membership-types', authenticate, getMembershipTypes);

// Rutas de administración
router.get('/', authenticate, requireAdmin, getClubConfig);
router.put('/', authenticate, requireAdmin, updateClubConfig);

export default router;
