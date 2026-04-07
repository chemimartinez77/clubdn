// server/src/routes/previewRoutes.ts
import { Router } from 'express';
import { previewEvent, proxyImage } from '../controllers/previewController';

const router = Router();

router.get('/events/:id', previewEvent);
router.get('/image/:id', proxyImage);

export default router;
