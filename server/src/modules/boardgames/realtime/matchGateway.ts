import type { Response } from 'express';

type MatchEventName =
  | 'match:state'
  | 'match:player-joined'
  | 'match:player-left'
  | 'match:started'
  | 'match:move-applied'
  | 'match:finished'
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
        response.write(': keep-alive\n\n');
      }, 25000),
    };

    const bucket = this.clients.get(matchId) ?? new Set<MatchStreamClient>();
    bucket.add(client);
    this.clients.set(matchId, bucket);

    response.on('close', () => {
      this.unsubscribe(matchId, client);
    });
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

    for (const client of bucket) {
      try {
        const payload = await buildPayload(client.userId);
        client.response.write(`event: ${event}\n`);
        client.response.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        client.response.write('event: match:error\n');
        client.response.write(`data: ${JSON.stringify({ message: 'No se pudo actualizar el estado en tiempo real' })}\n\n`);
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
