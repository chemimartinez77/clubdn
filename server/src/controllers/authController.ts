// server/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import {
  sendVerificationEmail,
  sendAdminNotification,
  sendPasswordResetEmail,
} from '../services/emailService';
import { logLoginAttempt, checkLoginRateLimit } from '../services/loginAttemptService';
import { notifyAdminsNewUser } from '../services/notificationService';
import https from 'https';
import querystring from 'querystring';

async function verifyHcaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    console.warn('[hCaptcha] HCAPTCHA_SECRET no configurado, omitiendo verificación');
    return true;
  }
  return new Promise((resolve) => {
    const body = querystring.stringify({ secret, response: token });
    const req = https.request(
      {
        hostname: 'api.hcaptcha.com',
        path: '/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.success === true);
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    if (process.env.EMAIL_DISABLED === 'true') {
      return res.status(503).json({
        success: false,
        message: 'El registro está temporalmente deshabilitado. Inténtalo de nuevo en unas horas.',
      });
    }

    const { name, email, password, hcaptchaToken } = req.body;

    // Verificar hCaptcha
    if (!hcaptchaToken) {
      return res.status(400).json({ success: false, message: 'Verificación de seguridad requerida' });
    }
    const captchaOk = await verifyHcaptcha(hcaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ success: false, message: 'Verificación de seguridad fallida. Inténtalo de nuevo.' });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.status === 'REJECTED') {
        return res.status(403).json({
          success: false,
          message: 'Tu solicitud de registro fue rechazada. Por favor, contacta con un administrador para más información.',
          failureReason: 'rejected',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Este email ya está registrado',
      });
    }

    // Hash del password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generar token de verificación
    const verificationToken = randomUUID();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 horas

    // Crear usuario
    const user = await prisma.user.create({
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
      await sendVerificationEmail(email, name, verificationToken);
    } catch (mailError) {
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
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el registro',
    });
  }
};

/**
 * Verificacion de email
 * GET /api/auth/verify-email?token=xxx
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Token de verificación no proporcionado',
      });
    }

    // Buscar usuario por token
    const user = await prisma.user.findFirst({
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
    await prisma.user.update({
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
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'APPROVED',
        },
        select: { email: true },
      });

      // Enviar email a cada admin
      for (const admin of admins) {
        await sendAdminNotification(admin.email, user.name, user.email);
      }

      // Crear notificación en la campanita para los admins
      await notifyAdminsNewUser(user.name, user.email);
    } catch (mailError) {
      console.error('Error enviando notificación a admins:', mailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verificado correctamente. Tu cuenta está pendiente de aprobación por un administrador.',
    });
  } catch (error) {
    console.error('Error en verificación de email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el email',
    });
  }
};

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, hcaptchaToken } = req.body;

    // Verificar hCaptcha
    if (!hcaptchaToken) {
      return res.status(400).json({ success: false, message: 'Verificación de seguridad requerida' });
    }
    const captchaOk = await verifyHcaptcha(hcaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ success: false, message: 'Verificación de seguridad fallida. Inténtalo de nuevo.' });
    }

    // Comprobar rate limit antes de cualquier consulta de credenciales
    const rateLimit = await checkLoginRateLimit(email);
    if (rateLimit.blocked) {
      const mins = Math.ceil(rateLimit.retryAfterSeconds / 60);
      const timeStr = rateLimit.retryAfterSeconds < 60
        ? `${rateLimit.retryAfterSeconds} segundos`
        : `${mins} minuto${mins !== 1 ? 's' : ''}`;
      return res.status(429).json({
        success: false,
        message: `Demasiados intentos fallidos. Por favor, espera ${timeStr} antes de intentarlo de nuevo.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        membership: true,
        profile: true,
      },
    });

    if (!user) {
      await logLoginAttempt({
        email,
        success: false,
        failureReason: 'invalid_credentials',
        req
      });
      const rl = await checkLoginRateLimit(email);

      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas',
        warningMessage: rl.warningMessage,
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await logLoginAttempt({
        email,
        userId: user.id,
        success: false,
        failureReason: 'invalid_credentials',
        req
      });
      const rl = await checkLoginRateLimit(email);

      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas',
        warningMessage: rl.warningMessage,
      });
    }

    // Verificar estado del usuario
    if (user.status === 'PENDING_VERIFICATION') {
      await logLoginAttempt({
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
      await logLoginAttempt({
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
      await logLoginAttempt({
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
      await logLoginAttempt({
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
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '365d' }
    );

    // Actualizar último login
    const updatedUser = await prisma.user.update({
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
    await logLoginAttempt({
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
  } catch (error) {
    console.error('Error en login:', error);

    // Registrar error del servidor
    await logLoginAttempt({
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

/**
 * Solicitar reset de contraseña
 * POST /api/auth/request-password-reset
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    if (process.env.EMAIL_DISABLED === 'true') {
      return res.status(503).json({
        success: false,
        message: 'La recuperación de contraseña está temporalmente deshabilitada. Inténtalo de nuevo en unas horas.',
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido',
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
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
    const resetToken = randomUUID();
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hora

    // Guardar token en BD
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry,
      },
    });

    // Enviar email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (mailError) {
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
  } catch (error) {
    console.error('Error en request password reset:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
    });
  }
};

/**
 * Resetear contraseña con token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
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
    const user = await prisma.user.findFirst({
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
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar token
    await prisma.user.update({
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
  } catch (error) {
    console.error('Error en reset password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña',
    });
  }
};

/**
 * Cambiar contraseña (usuario autenticado)
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta',
      });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Error en change password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
    });
  }
};

/**
 * Obtener usuario actual
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
    });
  }
};
