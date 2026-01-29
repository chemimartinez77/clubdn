"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/authRoutes.ts
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * Registro de nuevo usuario
 */
router.post('/register', [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('El nombre debe tener al menos 2 caracteres'),
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('La contraseña debe contener al menos una letra mayúscula')
        .matches(/[a-z]/)
        .withMessage('La contraseña debe contener al menos una letra minúscula')
        .matches(/[0-9]/)
        .withMessage('La contraseña debe contener al menos un número'),
], async (req, res) => {
    // Verificar errores de validación
    const { validationResult } = await Promise.resolve().then(() => __importStar(require('express-validator')));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array(),
        });
    }
    return (0, authController_1.register)(req, res);
});
/**
 * GET /api/auth/verify-email?token=xxx
 * Verificación de email
 */
router.get('/verify-email', authController_1.verifyEmail);
/**
 * GET /api/auth/me
 * Obtener usuario actual (requiere autenticación)
 */
router.get('/me', auth_1.authenticate, authController_1.getCurrentUser);
/**
 * POST /api/auth/login
 * Inicio de sesión
 */
router.post('/login', [
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('La contraseña es requerida'),
], async (req, res) => {
    // Verificar errores de validación
    const { validationResult } = await Promise.resolve().then(() => __importStar(require('express-validator')));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array(),
        });
    }
    return (0, authController_1.login)(req, res);
});
/**
 * POST /api/auth/request-password-reset
 * Solicitar recuperación de contraseña
 */
router.post('/request-password-reset', [
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
], async (req, res) => {
    const { validationResult } = await Promise.resolve().then(() => __importStar(require('express-validator')));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array(),
        });
    }
    return (0, authController_1.requestPasswordReset)(req, res);
});
/**
 * POST /api/auth/reset-password
 * Restablecer contraseña con token
 */
router.post('/reset-password', [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Token requerido'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
], async (req, res) => {
    const { validationResult } = await Promise.resolve().then(() => __importStar(require('express-validator')));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array(),
        });
    }
    return (0, authController_1.resetPassword)(req, res);
});
/**
 * POST /api/auth/change-password
 * Cambiar contraseña (usuario autenticado)
 */
router.post('/change-password', auth_1.authenticate, [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Contraseña actual requerida'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 6 })
        .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
], async (req, res) => {
    const { validationResult } = await Promise.resolve().then(() => __importStar(require('express-validator')));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array(),
        });
    }
    return (0, authController_1.changePassword)(req, res);
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map