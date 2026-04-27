// server/src/routes/shareLinkRoutes.ts
import { Router } from 'express';
import { getShareLink, generateShareLink, requestViaShareLink } from '../controllers/shareLinkController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Autenticada — generar reserva y obtener URL de invitación
router.post('/generate', authenticate, generateShareLink);

// Pública — ver datos del evento via token de la Invitation RESERVED
router.get('/invite/:token', getShareLink);

// Pública — completar reserva como invitado via token de la Invitation RESERVED
router.post('/invite/:token/request', requestViaShareLink);

export default router;
