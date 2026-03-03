// server/src/routes/viernesRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createGame,
  getGame,
  listGames,
  makeMove,
  abandonGame,
} from '../controllers/viernesController';

const router = Router();

router.use(authenticate);

// GET  /api/viernes/games           - Listar mis partidas
router.get('/games', listGames);

// POST /api/viernes/games           - Crear nueva partida (body: { difficulty: 1|2|3|4 })
router.post('/games', createGame);

// GET  /api/viernes/games/:id       - Estado de una partida
router.get('/games/:id', getGame);

// PATCH /api/viernes/games/:id/move - Enviar una acción
router.patch('/games/:id/move', makeMove);

// DELETE /api/viernes/games/:id     - Abandonar una partida
router.delete('/games/:id', abandonGame);

export default router;
