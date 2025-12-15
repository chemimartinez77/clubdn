"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/statsRoutes.ts
const express_1 = require("express");
const statsController_1 = require("../controllers/statsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación y permisos de admin
router.get('/admin', auth_1.authenticate, auth_1.requireAdmin, statsController_1.getAdminStats);
exports.default = router;
//# sourceMappingURL=statsRoutes.js.map