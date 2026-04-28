import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import {
  createMatchController,
  getMatchController,
  joinMatchController,
  leaveMatchController,
  listAvailableGames,
  listMatches,
  moveMatchController,
  startMatchController,
  streamMatchController,
} from '../controllers/multiplayerController';

const router = Router();

router.get('/games', authenticate, listAvailableGames);
router.get('/matches', authenticate, listMatches);
router.post('/matches', authenticate, createMatchController);
router.get('/matches/:matchId', authenticate, getMatchController);
router.get('/matches/:matchId/stream', streamMatchController);
router.post('/matches/:matchId/join', authenticate, joinMatchController);
router.post('/matches/:matchId/leave', authenticate, leaveMatchController);
router.post('/matches/:matchId/start', authenticate, startMatchController);
router.post('/matches/:matchId/move', authenticate, moveMatchController);

export default router;
