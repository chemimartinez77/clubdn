import { Router } from 'express';
import { getUserCalendar, generateCalendarToken } from '../controllers/calendarController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Público: suscripción por URL (con o sin .ics)
router.get('/:token', getUserCalendar);
router.get('/:token.ics', getUserCalendar);

// Autenticado: generar/regenerar token
router.post('/token', authenticate, generateCalendarToken);

export default router;
