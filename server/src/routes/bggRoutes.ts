// server/src/routes/bggRoutes.ts
import { Router } from 'express';
import { searchGames, getGame } from '../controllers/bggController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Búsqueda de juegos (requiere autenticación)
router.get('/search', authenticate, searchGames);
router.get('/game/:id', authenticate, getGame);

export default router;
