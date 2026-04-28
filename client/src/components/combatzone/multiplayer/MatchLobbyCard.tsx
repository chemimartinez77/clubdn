import type { MultiplayerMatch } from '../../../types/multiplayer';

function formatRelativeLabel(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function getStatusBadge(match: MultiplayerMatch) {
  switch (match.status) {
    case 'LOBBY':
      return 'bg-amber-100 text-amber-800';
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800';
    case 'FINISHED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-rose-100 text-rose-700';
  }
}

export default function MatchLobbyCard({
  match,
  onOpen,
}: {
  match: MultiplayerMatch;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[28px] border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-5 text-left shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">{match.gameTitle}</p>
          <h3 className="mt-1 text-xl font-black text-[var(--color-text)]">{match.gameDescription}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(match)}`}>
          {match.status === 'LOBBY' ? 'Lobby' : match.status === 'ACTIVE' ? 'En juego' : match.status === 'FINISHED' ? 'Finalizada' : 'Abandonada'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {match.players.map((player) => (
          <span
            key={player.userId}
            className="rounded-full border border-[var(--color-cardBorder)] bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--color-text)]"
          >
            {player.nick || player.name}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-[var(--color-textSecondary)]">
        <span>{match.currentPlayers}/{match.maxPlayers} plazas ocupadas</span>
        <span>{formatRelativeLabel(match.updatedAt)}</span>
      </div>
    </button>
  );
}
