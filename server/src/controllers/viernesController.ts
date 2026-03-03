// server/src/controllers/viernesController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  createInitialState,
  applyAction,
  type Difficulty,
  type ViernesAction,
} from '../logic/ViernesEngine';

// ─── POST /api/viernes/games ──────────────────────────────────────────────────
// Crea una partida nueva. Solitario: activa inmediatamente.
export const createGame = async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.userId;
    const difficulty = Number(req.body.difficulty) as Difficulty;

    if (![1, 2, 3, 4].includes(difficulty)) {
      return res.status(400).json({ success: false, message: 'Dificultad inválida (debe ser 1-4)' });
    }

    const initialState = createInitialState(difficulty);

    const game = await (prisma as any).viernesGame.create({
      data: {
        playerId,
        gameState: initialState as object,
        difficulty,
        status: 'ACTIVE',
      },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ success: true, data: game });
  } catch (error) {
    console.error('[VIERNES] Error al crear partida:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la partida' });
  }
};

// ─── GET /api/viernes/games ───────────────────────────────────────────────────
// Lista las partidas del usuario actual.
export const listGames = async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.userId;

    const games = await (prisma as any).viernesGame.findMany({
      where: { playerId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: games });
  } catch (error) {
    console.error('[VIERNES] Error al listar partidas:', error);
    return res.status(500).json({ success: false, message: 'Error al listar partidas' });
  }
};

// ─── GET /api/viernes/games/:id ───────────────────────────────────────────────
// Obtiene el estado de una partida (solo el propio jugador puede verla).
export const getGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const game = await (prisma as any).viernesGame.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }
    if (game.playerId !== userId) {
      return res.status(403).json({ success: false, message: 'Sin acceso a esta partida' });
    }

    return res.json({ success: true, data: game });
  } catch (error) {
    console.error('[VIERNES] Error al obtener partida:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la partida' });
  }
};

// ─── PATCH /api/viernes/games/:id/move ────────────────────────────────────────
// Procesa una acción del jugador.
export const makeMove = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const action = req.body as ViernesAction;

    if (!action || !action.type) {
      return res.status(400).json({ success: false, message: 'Acción inválida' });
    }

    const game = await (prisma as any).viernesGame.findUnique({ where: { id } });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }
    if (game.playerId !== userId) {
      return res.status(403).json({ success: false, message: 'Sin acceso a esta partida' });
    }
    if (game.status === 'FINISHED') {
      return res.status(400).json({ success: false, message: 'La partida ya ha terminado' });
    }

    const result = applyAction(game.gameState as any, action);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const updatedGame = await (prisma as any).viernesGame.update({
      where: { id },
      data: {
        gameState: result.newState as object,
        ...(result.gameOver && {
          status: 'FINISHED',
          won: result.won ?? false,
        }),
      },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    return res.json({
      success: true,
      data: updatedGame,
      gameOver: result.gameOver ?? false,
      won: result.won ?? null,
    });
  } catch (error) {
    console.error('[VIERNES] Error al procesar acción:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar la acción' });
  }
};

// ─── DELETE /api/viernes/games/:id ────────────────────────────────────────────
// Abandona una partida activa.
export const abandonGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const game = await (prisma as any).viernesGame.findUnique({ where: { id } });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }
    if (game.playerId !== userId) {
      return res.status(403).json({ success: false, message: 'Sin acceso a esta partida' });
    }
    if (game.status === 'FINISHED') {
      return res.status(400).json({ success: false, message: 'La partida ya ha terminado' });
    }

    const updated = await (prisma as any).viernesGame.update({
      where: { id },
      data: { status: 'FINISHED', won: false },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[VIERNES] Error al abandonar partida:', error);
    return res.status(500).json({ success: false, message: 'Error al abandonar la partida' });
  }
};
