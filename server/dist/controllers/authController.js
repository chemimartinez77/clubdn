"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.changePassword = exports.resetPassword = exports.requestPasswordReset = exports.login = exports.verifyEmail = exports.register = void 0;
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
            console.error('Error enviando email de verificación:', mailError);
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
                message: 'Token de verificación no proporcionado',
            });
        }
        // Buscar usuario por token
        const user = await database_1.prisma.user.findFirst({
            where: {
                verificationToken: token,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Token inválido o expirado',
            });
        }
        // Verificar si el token ha expirado
        if (user.tokenExpiry && new Date() > user.tokenExpiry) {
            return res.status(400).json({
                success: false,
                message: 'El token de verificación ha expirado',
            });
        }
        // Verificar usuario
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                status: 'PENDING_APPROVAL', // Ahora pasa a esperar aprobación
                verificationToken: null,
                tokenExpiry: null,
            },
        });
        // Notificar a los admins
        try {
            // Buscar todos los admins
            const admins = await database_1.prisma.user.findMany({
                where: {
                    role: { in: ['ADMIN', 'SUPER_ADMIN'] },
                    status: 'APPROVED',
                },
                select: { email: true },
            });
            // Enviar notificación a cada admin
            for (const admin of admins) {
                await (0, emailService_1.sendAdminNotification)(admin.email, user.name, user.email);
            }
        }
        catch (mailError) {
            console.error('Error enviando notificación a admins:', mailError);
        }
        return res.status(200).json({
            success: true,
            message: 'Email verificado correctamente. Tu cuenta está pendiente de aprobación por un administrador.',
        });
    }
    catch (error) {
        console.error('Error en verificación de email:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar el email',
        });
    }
};
exports.verifyEmail = verifyEmail;
/**
 * Login
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Buscar usuario
        const user = await database_1.prisma.user.findUnique({
            where: { email },
            include: {
                membership: true,
                profile: true,
            },
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
                message: 'Credenciales incorrectas',
            });
        }
        // Verificar contraseña
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                userId: user.id,
                success: false,
                failureReason: 'invalid_credentials',
                req
            });
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas',
            });
        }
        // Verificar estado del usuario
        if (user.status === 'PENDING_VERIFICATION') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                userId: user.id,
                success: false,
                failureReason: 'pending_verification',
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Por favor, verifica tu email antes de iniciar sesión',
                status: 'PENDING_VERIFICATION',
            });
        }
        if (user.status === 'PENDING_APPROVAL') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                userId: user.id,
                success: false,
                failureReason: 'pending_approval',
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta está pendiente de aprobación por un administrador',
                status: 'PENDING_APPROVAL',
            });
        }
        if (user.status === 'REJECTED') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                userId: user.id,
                success: false,
                failureReason: 'rejected',
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Tu solicitud de registro ha sido rechazada',
                status: 'REJECTED',
            });
        }
        if (user.status === 'SUSPENDED') {
            await (0, loginAttemptService_1.logLoginAttempt)({
                email,
                userId: user.id,
                success: false,
                failureReason: 'suspended',
                req
            });
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido suspendida',
                status: 'SUSPENDED',
            });
        }
        // Generar token JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
        }, process.env.JWT_SECRET || 'default-secret-key', { expiresIn: '7d' });
        // Actualizar último login
        const updatedUser = await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
            },
            include: {
                membership: true,
                profile: true,
            },
        });
        // Registrar login exitoso
        await (0, loginAttemptService_1.logLoginAttempt)({
            email,
            userId: user.id,
            success: true,
            req
        });
        return res.status(200).json({
            success: true,
            message: 'Login exitoso',
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
/**
 * Solicitar reset de contraseña
 * POST /api/auth/request-password-reset
 */
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email requerido',
            });
        }
        // Buscar usuario
        const user = await database_1.prisma.user.findUnique({
            where: { email },
        });
        // Por seguridad, siempre devolvemos éxito aunque el usuario no exista
        // para no revelar qué emails están registrados
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
            });
        }
        // Generar token de reset
        const resetToken = (0, crypto_1.randomUUID)();
        const resetExpiry = new Date();
        resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hora
        // Guardar token en BD
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpiry: resetExpiry,
            },
        });
        // Enviar email
        try {
            await (0, emailService_1.sendPasswordResetEmail)(user.email, user.name, resetToken);
        }
        catch (mailError) {
            console.error('Error enviando email de reset:', mailError);
            return res.status(500).json({
                success: false,
                message: 'Error al enviar el email de recuperación',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
        });
    }
    catch (error) {
        console.error('Error en request password reset:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud',
        });
    }
};
exports.requestPasswordReset = requestPasswordReset;
/**
 * Resetear contraseña con token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token y nueva contraseña requeridos',
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres',
            });
        }
        // Buscar usuario por token
        const user = await database_1.prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Token inválido o expirado',
            });
        }
        // Verificar si el token ha expirado
        if (user.resetPasswordExpiry && new Date() > user.resetPasswordExpiry) {
            return res.status(400).json({
                success: false,
                message: 'El token de recuperación ha expirado',
            });
        }
        // Hash de la nueva contraseña
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        // Actualizar contraseña y limpiar token
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiry: null,
            },
        });
        return res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente',
        });
    }
    catch (error) {
        console.error('Error en reset password:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al restablecer la contraseña',
        });
    }
};
exports.resetPassword = resetPassword;
/**
 * Cambiar contraseña (usuario autenticado)
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { currentPassword, newPassword } = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual y nueva contraseña requeridas',
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres',
            });
        }
        // Buscar usuario
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }
        // Verificar contraseña actual
        const validPassword = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta',
            });
        }
        // Hash de la nueva contraseña
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        // Actualizar contraseña
        await database_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        return res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente',
        });
    }
    catch (error) {
        console.error('Error en change password:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar la contraseña',
        });
    }
};
exports.changePassword = changePassword;
/**
 * Obtener usuario actual
 * GET /api/auth/me
 */
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
            include: {
                membership: true,
                profile: true,
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
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    createdAt: user.createdAt.toISOString(),
                    lastLoginAt: user.lastLoginAt?.toISOString() || null,
                    membership: user.membership,
                    profile: user.profile,
                },
            },
        });
    }
    catch (error) {
        console.error('Error en getCurrentUser:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener usuario',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=authController.js.map