import { Request } from 'express';
interface LogLoginAttemptParams {
    email: string;
    success: boolean;
    failureReason?: string;
    userId?: string;
    req: Request;
}
/**
 * Registrar un intento de login en la base de datos
 * Incluye IP, user agent y motivo del fallo
 */
export declare function logLoginAttempt({ email, success, failureReason, userId, req }: LogLoginAttemptParams): Promise<void>;
/**
 * Obtener intentos de login recientes de un email
 */
export declare function getRecentLoginAttempts(email: string, limit?: number): Promise<{
    id: string;
    email: string;
    userId: string | null;
    success: boolean;
    failureReason: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    attemptedAt: Date;
}[]>;
/**
 * Contar intentos fallidos recientes (últimos X minutos)
 */
export declare function countRecentFailedAttempts(email: string, minutesAgo?: number): Promise<number>;
/**
 * Verificar si una IP está bloqueada por múltiples intentos fallidos
 */
export declare function isIpBlocked(ipAddress: string, maxAttempts?: number, minutesAgo?: number): Promise<boolean>;
export {};
//# sourceMappingURL=loginAttemptService.d.ts.map