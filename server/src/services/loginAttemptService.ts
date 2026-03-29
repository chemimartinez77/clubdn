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

// Escalones de bloqueo: [intentos_fallidos, segundos_de_bloqueo]
const LOCKOUT_TIERS: [number, number][] = [
  [10, 15 * 60],  // 10 fallos → 15 min
  [6,  5 * 60],   // 6 fallos  → 5 min
  [3,  30],       // 3 fallos  → 30 seg
];

export interface RateLimitResult {
  blocked: boolean;
  retryAfterSeconds: number;
  failedAttempts: number;
  warningMessage?: string;
}

/**
 * Comprueba si un email está bajo rate limiting.
 * Devuelve si está bloqueado, cuántos segundos faltan, y un aviso si está cerca.
 */
export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  // Buscar el último intento exitoso para resetear la ventana
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { email, success: true },
    orderBy: { attemptedAt: 'desc' },
  });

  const since = lastSuccess?.attemptedAt ?? new Date(0);

  // Contar fallos desde el último login exitoso (o desde siempre)
  const recentFailed = await prisma.loginAttempt.findMany({
    where: {
      email,
      success: false,
      attemptedAt: { gt: since },
    },
    orderBy: { attemptedAt: 'desc' },
    take: 15,
  });

  const failedCount = recentFailed.length;

  // Ver si algún escalón aplica bloqueo activo
  for (const [threshold, lockSeconds] of LOCKOUT_TIERS) {
    if (failedCount >= threshold) {
      const lastFailed = recentFailed[0]?.attemptedAt;
      if (!lastFailed) break;

      const unlockAt = new Date(lastFailed.getTime() + lockSeconds * 1000);
      const retryAfterSeconds = Math.ceil((unlockAt.getTime() - Date.now()) / 1000);

      if (retryAfterSeconds > 0) {
        return { blocked: true, retryAfterSeconds, failedAttempts: failedCount };
      }
      // El bloqueo expiró, seguimos
      break;
    }
  }

  // No bloqueado — calcular mensaje de aviso si está cerca del siguiente escalón
  let warningMessage: string | undefined;
  const nextTier = [...LOCKOUT_TIERS].reverse().find(([t]) => failedCount < t);
  if (nextTier) {
    const [nextThreshold, nextSeconds] = nextTier;
    const remaining = nextThreshold - failedCount;
    const minutes = Math.round(nextSeconds / 60);
    const timeStr = nextSeconds < 60 ? `${nextSeconds} segundos` : `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    if (remaining === 1) {
      warningMessage = `Atención: si falla este intento, el acceso quedará bloqueado durante ${timeStr}.`;
    } else if (remaining === 2) {
      warningMessage = `Quedan ${remaining} intentos antes de un bloqueo de ${timeStr}.`;
    }
  }

  return { blocked: false, retryAfterSeconds: 0, failedAttempts: failedCount, warningMessage };
}
