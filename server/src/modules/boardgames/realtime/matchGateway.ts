import type { Response } from 'express';

type MatchEventName =
  | 'match:state'
  | 'match:player-joined'
  | 'match:player-left'
  | 'match:started'
  | 'match:move-applied'
  | 'match:finished'
  | 'match:restarted'
  | 'match:error';

interface MatchStreamClient {
  userId: string;
  response: Response;
  heartbeat: NodeJS.Timeout;
}

class MatchGateway {
  private readonly clients = new Map<string, Set<MatchStreamClient>>();

  subscribe(matchId: string, userId: string, response: Response): void {
    const client: MatchStreamClient = {
      userId,
      response,
      heartbeat: setInterval(() => {
        // Si la conexión ya está muerta pero 'close' no llegó a dispararse
        // (típico detrás del proxy de Railway), el write falla y purgamos el
        // cliente aquí para que no quede colgado acumulando memoria.
        this.safeWrite(matchId, client, ': keep-alive\n\n');
      }, 25000),
    };

    const bucket = this.clients.get(matchId) ?? new Set<MatchStreamClient>();
    bucket.add(client);
    this.clients.set(matchId, bucket);

    const cleanup = () => this.unsubscribe(matchId, client);
    response.on('close', cleanup);
    response.on('error', cleanup);
    response.on('aborted', cleanup);
  }

  /** Escribe en la respuesta; si falla (socket cerrado), purga el cliente. */
  private safeWrite(matchId: string, client: MatchStreamClient, chunk: string): boolean {
    try {
      if (client.response.writableEnded || client.response.destroyed) {
        this.unsubscribe(matchId, client);
        return false;
      }
      client.response.write(chunk);
      return true;
    } catch {
      this.unsubscribe(matchId, client);
      return false;
    }
  }

  async publish(
    matchId: string,
    event: MatchEventName,
    buildPayload: (userId: string) => Promise<unknown> | unknown
  ): Promise<void> {
    const bucket = this.clients.get(matchId);
    if (!bucket || bucket.size === 0) {
      return;
    }

    // Copia para poder purgar clientes muertos mientras iteramos.
    for (const client of [...bucket]) {
      try {
        const payload = await buildPayload(client.userId);
        this.safeWrite(matchId, client, `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        this.safeWrite(
          matchId,
          client,
          `event: match:error\ndata: ${JSON.stringify({ message: 'No se pudo actualizar el estado en tiempo real' })}\n\n`
        );
        console.error('[MULTIPLAYER][SSE] Error al publicar evento:', error);
      }
    }
  }

  publishError(matchId: string, message: string): void {
    void this.publish(matchId, 'match:error', () => ({ message }));
  }

  private unsubscribe(matchId: string, client: MatchStreamClient): void {
    clearInterval(client.heartbeat);

    const bucket = this.clients.get(matchId);
    if (!bucket) {
      return;
    }

    bucket.delete(client);
    if (bucket.size === 0) {
      this.clients.delete(matchId);
    }
  }
}

export const matchGateway = new MatchGateway();
