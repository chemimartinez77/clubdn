import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { searchExperts } from '../controllers/quienSabeJugarController';

const router = Router();

router.get('/', authenticate, searchExperts);

export default router;
