import { Request, Response } from 'express';
/**
 * Listar solicitudes pendientes de aprobaci�n
 * GET /api/admin/pending-approvals
 */
export declare const getPendingApprovals: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Aprobar usuario
 * POST /api/admin/approve/:userId
 */
export declare const approveUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Rechazar usuario
 * POST /api/admin/reject/:userId
 */
export declare const rejectUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=adminController.d.ts.map