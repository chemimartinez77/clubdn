// server/src/routes/financial.ts
import express from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  // Categorías
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  // Movimientos
  getMovements,
  createMovement,
  updateMovement,
  deleteMovement,

  // Estadísticas
  getAnnualBalance,
  getStatistics
} from '../controllers/financialController';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

// Todas las rutas requieren autenticación y ser admin
router.use(authenticate);
router.use(requireAdmin);

// ==================== CATEGORÍAS ====================
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ==================== MOVIMIENTOS ====================
router.get('/movements', getMovements);
router.post('/movements', upload.array('attachments', 3), createMovement);
router.put('/movements/:id', upload.array('attachments', 3), updateMovement);
router.delete('/movements/:id', deleteMovement);

// ==================== ESTADÍSTICAS Y BALANCE ====================
router.get('/balance', getAnnualBalance);
router.get('/statistics', getStatistics);

export default router;
