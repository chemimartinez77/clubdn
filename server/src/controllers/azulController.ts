// server/src/controllers/azulController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  createInitialState,
  applyMove,
  isGameOver,
  getWinnerIndex,
  type GameState,
  type MovePayload,
} from '../logic/AzulEngine';

// ─── POST /api/azul/games ─────────────────────────────────────────────────────
// Crea una partida nueva. El creador es player1; player2 se une después.
export const createGame = async (req: Request, res: Response) => {
  try {
    const player1Id = req.user!.userId;

    const initialState = createInitialState(player1Id, '__pending__');

    const game = await prisma.azulGame.create({
      data: {
        player1Id,
        gameState: initialState as object,
        currentTurn: player1Id,
        status: 'WAITING',
      },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ success: true, data: game });
  } catch (error) {
    console.error('[AZUL] Error al crear partida:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la partida' });
  }
};

// ─── POST /api/azul/games/:id/join ────────────────────────────────────────────
// El segundo jugador se une a una partida en estado WAITING.
export const joinGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const player2Id = req.user!.userId;

    const game = await prisma.azulGame.findUnique({ where: { id } });
    if (!game) return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    if (game.status !== 'WAITING') {
      return res.status(400).json({ success: false, message: 'La partida ya no está disponible' });
    }
    if (game.player1Id === player2Id) {
      return res.status(400).json({ success: false, message: 'No puedes unirte a tu propia partida' });
    }

    // Regenerar el estado inicial real con el ID del segundo jugador
    const freshState = createInitialState(game.player1Id, player2Id);

    const updated = await prisma.azulGame.update({
      where: { id },
      data: {
        player2Id,
        gameState: freshState as object,
        currentTurn: freshState.players[freshState.turnIndex]?.id ?? game.player1Id,
        status: 'ACTIVE',
      },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[AZUL] Error al unirse a partida:', error);
    return res.status(500).json({ success: false, message: 'Error al unirse a la partida' });
  }
};

// ─── GET /api/azul/games/:id ──────────────────────────────────────────────────
// Devuelve el estado actual de la partida.
export const getGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const game = await prisma.azulGame.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    if (!game) return res.status(404).json({ success: false, message: 'Partida no encontrada' });

    // Partidas en WAITING son visibles por cualquier miembro (para poder unirse)
    // Partidas ACTIVE o FINISHED solo las ven los participantes
    const isParticipant = game.player1Id === userId || game.player2Id === userId;
    if (game.status !== 'WAITING' && !isParticipant) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a esta partida' });
    }

    return res.json({ success: true, data: game });
  } catch (error) {
    console.error('[AZUL] Error al obtener partida:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la partida' });
  }
};

// ─── GET /api/azul/games ──────────────────────────────────────────────────────
// Lista las partidas del usuario autenticado.
export const listGames = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const games = await prisma.azulGame.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: games });
  } catch (error) {
    console.error('[AZUL] Error al listar partidas:', error);
    return res.status(500).json({ success: false, message: 'Error al listar las partidas' });
  }
};

// ─── PATCH /api/azul/games/:id/move ──────────────────────────────────────────
// Valida el movimiento con el Engine, actualiza el JSONB y devuelve el nuevo estado.
export const makeMove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const move = req.body as MovePayload;

    // Validación básica del payload
    if (!move.source || !move.color || move.patternLineIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Payload de movimiento incompleto' });
    }

    const game = await prisma.azulGame.findUnique({ where: { id } });
    if (!game) return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    if (game.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'La partida no está activa' });
    }
    if (game.currentTurn !== userId) {
      return res.status(400).json({ success: false, message: 'No es tu turno' });
    }

    const currentState = game.gameState as unknown as GameState;

    // Determinar el índice del jugador
    const playerIndex = currentState.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) {
      return res.status(403).json({ success: false, message: 'No eres jugador de esta partida' });
    }

    // Aplicar el movimiento mediante el Engine (lógica pura, sin DB)
    const result = applyMove(currentState, playerIndex, move);
    if (!result.success || !result.newState) {
      return res.status(422).json({ success: false, message: result.error ?? 'Movimiento inválido' });
    }

    const newState = result.newState;
    const gameFinished = result.gameOver ?? isGameOver(newState);

    // Determinar siguiente turno
    const nextTurnUserId = gameFinished
      ? null
      : (newState.players[newState.turnIndex]?.id ?? null);

    // Determinar ganador si la partida terminó
    let winnerId: string | null = null;
    if (gameFinished) {
      const winnerIdx = result.winnerIndex ?? getWinnerIndex(newState);
      winnerId = winnerIdx >= 0 ? (newState.players[winnerIdx]?.id ?? null) : null;
    }

    // Persistir en PostgreSQL
    const updated = await prisma.azulGame.update({
      where: { id },
      data: {
        gameState: newState as object,
        currentTurn: nextTurnUserId,
        status: gameFinished ? 'FINISHED' : 'ACTIVE',
        winnerId,
      },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    return res.json({
      success: true,
      data: updated,
      gameOver: gameFinished,
      winnerId,
    });
  } catch (error) {
    console.error('[AZUL] Error al aplicar movimiento:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar el movimiento' });
  }
};
