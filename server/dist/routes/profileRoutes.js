"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/profileRoutes.ts
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rutas de perfil (requieren autenticación)
router.get('/me', auth_1.authenticate, profileController_1.getMyProfile);
router.put('/me', auth_1.authenticate, profileController_1.updateMyProfile);
router.get('/:userId', auth_1.authenticate, profileController_1.getUserProfile);
exports.default = router;
//# sourceMappingURL=profileRoutes.js.map