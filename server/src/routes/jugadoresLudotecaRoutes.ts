import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPlayers, searchGames, getPlayerGames } from '../controllers/jugadoresLudotecaController';

const router = Router();

router.get('/', authenticate, getPlayers);
router.get('/search', authenticate, searchGames);
router.get('/:userId/games', authenticate, getPlayerGames);

export default router;
