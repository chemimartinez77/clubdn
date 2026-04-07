// server/src/routes/ludotecaRoutes.ts
import { Router } from 'express';
import {
  getLibraryItems,
  getLibraryItem,
  getLibraryItemDetail,
  getLibraryStats,
  getLibraryFilters
} from '../controllers/ludotecaController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas de ludoteca requieren autenticación
router.get('/', authenticate, getLibraryItems);
router.get('/stats', authenticate, getLibraryStats);
router.get('/filters', authenticate, getLibraryFilters);
router.get('/:id/detail', authenticate, getLibraryItemDetail);
router.get('/:id', authenticate, getLibraryItem);

export default router;
