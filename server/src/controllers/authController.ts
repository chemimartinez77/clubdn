// server/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import {
  sendVerificationEmail,
  sendAdminNotification,
} from '../services/emailService';
import { logLoginAttempt } from '../services/loginAttemptService';

/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
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

    // Enviar email de verificaci?n
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (mailError) {
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
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el registro',
    });
  }
};

/**
 * Verificaci?n de email
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
      return res.status(400).json({
        success: false,
        message: 'Token de verificación inválido',
      });
    }

    // Verificar que el token no haya expirado
    if (user.tokenExpiry && user.tokenExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'El token de verificación ha expirado',
      });
    }

    // Actualizar usuario
    await prisma.user.update({
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

    if (defaultAdminEmail) {
      // Enviar notificaci?n al admin
      await sendAdminNotification(defaultAdminEmail, user.name, user.email);
    }

    return res.status(200).json({
      success: true,
      message:
        'Email verificado exitosamente. Tu solicitud será revisada por un administrador.',
    });
  } catch (error) {
    console.error('Error en verificación de email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el email',
    });
  }
};
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
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
    });
  }
};

/**
 * Login de usuario
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await logLoginAttempt({
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
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await logLoginAttempt({
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
      await logLoginAttempt({
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
      await logLoginAttempt({
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
      await logLoginAttempt({
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
      await logLoginAttempt({
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
      await logLoginAttempt({
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
    const jwtExpiration = (process.env.JWT_EXPIRATION || '7d') as jwt.SignOptions['expiresIn'];
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as jwt.Secret,
      { expiresIn: jwtExpiration }
    );

    // Actualizar último login
    const updatedUser = await prisma.user.update({
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
    await logLoginAttempt({
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
