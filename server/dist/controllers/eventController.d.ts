import { Request, Response } from 'express';
/**
 * GET /api/events - Listar eventos con filtros
 */
export declare const getEvents: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/events/:id - Obtener detalle de evento
 */
export declare const getEvent: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/events - Crear evento
 * Admins pueden crear cualquier tipo
 * Usuarios normales solo pueden crear PARTIDA
 */
export declare const createEvent: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /api/events/:id - Actualizar evento (solo admins u organizador)
 */
export declare const updateEvent: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/events/:id - Cancelar evento (solo admins)
 */
export declare const deleteEvent: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/events/:id/register - Registrarse a evento
 */
export declare const registerToEvent: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/events/:id/register - Cancelar registro a evento
 */
export declare const unregisterFromEvent: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/events/:id/attendees - Obtener lista de asistentes
 */
export declare const getEventAttendees: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=eventController.d.ts.map