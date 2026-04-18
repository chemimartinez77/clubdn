// client/src/workers/azulMCTS.worker.ts
import { runMCTS } from '../logic/AzulMCTS';
import type { GameState, MovePayload } from '../logic/AzulEngine';

interface WorkerInput {
  state: GameState;
  aiPlayerIndex: number;
  timeLimitMs?: number;
}

interface WorkerOutput {
  move: MovePayload;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { state, aiPlayerIndex, timeLimitMs = 1000 } = e.data;
  const move = runMCTS(state, aiPlayerIndex, timeLimitMs);
  self.postMessage({ move } satisfies WorkerOutput);
};
