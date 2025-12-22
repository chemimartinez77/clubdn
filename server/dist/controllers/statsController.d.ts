import { Request, Response } from 'express';
/**
 * Obtener estadísticas generales del sistema (solo admins)
 */
export declare const getAdminStats: (_req: Request, res: Response) => Promise<void>;
/**
 * Obtener estadísticas del usuario
 */
export declare const getUserStats: (req: Request, res: Response) => Promise<void>;
/**
 * Obtener estadísticas globales del club
 */
export declare const getClubStats: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=statsController.d.ts.map