// server/src/routes/previewRoutes.ts
import { Router } from 'express';
import { previewEvent, previewSurpriseBox, proxyImage, proxySurpriseBoxImage } from '../controllers/previewController';

const router = Router();

router.get('/events/:id', previewEvent);
router.get('/image/:id', proxyImage);
router.get('/surprise/:token', previewSurpriseBox);
router.get('/surprise-image/:token', proxySurpriseBoxImage);

export default router;
