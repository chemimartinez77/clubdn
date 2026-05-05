// server/src/routes/configRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getClubConfig,
  getPublicConfig,
  getOnboardingConfig,
  updateClubConfig,
  getMembershipTypes
} from '../controllers/configController';

const router = Router();

// Rutas completamente públicas (sin autenticación)
router.get('/public', getPublicConfig);

// Rutas públicas (autenticadas)
router.get('/membership-types', authenticate, getMembershipTypes);
router.get('/onboarding-options', authenticate, getOnboardingConfig);

// Rutas de administración
router.get('/', authenticate, requireAdmin, getClubConfig);
router.put('/', authenticate, requireAdmin, updateClubConfig);

export default router;
