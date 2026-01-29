import { Request, Response } from 'express';
/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Verificacion de email
 * GET /api/auth/verify-email?token=xxx
 */
export declare const verifyEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Login
 * POST /api/auth/login
 */
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Solicitar reset de contraseña
 * POST /api/auth/request-password-reset
 */
export declare const requestPasswordReset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Resetear contraseña con token
 * POST /api/auth/reset-password
 */
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Cambiar contraseña (usuario autenticado)
 * POST /api/auth/change-password
 */
export declare const changePassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Obtener usuario actual
 * GET /api/auth/me
 */
export declare const getCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=authController.d.ts.map