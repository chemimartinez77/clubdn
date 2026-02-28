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
  removeParticipant,
  getEventAttendees,
  syncEventBggIds,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  searchMembersForEvent,
  addMemberToEvent,
  completeEvent
} from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Búsqueda de miembros para apuntar (ANTES de /:id para evitar colisión de parámetros)
router.get('/members/search', authenticate, searchMembersForEvent);

// Rutas públicas (requieren autenticación)
router.get('/', authenticate, getEvents);
router.get('/:id', authenticate, getEvent);
router.get('/:id/attendees', authenticate, getEventAttendees);

// Registro/cancelación (usuarios autenticados)
router.post('/:id/register', authenticate, registerToEvent);
router.delete('/:id/register', authenticate, unregisterFromEvent);
router.delete('/:id/registrations/:registrationId', authenticate, removeParticipant);

// Apuntar miembro (organizador o admin)
router.post('/:id/add-member', authenticate, addMemberToEvent);

// Aprobación de registros (organizador o admin)
router.get('/:id/pending-registrations', authenticate, getPendingRegistrations);
router.post('/:id/registrations/:registrationId/approve', authenticate, approveRegistration);
router.post('/:id/registrations/:registrationId/reject', authenticate, rejectRegistration);

// CRUD
router.post('/', authenticate, createEvent); // Usuarios pueden crear PARTIDA, admins todo
router.put('/:id', authenticate, updateEvent); // Validación de permisos en el controller
router.delete('/:id', authenticate, deleteEvent); // Admins o creador pueden cancelar partidas futuras

// Admin: Marcar evento como completado manualmente
router.post('/:id/complete', authenticate, requireAdmin, completeEvent);

// Admin: Sincronizar bggIds de eventos existentes con juegos en BD
router.post('/admin/sync-bgg-ids', authenticate, requireAdmin, syncEventBggIds);

export default router;
