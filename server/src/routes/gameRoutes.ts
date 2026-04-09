// server/src/routes/gameRoutes.ts
import { Router } from 'express';
import { getOrCreateGame, refreshGame, listGames, getGameBasicInfo, getOrCreateRPGGame } from '../controllers/gameController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/games - Listar juegos con paginación y búsqueda
router.get('/', listGames);

// GET /api/games/:gameId/info - Info básica desde BD (sin llamar a BGG)
router.get('/:gameId/info', getGameBasicInfo);

// GET /api/games/rpgg/:gameId - Obtener o crear un juego de RPGGeek
router.get('/rpgg/:gameId', getOrCreateRPGGame);

// GET /api/games/:gameId - Obtener o crear un juego desde BGG
router.get('/:gameId', getOrCreateGame);

// POST /api/games/:gameId/refresh - Actualizar datos de BGG
router.post('/:gameId/refresh', refreshGame);

export default router;
