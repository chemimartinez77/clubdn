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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.getCurrentUser = exports.verifyEmail = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const database_1 = require("../config/database");
const emailService_1 = require("../services/emailService");
const loginAttemptService_1 = require("../services/loginAttemptService");
/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Verificar si el email ya existe
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Este email ya está registrado',
            });
        }
        // Hash del password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Generar token de verificación
        const verificationToken = (0, crypto_1.randomUUID)();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 horas
        // Crear usuario
        const user = await database_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                verificationToken,
                tokenExpiry,
                status: 'PENDING_VERIFICATION',
            },
        });
        // Enviar email de verificación
        try {
            await (0, emailService_1.sendVerificationEmail)(email, name, verificationToken);
        }
        catch (mailError) {
            console.error('Error enviando email de verificaci?n:', mailError);
            return res.status(201).json({
                success: true,
                message: 'Registro exitoso, pero no se pudo enviar el email de verificación.',
                data: {
                    email: user.email,
                },
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Registro exitoso. Por favor, verifica tu email.',
            data: {
                email: user.email,
            },
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al procesar el registro',
        });
    }
};
exports.register = register;
/**
 * Verificacion de email
 * GET /api/auth/verify-email?token=xxx
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Token de verificaci\u00f3n no proporcionado',
            });
        }
        // Buscar usuario por token
        const user = await database_1.prisma.user.findFirst({
            where: {
                verificationToken: token,
            },
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token de verificaci\u00f3n inv\u00e1lido o ya utilizado',
            });
        }
        // Verificar que el token no haya expirado
        if (user.tokenExpiry && user.tokenExpiry < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'El token de verificaci\u00f3n ha expirado',
            });
        }
        // Actualizar usuario
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                status: 'PENDING_APPROVAL',
                verificationToken: null,
                tokenExpiry: null,
            },
        });
        // Obtener email del admin por defecto
        const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL;
        const displayName = user.name || 'Usuario';
        const displayEmail = user.email || 'Email no disponible';
        if (defaultAdminEmail) {
            try {
                // Enviar notificacion al admin sin bloquear la verificacion
                await (0, emailService_1.sendAdminNotification)(defaultAdminEmail, displayName, displayEmail);
            }
            catch (notifyError) {
                console.error('Error enviando notificacion al admin:', notifyError);
            }
        }
        try {
            // Notificar a admins en la aplicacion
            const { notifyAdminsNewUser } = await Promise.resolve().then(() => __importStar(require('../services/notificationService')));
            await notifyAdminsNewUser(displayName, displayEmail);
        }
        catch (notifyError) {
            console.error('Error creando notificacion en la app:', notifyError);
        }
        return res.status(200).json({
            success: true,
            message: 'Email verificado exitosamente. Tu solicitud será revisada por un administrador.',
        });
    }
    catch (error) {
        console.error('Error en verificacion de email:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar el email. Inténtalo de nuevo en unos minutos.',
        });
    }
};
exports.verifyEmail = verifyEmail;
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                lastLoginAt: true,
                membership: {
                    select: {
                        type: true
                    }
                },
                profile: {
                    select: {
                        avatar: true
                    }
                }
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }
        return res.status(200).json({
            success: true,
            data: { user },
        });
    }
    catch (error) {
        console.error('Error al obtener usuario actual:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener usuario',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * Login de usuario
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Buscar usuario por email
        const user = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'invalid_credentials',
                req
            });
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }
        // Verificar password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'invalid_password',
                userId: user.id,
                req
            });
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }
        // Verificar estado del usuario
        if (user.status === 'PENDING_VERIFICATION') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'pending_verification',
                userId: user.id,
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Debes verificar tu email antes de iniciar sesión',
            });
        }
        if (user.status === 'PENDING_APPROVAL') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'pending_approval',
                userId: user.id,
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Tu solicitud está pendiente de aprobación por un administrador',
            });
        }
        if (user.status === 'REJECTED') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'rejected',
                userId: user.id,
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Tu solicitud fue rechazada. Contacta al administrador para más información',
            });
        }
        if (user.status === 'SUSPENDED') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'suspended',
                userId: user.id,
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta está suspendida. Contacta al administrador',
            });
        }
        // Solo usuarios APPROVED pueden iniciar sesión
        if (user.status !== 'APPROVED') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                success: false,
                failureReason: 'not_approved',
                userId: user.id,
                req
            });
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder',
            });
        }
        // Generar JWT token
        const jwtExpiration = (process.env.JWT_EXPIRATION || '7d');
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: jwtExpiration });
        // Actualizar último login
        const updatedUser = await database_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
            include: {
                membership: {
                    select: {
                        type: true
                    }
                },
                profile: {
                    select: {
                        avatar: true
                    }
                }
            }
        });
        // Registrar login exitoso
        await (0, loginAttemptService_1.logLoginAttempt)({
            email,
            success: true,
            userId: user.id,
            req
        });
        return res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    status: updatedUser.status,
                    createdAt: updatedUser.createdAt.toISOString(),
                    lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
                    membership: updatedUser.membership,
                    profile: updatedUser.profile
                },
            },
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        // Registrar error del servidor
        await (0, loginAttemptService_1.logLoginAttempt)({
            email: req.body.email || 'unknown',
            success: false,
            failureReason: 'server_error',
            req
        });
        return res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
        });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map