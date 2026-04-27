// client/src/pages/viernes/ViernesHub.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViernesGameList } from '../../hooks/useViernesGame';
import type { Difficulty, ViernesGame } from '../../hooks/useViernesGame';

const DIFFICULTY_INFO: Record<Difficulty, { label: string; color: string; life: number; description: string }> = {
  1: { label: 'Verde', color: 'bg-green-500', life: 20, description: 'Base del reglamento' },
  2: { label: 'Amarilla', color: 'bg-yellow-400', life: 20, description: '1 envejecimiento inicial' },
  3: { label: 'Naranja', color: 'bg-orange-400', life: 20, description: 'Incluye Muy Estupido' },
  4: { label: 'Roja', color: 'bg-red-500', life: 18, description: 'Menos vida al empezar' },
};

const PHASE_LABEL: Record<string, string> = {
  HAZARD_CHOOSE: 'Eligiendo peligro',
  HAZARD_FIGHT: 'En combate',
  HAZARD_DEFEAT: 'Tras perder',
  PIRATE_CHOOSE: 'Eligiendo pirata',
  PIRATE_FIGHT: 'Combate pirata',
  FINISHED: 'Terminada',
};

function GameCard({ game, onClick }: { game: ViernesGame; onClick: () => void }) {
  const diff = DIFFICULTY_INFO[game.difficulty];
  const gs = game.gameState;
  const pct = gs ? (gs.lifePoints / gs.maxLifePoints) * 100 : 100;
  const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500';
  const statusLabel = game.status === 'FINISHED'
    ? game.won ? 'Victoria' : 'Derrota'
    : PHASE_LABEL[gs?.phase ?? ''] ?? 'Activa';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]
                 p-4 hover:border-[var(--color-primary)] hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-[var(--color-text)]">{statusLabel}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {new Date(game.updatedAt).toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${diff.color}`}>
          {diff.label}
        </span>
      </div>

      {gs && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--color-text-muted)]">Vida</span>
            <span className="text-sm font-bold text-[var(--color-text)]">{gs.lifePoints}/{gs.maxLifePoints}</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full mb-2">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(0, pct)}%` }} />
          </div>
          <div className="flex gap-3 text-xs text-[var(--color-text-muted)]">
            <span>Paso: {gs.step}</span>
            <span>Mazo: {gs.robinsonDeck.length}</span>
          </div>
        </>
      )}

      <div className={`mt-2 text-xs font-semibold text-right ${
        game.status === 'ACTIVE' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
      }`}>
        {game.status === 'ACTIVE' ? 'Continuar ->' : 'Ver resultado'}
      </div>
    </div>
  );
}

export default function ViernesHub() {
  const navigate = useNavigate();
  const { games, isLoading, createGame, isCreating } = useViernesGameList();
  const [showNewGame, setShowNewGame] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(2);

  const activeGames = games.filter((game) => game.status === 'ACTIVE');
  const finishedGames = games.filter((game) => game.status === 'FINISHED');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/combatzone')}
          className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
        >
          {'<-'} Combat Zone
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text)]">Viernes</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Friedemann Friese · Solitario · Construccion de mazo
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
          Ayuda a Robinson Crusoe a mejorar su mazo y derrotar a los dos piratas finales.
        </p>
      </div>

      {!showNewGame ? (
        <button
          onClick={() => setShowNewGame(true)}
          className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold text-base
                     hover:opacity-90 transition-all mb-6"
        >
          + Nueva partida
        </button>
      ) : (
        <div className="p-5 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] mb-6">
          <h2 className="text-base font-bold text-[var(--color-text)] mb-4">Elige la dificultad:</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {([1, 2, 3, 4] as Difficulty[]).map((difficulty) => {
              const info = DIFFICULTY_INFO[difficulty];
              const isSelected = selectedDiff === difficulty;

              return (
                <button
                  key={difficulty}
                  onClick={() => setSelectedDiff(difficulty)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full ${info.color}`} />
                    <span className="text-sm font-bold text-[var(--color-text)]">{info.label}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{info.description}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-1">
                    {info.life} puntos de vida iniciales
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewGame(false)}
              className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] text-sm hover:bg-[var(--color-border)]/30 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => createGame(selectedDiff)}
              disabled={isCreating}
              className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold text-sm
                         hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isCreating ? 'Creando...' : 'Empezar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      ) : (
        <>
          {activeGames.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Partidas activas
              </h2>
              <div className="flex flex-col gap-3">
                {activeGames.map((game) => (
                  <GameCard key={game.id} game={game} onClick={() => navigate(`/combatzone/viernes/${game.id}`)} />
                ))}
              </div>
            </section>
          )}

          {finishedGames.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Partidas terminadas
              </h2>
              <div className="flex flex-col gap-3">
                {finishedGames.slice(0, 5).map((game) => (
                  <GameCard key={game.id} game={game} onClick={() => navigate(`/combatzone/viernes/${game.id}`)} />
                ))}
              </div>
            </section>
          )}

          {games.length === 0 && (
            <div className="text-center py-10 text-[var(--color-text-muted)]">
              <p>No tienes partidas. Crea una nueva para empezar.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
