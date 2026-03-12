// server/src/routes/shareLinkRoutes.ts
import { Router } from 'express';
import { getShareLink, generateShareLink, requestViaShareLink } from '../controllers/shareLinkController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Autenticada — generar/recuperar token para compartir (ANTES de /:token)
router.post('/generate', authenticate, generateShareLink);

// Pública — ver datos del evento via share token
router.get('/:token', getShareLink);

// Pública — solicitar plaza como invitado via share token
router.post('/:token/request', requestViaShareLink);

export default router;
