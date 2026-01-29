"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/profileRoutes.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Configurar multer para subida de avatar en memoria
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
// Rutas de perfil (requieren autenticación)
router.get('/me', auth_1.authenticate, profileController_1.getMyProfile);
router.put('/me', auth_1.authenticate, profileController_1.updateMyProfile);
router.post('/me/avatar', auth_1.authenticate, upload.single('avatar'), profileController_1.uploadAvatar);
router.get('/:userId', auth_1.authenticate, profileController_1.getUserProfile);
exports.default = router;
//# sourceMappingURL=profileRoutes.js.map