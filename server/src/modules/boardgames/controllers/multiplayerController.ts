import type { Request, Response } from 'express';
import { matchGateway } from '../realtime/matchGateway';
import { resolveAuthenticatedMatchUser } from '../services/matchAuthService';
import {
  MatchError,
  applyMoveToMatch,
  createMatch,
  getMatchSnapshot,
  joinMatch,
  leaveMatch,
  listGameCatalog,
  listMatchesForUser,
  startMatch,
} from '../services/matchService';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new MatchError('No autenticado', 401);
  }

  return userId;
}

function handleControllerError(error: unknown, res: Response, fallbackMessage: string): void {
  if (error instanceof MatchError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  console.error('[MULTIPLAYER] Error:', error);
  res.status(500).json({ success: false, message: fallbackMessage });
}

export async function listAvailableGames(_req: Request, res: Response): Promise<void> {
  try {
    const games = await listGameCatalog();
    res.json({ success: true, data: games });
  } catch (error) {
    handleControllerError(error, res, 'Error al listar juegos multijugador');
  }
}

export async function listMatches(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const matches = await listMatchesForUser({ userId });
    res.json({ success: true, data: matches });
  } catch (error) {
    handleControllerError(error, res, 'Error al listar partidas');
  }
}

export async function createMatchController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const snapshot = await createMatch({
      ownerUserId: userId,
      gameKey: req.body.gameKey,
      visibility: req.body.visibility,
      maxPlayers: req.body.maxPlayers,
    });

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    handleControllerError(error, res, 'Error al crear la partida');
  }
}

export async function getMatchController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const matchId = req.params.matchId!;
    const snapshot = await getMatchSnapshot(matchId, { userId });
    res.json({ success: true, data: snapshot });
  } catch (error) {
    handleControllerError(error, res, 'Error al obtener la partida');
  }
}

export async function joinMatchController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const matchId = req.params.matchId!;
    const snapshot = await joinMatch(matchId, { userId });
    void matchGateway.publish(matchId, 'match:player-joined', (viewerId) =>
      getMatchSnapshot(matchId, { userId: viewerId })
    );
    res.json({ success: true, data: snapshot });
  } catch (error) {
    handleControllerError(error, res, 'Error al unirse a la partida');
  }
}

export async function leaveMatchController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const matchId = req.params.matchId!;
    const snapshot = await leaveMatch(matchId, { userId });
    void matchGateway.publish(matchId, 'match:player-left', (viewerId) =>
      getMatchSnapshot(matchId, { userId: viewerId })
    );
    res.json({ success: true, data: snapshot });
  } catch (error) {
    handleControllerError(error, res, 'Error al salir de la partida');
  }
}

export async function startMatchController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const matchId = req.params.matchId!;
    const snapshot = await startMatch(matchId, { userId });
    void matchGateway.publish(matchId, 'match:started', (viewerId) =>
      getMatchSnapshot(matchId, { userId: viewerId })
    );
    res.json({ success: true, data: snapshot });
  } catch (error) {
    handleControllerError(error, res, 'Error al iniciar la partida');
  }
}

export async function moveMatchController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const matchId = req.params.matchId!;
    const snapshot = await applyMoveToMatch(matchId, { userId }, req.body);
    const eventName = snapshot.match.status === 'FINISHED' ? 'match:finished' : 'match:move-applied';
    void matchGateway.publish(matchId, eventName, (viewerId) =>
      getMatchSnapshot(matchId, { userId: viewerId })
    );
    res.json({ success: true, data: snapshot });
  } catch (error) {
    handleControllerError(error, res, 'Error al aplicar el movimiento');
  }
}

export async function streamMatchController(req: Request, res: Response): Promise<void> {
  try {
    const user = await resolveAuthenticatedMatchUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Token inválido o expirado' });
      return;
    }

    const matchId = req.params.matchId!;
    await getMatchSnapshot(matchId, { userId: user.userId });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    matchGateway.subscribe(matchId, user.userId, res);
    const initialSnapshot = await getMatchSnapshot(matchId, { userId: user.userId });
    res.write(`event: match:state\n`);
    res.write(`data: ${JSON.stringify(initialSnapshot)}\n\n`);
  } catch (error) {
    handleControllerError(error, res, 'Error al abrir el canal en tiempo real');
  }
}
