import { Request, Response } from 'express';
/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Verificación de email
 * GET /api/auth/verify-email?token=xxx
 */
export declare const verifyEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Obtener usuario actual
 * GET /api/auth/me
 */
export declare const getCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Login de usuario
 * POST /api/auth/login
 */
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=authController.d.ts.map