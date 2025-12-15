// server/src/routes/profileRoutes.ts
import { Router } from 'express';
import { getMyProfile, getUserProfile, updateMyProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas de perfil (requieren autenticación)
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);
router.get('/:userId', authenticate, getUserProfile);

export default router;
