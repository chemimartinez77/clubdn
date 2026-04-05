// server/src/routes/previewRoutes.ts
import { Router } from 'express';
import { previewEvent } from '../controllers/previewController';

const router = Router();

router.get('/events/:id', previewEvent);

export default router;
