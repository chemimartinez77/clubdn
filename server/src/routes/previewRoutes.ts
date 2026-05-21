// server/src/routes/previewRoutes.ts
import { Router } from 'express';
import { previewEvent, proxyImage, previewDual, proxyDualImage, previewBggGame, proxyBggGameImage } from '../controllers/previewController';

const router = Router();

router.get('/events/:id', previewEvent);
router.get('/image/:id', proxyImage);
router.get('/dual', previewDual);
router.get('/dual-image', proxyDualImage);
router.get('/events-bgg/:bggId', previewBggGame);
router.get('/bgg-image/:bggId', proxyBggGameImage);

export default router;
