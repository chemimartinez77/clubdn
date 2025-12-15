// server/src/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { register, verifyEmail, login, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Registro de nuevo usuario
 */
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('El nombre debe tener al menos 2 caracteres'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Debe proporcionar un email válido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/[A-Z]/)
      .withMessage('La contraseña debe contener al menos una letra mayúscula')
      .matches(/[a-z]/)
      .withMessage('La contraseña debe contener al menos una letra minúscula')
      .matches(/[0-9]/)
      .withMessage('La contraseña debe contener al menos un número'),
  ],
  async (req: Request, res: Response) => {
    // Verificar errores de validación
    const { validationResult } = await import('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array(),
      });
    }

    return register(req, res);
  }
);

/**
 * GET /api/auth/verify-email?token=xxx
 * Verificación de email
 */
router.get('/verify-email', verifyEmail);

/**
 * GET /api/auth/me
 * Obtener usuario actual (requiere autenticación)
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * POST /api/auth/login
 * Inicio de sesión
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Debe proporcionar un email válido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida'),
  ],
  async (req: Request, res: Response) => {
    // Verificar errores de validación
    const { validationResult } = await import('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array(),
      });
    }

    return login(req, res);
  }
);

export default router;