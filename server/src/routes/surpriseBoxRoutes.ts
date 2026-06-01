import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  closeSurpriseBox,
  createSurpriseBox,
  getPublicSurpriseBox,
  listMySurpriseBoxes,
  voteSurpriseBox,
} from '../controllers/surpriseBoxController';

const router = Router();

router.get('/public/:token', getPublicSurpriseBox);
router.post('/public/:token/vote', authenticate, voteSurpriseBox);

router.get('/mine', authenticate, listMySurpriseBoxes);
router.post('/', authenticate, createSurpriseBox);
router.post('/:id/close', authenticate, closeSurpriseBox);

export default router;
