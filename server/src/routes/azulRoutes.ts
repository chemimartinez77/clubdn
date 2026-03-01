// server/src/routes/azulRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createGame,
  joinGame,
  getGame,
  listGames,
  makeMove,
} from '../controllers/azulController';

const router = Router();

router.use(authenticate);

// GET  /api/azul/games          - Listar mis partidas
router.get('/games', listGames);

// POST /api/azul/games          - Crear nueva partida
router.post('/games', createGame);

// GET  /api/azul/games/:id      - Estado de una partida
router.get('/games/:id', getGame);

// POST /api/azul/games/:id/join - Unirse como player2
router.post('/games/:id/join', joinGame);

// PATCH /api/azul/games/:id/move - Enviar un movimiento
router.patch('/games/:id/move', makeMove);

export default router;
