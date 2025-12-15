import { Request, Response } from 'express';
/**
 * Obtener el perfil del usuario autenticado
 */
export declare const getMyProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Obtener perfil de cualquier usuario (público)
 */
export declare const getUserProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Actualizar perfil del usuario autenticado
 */
export declare const updateMyProfile: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=profileController.d.ts.map