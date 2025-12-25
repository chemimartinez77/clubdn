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
 * Obtener eventos asistidos del usuario (detallados)
 */
export declare const getUserEventsAttended: (req: Request, res: Response) => Promise<void>;
/**
 * Obtener partidas jugadas del usuario (detalladas)
 */
export declare const getUserGamesPlayed: (req: Request, res: Response) => Promise<void>;
/**
 * Obtener próximos eventos del usuario (detallados)
 */
export declare const getUserUpcomingEvents: (req: Request, res: Response) => Promise<void>;
/**
 * Obtener estadísticas globales del club
 */
export declare const getClubStats: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=statsController.d.ts.map