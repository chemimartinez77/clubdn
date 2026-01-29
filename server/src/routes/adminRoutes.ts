// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import multer from 'multer';
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
  exportMembersCSV,
  uploadMemberAvatar,
  getMembershipHistory
} from '../controllers/memberController';
import { updateReportAdmin } from '../controllers/reportController';

const router = Router();

// Configurar multer para subida de avatar
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

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
 * GET /api/admin/members/:memberId/membership-history
 * Obtener historial de cambios de membresía
 */
router.get('/members/:memberId/membership-history', getMembershipHistory);

/**
 * POST /api/admin/members/:memberId/avatar
 * Subir avatar de un miembro (admin)
 */
router.post('/members/:memberId/avatar', upload.single('avatar'), uploadMemberAvatar);

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

/**
 * PATCH /api/admin/reports/:id
 * Actualizar estado, prioridad y respuesta del desarrollador
 */
router.patch('/reports/:id', updateReportAdmin);

export default router;
