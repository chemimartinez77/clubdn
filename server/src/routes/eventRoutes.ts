// server/src/routes/eventRoutes.ts
import { Router } from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerToEvent,
  unregisterFromEvent,
  getEventAttendees
} from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Rutas públicas (requieren autenticación)
router.get('/', authenticate, getEvents);
router.get('/:id', authenticate, getEvent);
router.get('/:id/attendees', authenticate, getEventAttendees);

// Registro/cancelación (usuarios autenticados)
router.post('/:id/register', authenticate, registerToEvent);
router.delete('/:id/register', authenticate, unregisterFromEvent);

// CRUD
router.post('/', authenticate, createEvent); // Usuarios pueden crear PARTIDA, admins todo
router.put('/:id', authenticate, updateEvent); // Validación de permisos en el controller
router.delete('/:id', authenticate, requireAdmin, deleteEvent); // Solo admins pueden cancelar

export default router;
