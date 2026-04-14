// server/src/routes/myLudotecaRoutes.ts
import { Router } from 'express';
import {
  getMyGames,
  addGame,
  updateGame,
  removeGame,
  updateBggUsername,
  getBggSyncCheck,
  confirmBggSync,
  getLocations,
  createLocation,
  deleteLocation,
} from '../controllers/myLudotecaController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.patch('/bgg-username', authenticate, updateBggUsername);
router.get('/bgg-sync-check', authenticate, getBggSyncCheck);
router.post('/bgg-sync-confirm', authenticate, confirmBggSync);
router.get('/locations', authenticate, getLocations);
router.post('/locations', authenticate, createLocation);
router.delete('/locations/:locationId', authenticate, deleteLocation);
router.get('/', authenticate, getMyGames);
router.post('/', authenticate, addGame);
router.patch('/:bggId', authenticate, updateGame);
router.delete('/:bggId', authenticate, removeGame);

export default router;
