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

// ─── Tipos internos ───────────────────────────────────────────────────────────

type AzulGameRaw = {
  id: string;
  player1Id: string;
  player2Id: string | null;
  player3Id: string | null;
  player4Id: string | null;
  maxPlayers: number;
  gameState: object;
  currentTurn: string | null;
  status: string;
  winnerId: string | null;
};

type PlayerSlot = 'player2Id' | 'player3Id' | 'player4Id';

// ─── Helpers privados ─────────────────────────────────────────────────────────

/** Devuelve los IDs de todos los jugadores confirmados, en orden de slot. */
function getFilledSlots(game: AzulGameRaw): string[] {
  return [game.player1Id, game.player2Id, game.player3Id, game.player4Id].filter(
    (id): id is string => id !== null,
  );
}

/** Devuelve el nombre del próximo slot de jugador disponible, o null si la sala está llena. */
function getNextPlayerSlot(game: AzulGameRaw): PlayerSlot | null {
  if (!game.player2Id) return 'player2Id';
  if (!game.player3Id && game.maxPlayers >= 3) return 'player3Id';
  if (!game.player4Id && game.maxPlayers >= 4) return 'player4Id';
  return null;
}

/** Include estándar para devolver todos los jugadores con id y name. */
const playerInclude = {
  player1: { select: { id: true, name: true } },
  player2: { select: { id: true, name: true } },
  player3: { select: { id: true, name: true } },
  player4: { select: { id: true, name: true } },
} as const;

// ─── POST /api/azul/games ─────────────────────────────────────────────────────
// Crea una partida nueva. El creador es player1; el resto se une después.
export const createGame = async (req: Request, res: Response) => {
  try {
    const player1Id = req.user!.userId;

    const rawMax = req.body.maxPlayers;
    const maxPlayers: number = [2, 3, 4].includes(rawMax) ? (rawMax as number) : 2;

    // El motor no se inicializa hasta que todos los jugadores estén en la sala.
    // Guardamos un marcador mínimo para distinguir el estado pre-inicio.
    const placeholderState = { pending: true };

    const game = await prisma.azulGame.create({
      data: {
        player1Id,
        maxPlayers,
        gameState: placeholderState,
        currentTurn: null,
        status: 'WAITING',
      },
      include: playerInclude,
    });

    return res.status(201).json({ success: true, data: game });
  } catch (error) {
    console.error('[AZUL] Error al crear partida:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la partida' });
  }
};

// ─── POST /api/azul/games/:id/join ────────────────────────────────────────────
// Un jugador se une a una partida en estado WAITING.
// Si completa la sala (filledCount + 1 === maxPlayers), inicia el motor.
export const joinGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const joiningUserId = req.user!.userId;

    const game = await prisma.azulGame.findUnique({ where: { id } }) as AzulGameRaw | null;
    if (!game) return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    if (game.status !== 'WAITING') {
      return res.status(400).json({ success: false, message: 'La partida ya no está disponible' });
    }

    // Verificar que el usuario no está ya en la sala
    const filledSlots = getFilledSlots(game);
    if (filledSlots.includes(joiningUserId)) {
      return res.status(400).json({ success: false, message: 'Ya eres parte de esta partida' });
    }

    // Encontrar el siguiente slot libre
    const nextSlot = getNextPlayerSlot(game);
    if (!nextSlot) {
      return res.status(400).json({ success: false, message: 'La sala ya está completa' });
    }

    // Calcular cuántos jugadores habrá después de este join
    const filledAfter = filledSlots.length + 1;
    const isFull = filledAfter === game.maxPlayers;

    // Construir el data de update dinámicamente
    const updateData: Record<string, unknown> = { [nextSlot]: joiningUserId };

    if (isFull) {
      // Todos los jugadores presentes: inicializar el motor real
      // Los IDs deben ir en el orden de los slots: player1, player2, player3, player4
      const slot2 = nextSlot === 'player2Id' ? joiningUserId : game.player2Id;
      const slot3 = nextSlot === 'player3Id' ? joiningUserId : game.player3Id;
      const slot4 = nextSlot === 'player4Id' ? joiningUserId : game.player4Id;
      const orderedIds = [game.player1Id, slot2, slot3, slot4].filter(
        (id): id is string => id !== null,
      );

      const freshState = createInitialState(...orderedIds);
      updateData.gameState = freshState as object;
      updateData.currentTurn = freshState.players[freshState.turnIndex]?.id ?? game.player1Id;
      updateData.status = 'ACTIVE';
    }
    // Si no está completa, solo se ocupa el slot; status sigue WAITING

    const updated = await prisma.azulGame.update({
      where: { id },
      data: updateData,
      include: playerInclude,
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
      include: playerInclude,
    }) as (AzulGameRaw & { player1: { id: string; name: string }; player2: { id: string; name: string } | null; player3: { id: string; name: string } | null; player4: { id: string; name: string } | null }) | null;

    if (!game) return res.status(404).json({ success: false, message: 'Partida no encontrada' });

    // Partidas en WAITING son visibles por cualquier miembro (para poder unirse)
    // Partidas ACTIVE o FINISHED solo las ven los participantes
    const isParticipant = [game.player1Id, game.player2Id, game.player3Id, game.player4Id].includes(userId);
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
        OR: [
          { player1Id: userId },
          { player2Id: userId },
          { player3Id: userId },
          { player4Id: userId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: playerInclude,
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

    const game = await prisma.azulGame.findUnique({ where: { id } }) as AzulGameRaw | null;
    if (!game) return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    if (game.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'La partida no está activa' });
    }
    if (game.currentTurn !== userId) {
      return res.status(400).json({ success: false, message: 'No es tu turno' });
    }

    const currentState = game.gameState as unknown as GameState;

    // Guarda contra estado pendiente (partida en lobby, no iniciada)
    if ((currentState as { pending?: boolean }).pending) {
      return res.status(400).json({ success: false, message: 'La partida aún no ha comenzado' });
    }

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
      include: playerInclude,
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
