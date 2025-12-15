// server/src/routes/membershipRoutes.ts
import { Router } from 'express';
import {
  getUsersWithMembership,
  createMembership,
  upgradeToSocio,
  registerPayment,
  getPaymentStatus,
  togglePayment,
  markFullYear
} from '../controllers/membershipController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.get('/users', authenticate, requireAdmin, getUsersWithMembership);
router.get('/payment-status', authenticate, requireAdmin, getPaymentStatus);
router.post('/:userId/create', authenticate, requireAdmin, createMembership);
router.put('/:userId/upgrade-to-socio', authenticate, requireAdmin, upgradeToSocio);
router.post('/payment', authenticate, requireAdmin, registerPayment);
router.post('/payment/toggle', authenticate, requireAdmin, togglePayment);
router.post('/payment/year', authenticate, requireAdmin, markFullYear);

export default router;
