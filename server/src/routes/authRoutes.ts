import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import {
  register,
  verifyEmail,
  login,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  changePassword,
  resendVerificationEmail,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { PASSWORD_MIN_LENGTH, validateStrongPassword } from '../utils/passwordPolicy';

const router = Router();

const validateStrongPasswordField = (fieldName: string, minLengthMessage: string) =>
  body(fieldName)
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(minLengthMessage)
    .custom((value) => {
      const message = validateStrongPassword(String(value));
      if (message) {
        throw new Error(message);
      }
      return true;
    });

router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('El nombre debe tener al menos 2 caracteres'),
    body('birthDate')
      .notEmpty()
      .withMessage('La fecha de nacimiento es obligatoria')
      .isISO8601()
      .withMessage('La fecha de nacimiento no es válida')
      .custom((value) => new Date(value) <= new Date())
      .withMessage('La fecha de nacimiento no puede ser futura'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Debe proporcionar un email válido')
      .normalizeEmail({ gmail_remove_dots: false }),
    validateStrongPasswordField('password', 'La contraseña debe tener al menos 8 caracteres'),
  ],
  async (req: Request, res: Response) => {
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

router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.get('/me', authenticate, getCurrentUser);

router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Debe proporcionar un email válido'),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida'),
  ],
  async (req: Request, res: Response) => {
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

router.post(
  '/request-password-reset',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Debe proporcionar un email válido'),
  ],
  async (req: Request, res: Response) => {
    const { validationResult } = await import('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array(),
      });
    }

    return requestPasswordReset(req, res);
  }
);

router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Token requerido'),
    validateStrongPasswordField('newPassword', 'La contraseña debe tener al menos 8 caracteres'),
  ],
  async (req: Request, res: Response) => {
    const { validationResult } = await import('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array(),
      });
    }

    return resetPassword(req, res);
  }
);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Contraseña actual requerida'),
    validateStrongPasswordField('newPassword', 'La nueva contraseña debe tener al menos 8 caracteres'),
  ],
  async (req: Request, res: Response) => {
    const { validationResult } = await import('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array(),
      });
    }

    return changePassword(req, res);
  }
);

export default router;
