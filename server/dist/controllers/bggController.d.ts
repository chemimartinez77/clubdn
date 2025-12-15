import { Request, Response } from 'express';
/**
 * GET /api/bgg/search?query=catan
 */
export declare const searchGames: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/bgg/game/:id
 */
export declare const getGame: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=bggController.d.ts.map