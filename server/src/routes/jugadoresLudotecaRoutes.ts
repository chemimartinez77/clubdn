import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPlayers, searchGames, getPlayerGames, compareCollections } from '../controllers/jugadoresLudotecaController';

const router = Router();

router.get('/', authenticate, getPlayers);
router.get('/search', authenticate, searchGames);
router.post('/compare', authenticate, compareCollections);
router.get('/:userId/games', authenticate, getPlayerGames);

export default router;
