"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/adminRoutes.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticaci�n y permisos de admin
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
/**
 * GET /api/admin/pending-approvals
 * Listar solicitudes pendientes de aprobaci�n
 */
router.get('/pending-approvals', adminController_1.getPendingApprovals);
/**
 * POST /api/admin/approve/:userId
 * Aprobar un usuario
 */
router.post('/approve/:userId', adminController_1.approveUser);
/**
 * POST /api/admin/reject/:userId
 * Rechazar un usuario
 */
router.post('/reject/:userId', adminController_1.rejectUser);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map