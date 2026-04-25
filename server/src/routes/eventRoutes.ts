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
  completeEvent,
  confirmEventPlayed,
  confirmEventNotPlayed,
  validateGameQr
} from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getPendingInvitations, approveInvitation, rejectInvitation } from '../controllers/invitationController';
import { getEventResults, upsertEventResults } from '../controllers/eventResultController';
import { spinFirstPlayer } from '../controllers/firstPlayerController';

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

// Aprobación de invitaciones pendientes (organizador o admin)
router.get('/:id/pending-invitations', authenticate, getPendingInvitations);
router.post('/:id/invitations/:invitationId/approve', authenticate, approveInvitation);
router.post('/:id/invitations/:invitationId/reject', authenticate, rejectInvitation);

// CRUD
router.post('/', authenticate, createEvent); // Usuarios pueden crear PARTIDA, admins todo
router.put('/:id', authenticate, updateEvent); // Validación de permisos en el controller
router.delete('/:id', authenticate, deleteEvent); // Admins o creador pueden cancelar partidas futuras

// Admin: Marcar evento como completado manualmente
router.post('/:id/complete', authenticate, requireAdmin, completeEvent);

// Organizador: confirmar si la partida se disputó
router.post('/:id/confirm-played', authenticate, confirmEventPlayed);
router.post('/:id/confirm-not-played', authenticate, confirmEventNotPlayed);

// Validación cruzada de partida por QR
router.post('/:eventId/validate-qr/:scannedUserId', authenticate, validateGameQr);

// Admin: Sincronizar bggIds de eventos existentes con juegos en BD
router.post('/admin/sync-bgg-ids', authenticate, requireAdmin, syncEventBggIds);

// Resultados de partidas
router.get('/:eventId/results', authenticate, getEventResults);
router.put('/:eventId/results', authenticate, upsertEventResults);

// Ruleta de primer jugador
router.post('/:id/spin-first-player', authenticate, spinFirstPlayer);

export default router;
