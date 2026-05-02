// server/src/routes/ludotecaRoutes.ts
import { Router } from 'express';
import {
  getLibraryItems,
  getLibraryItem,
  getLibraryItemDetail,
  getLibraryStats,
  getLibraryFilters
} from '../controllers/ludotecaController';
import {
  approveDonationRequest,
  createAdminLibraryItem,
  createDonationRequest,
  getAdminLibraryItems,
  getDonationRequestsAdmin,
  markLibraryItemAsBaja,
  reactivateLibraryItem,
  searchLibraryMembers,
  rejectDonationRequest,
} from '../controllers/libraryInventoryController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Todas las rutas de ludoteca requieren autenticación
router.get('/', authenticate, getLibraryItems);
router.get('/stats', authenticate, getLibraryStats);
router.get('/filters', authenticate, getLibraryFilters);
router.get('/admin/items', authenticate, requireAdmin, getAdminLibraryItems);
router.post('/admin/items', authenticate, requireAdmin, createAdminLibraryItem);
router.patch('/admin/items/:id/baja', authenticate, requireAdmin, markLibraryItemAsBaja);
router.patch('/admin/items/:id/reactivate', authenticate, requireAdmin, reactivateLibraryItem);
router.get('/admin/members/search', authenticate, requireAdmin, searchLibraryMembers);
router.get('/admin/donations', authenticate, requireAdmin, getDonationRequestsAdmin);
router.patch('/admin/donations/:id/approve', authenticate, requireAdmin, approveDonationRequest);
router.patch('/admin/donations/:id/reject', authenticate, requireAdmin, rejectDonationRequest);
router.post('/donations', authenticate, createDonationRequest);
router.get('/:id/detail', authenticate, getLibraryItemDetail);
router.get('/:id', authenticate, getLibraryItem);

export default router;
