// server/src/services/loginAttemptService.ts
import { Request } from 'express';
import { prisma } from '../config/database';

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
export async function logLoginAttempt({
  email,
  success,
  failureReason,
  userId,
  req
}: LogLoginAttemptParams): Promise<void> {
  try {
    // Obtener IP del usuario
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    // Obtener User Agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Registrar en la base de datos
    await prisma.loginAttempt.create({
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
  } catch (error) {
    // No queremos que un error al registrar el intento bloquee el login
    console.error('Error al registrar intento de login:', error);
  }
}

/**
 * Obtener intentos de login recientes de un email
 */
export async function getRecentLoginAttempts(
  email: string,
  limit: number = 10
) {
  return await prisma.loginAttempt.findMany({
    where: { email },
    orderBy: { attemptedAt: 'desc' },
    take: limit
  });
}

/**
 * Contar intentos fallidos recientes (últimos X minutos)
 */
export async function countRecentFailedAttempts(
  email: string,
  minutesAgo: number = 15
): Promise<number> {
  const since = new Date(Date.now() - minutesAgo * 60 * 1000);

  return await prisma.loginAttempt.count({
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
export async function isIpBlocked(
  ipAddress: string,
  maxAttempts: number = 10,
  minutesAgo: number = 15
): Promise<boolean> {
  const since = new Date(Date.now() - minutesAgo * 60 * 1000);

  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress,
      success: false,
      attemptedAt: { gte: since }
    }
  });

  return failedAttempts >= maxAttempts;
}
