// server/src/routes/previewRoutes.ts
import { Router } from 'express';
import { previewEvent, proxyImage, previewDual, proxyDualImage } from '../controllers/previewController';

const router = Router();

router.get('/events/:id', previewEvent);
router.get('/image/:id', proxyImage);
router.get('/dual', previewDual);
router.get('/dual-image', proxyDualImage);

export default router;
