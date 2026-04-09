// server/src/routes/profileRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { getMyProfile, getUserProfile, updateMyProfile, uploadAvatar, dismissTour, completeOnboarding } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configurar multer para subida de avatar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Rutas de perfil (requieren autenticación)
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);
router.post('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.patch('/me/tour-dismiss', authenticate, dismissTour);
router.patch('/me/onboarding', authenticate, completeOnboarding);
router.get('/:userId', authenticate, getUserProfile);

export default router;
