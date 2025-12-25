"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/statsRoutes.ts
const express_1 = require("express");
const statsController_1 = require("../controllers/statsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Estadísticas de admin (requiere permisos)
router.get('/admin', auth_1.authenticate, auth_1.requireAdmin, statsController_1.getAdminStats);
// Estadísticas del usuario autenticado
router.get('/user', auth_1.authenticate, statsController_1.getUserStats);
// Estadísticas globales del club (públicas para usuarios autenticados)
router.get('/club', auth_1.authenticate, statsController_1.getClubStats);
// Detalles de eventos del usuario
router.get('/user/events-attended', auth_1.authenticate, statsController_1.getUserEventsAttended);
router.get('/user/games-played', auth_1.authenticate, statsController_1.getUserGamesPlayed);
router.get('/user/upcoming-events', auth_1.authenticate, statsController_1.getUserUpcomingEvents);
exports.default = router;
//# sourceMappingURL=statsRoutes.js.map