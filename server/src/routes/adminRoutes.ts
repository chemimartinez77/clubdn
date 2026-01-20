// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getPendingApprovals,
  approveUser,
  rejectUser,
} from '../controllers/adminController';
import {
  getMembers,
  getMemberProfile,
  updateMemberProfile,
  markMemberAsBaja,
  exportMembersCSV
} from '../controllers/memberController';

const router = Router();

// Todas las rutas requieren autenticaci�n y permisos de admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/pending-approvals
 * Listar solicitudes pendientes de aprobaci�n
 */
router.get('/pending-approvals', getPendingApprovals);

/**
 * POST /api/admin/approve/:userId
 * Aprobar un usuario
 */
router.post('/approve/:userId', approveUser);

/**
 * POST /api/admin/reject/:userId
 * Rechazar un usuario
 */
router.post('/reject/:userId', rejectUser);

/**
 * GET /api/admin/members
 * Obtener listado de miembros con filtros y paginación
 */
router.get('/members', getMembers);

/**
 * GET /api/admin/members/:memberId/profile
 * Obtener ficha editable de miembro
 */
router.get('/members/:memberId/profile', getMemberProfile);

/**
 * PUT /api/admin/members/:memberId/profile
 * Actualizar ficha editable de miembro
 */
router.put('/members/:memberId/profile', updateMemberProfile);

/**
 * POST /api/admin/members/:memberId/mark-baja
 * Marcar un miembro como BAJA
 */
router.post('/members/:memberId/mark-baja', markMemberAsBaja);

/**
 * GET /api/admin/members/export/csv
 * Exportar miembros a CSV
 */
router.get('/members/export/csv', exportMembersCSV);

export default router;
