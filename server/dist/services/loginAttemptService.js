"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logLoginAttempt = logLoginAttempt;
exports.getRecentLoginAttempts = getRecentLoginAttempts;
exports.countRecentFailedAttempts = countRecentFailedAttempts;
exports.isIpBlocked = isIpBlocked;
const database_1 = require("../config/database");
/**
 * Registrar un intento de login en la base de datos
 * Incluye IP, user agent y motivo del fallo
 */
async function logLoginAttempt({ email, success, failureReason, userId, req }) {
    try {
        // Obtener IP del usuario
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.socket.remoteAddress ||
            'unknown';
        // Obtener User Agent
        const userAgent = req.headers['user-agent'] || 'unknown';
        // Registrar en la base de datos
        await database_1.prisma.loginAttempt.create({
            data: {
                email,
                ipAddress,
                userAgent,
                success,
                failureReason,
                userId
            }
        });
        // Log en consola para debugging
        const status = success ? '✅ SUCCESS' : '❌ FAILED';
        const reason = failureReason ? ` (${failureReason})` : '';
        console.log(`[LOGIN ${status}] ${email} from ${ipAddress}${reason}`);
    }
    catch (error) {
        // No queremos que un error al registrar el intento bloquee el login
        console.error('Error al registrar intento de login:', error);
    }
}
/**
 * Obtener intentos de login recientes de un email
 */
async function getRecentLoginAttempts(email, limit = 10) {
    return await database_1.prisma.loginAttempt.findMany({
        where: { email },
        orderBy: { attemptedAt: 'desc' },
        take: limit
    });
}
/**
 * Contar intentos fallidos recientes (últimos X minutos)
 */
async function countRecentFailedAttempts(email, minutesAgo = 15) {
    const since = new Date(Date.now() - minutesAgo * 60 * 1000);
    return await database_1.prisma.loginAttempt.count({
        where: {
            email,
            success: false,
            attemptedAt: { gte: since }
        }
    });
}
/**
 * Verificar si una IP está bloqueada por múltiples intentos fallidos
 */
async function isIpBlocked(ipAddress, maxAttempts = 10, minutesAgo = 15) {
    const since = new Date(Date.now() - minutesAgo * 60 * 1000);
    const failedAttempts = await database_1.prisma.loginAttempt.count({
        where: {
            ipAddress,
            success: false,
            attemptedAt: { gte: since }
        }
    });
    return failedAttempts >= maxAttempts;
}
//# sourceMappingURL=loginAttemptService.js.map