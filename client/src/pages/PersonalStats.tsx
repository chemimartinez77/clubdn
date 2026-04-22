import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { GameImage } from '../components/events/EventCard';
import { api } from '../api/axios';
import type {
  DetailedActivityDay,
  DetailedMonthStat,
  DetailedPlayerStat,
  UserDetailedStats,
  UserDetailedStatsResponse,
} from '../types/stats';

const formatDate = (value: string) => (
  new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-[var(--color-cardBorder)] rounded-lg p-4 bg-[var(--color-cardBackground)]">
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="text-sm text-[var(--color-textSecondary)] mt-1">{label}</p>
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.max(6, Math.round((count / max) * 100)) : 0;

  return (
    <div className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
      <span className="text-[var(--color-textSecondary)] truncate">{label}</span>
      <div className="h-3 rounded-full bg-[var(--color-tableRowHover)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-right font-semibold text-[var(--color-text)]">{count}</span>
    </div>
  );
}

function MonthChart({ months }: { months: DetailedMonthStat[] }) {
  const recentMonths = months.slice(-18);
  const max = Math.max(1, ...recentMonths.map(month => month.count));

  if (recentMonths.length === 0) {
    return <p className="text-sm text-[var(--color-textSecondary)]">Todavia no hay partidas completadas.</p>;
  }

  return (
    <div className="flex items-end gap-2 min-h-48 overflow-x-auto pb-2">
      {recentMonths.map(month => (
        <div key={month.key} className="min-w-12 flex flex-col items-center gap-2">
          <div className="h-36 flex items-end">
            <div
              className="w-8 rounded-t bg-[var(--color-primary)]"
              style={{ height: `${Math.max(8, (month.count / max) * 144)}px` }}
              title={`${month.label}: ${month.count}`}
            />
          </div>
          <span className="text-xs text-[var(--color-textSecondary)] -rotate-45 origin-top-left whitespace-nowrap">
            {month.key.slice(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityHeatmap({ activity }: { activity: DetailedActivityDay[] }) {
  const activityMap = useMemo(() => new Map(activity.map(day => [day.date, day.count])), [activity]);
  const max = Math.max(1, ...activity.map(day => day.count));
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  const cells = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    const count = activityMap.get(key) ?? 0;
    return { key, count };
  });

  const levelFor = (count: number) => {
    if (count === 0) return 'bg-[var(--color-tableRowHover)]';
    if (count >= max) return 'bg-[var(--color-primary)]';
    if (count / max >= 0.66) return 'bg-emerald-500';
    if (count / max >= 0.33) return 'bg-emerald-400';
    return 'bg-emerald-200';
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-1 w-max">
        {cells.map(cell => (
          <div
            key={cell.key}
            className={`w-3 h-3 rounded-sm ${levelFor(cell.count)}`}
            title={`${cell.key}: ${cell.count} ${cell.count === 1 ? 'partida' : 'partidas'}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-textSecondary)]">
        <span>Menos</span>
        <span className="w-3 h-3 rounded-sm bg-[var(--color-tableRowHover)]" />
        <span className="w-3 h-3 rounded-sm bg-emerald-200" />
        <span className="w-3 h-3 rounded-sm bg-emerald-400" />
        <span className="w-3 h-3 rounded-sm bg-emerald-500" />
        <span className="w-3 h-3 rounded-sm bg-[var(--color-primary)]" />
        <span>Mas</span>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: DetailedPlayerStat }) {
  return (
    <Link
      to={`/users/${player.userId}`}
      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-cardBorder)] hover:bg-[var(--color-tableRowHover)] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {player.avatar ? (
          <img src={player.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold shrink-0">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-[var(--color-text)] truncate">{player.name}</p>
          <p className="text-xs text-[var(--color-textSecondary)]">Ultima partida: {formatDate(player.latestDate)}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
        {player.count} {player.count === 1 ? 'partida' : 'partidas'}
      </span>
    </Link>
  );
}

export default function PersonalStats() {
  const navigate = useNavigate();
  const [playerSearch, setPlayerSearch] = useState('');

  const { data, isLoading, isError } = useQuery<UserDetailedStats>({
    queryKey: ['userDetailedStats'],
    queryFn: async () => {
      const response = await api.get<UserDetailedStatsResponse>('/api/stats/user/detailed');
      return response.data.data;
    },
  });

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!data) return [];
    if (!query) return data.players;
    return data.players.filter(player => player.name.toLowerCase().includes(query));
  }, [data, playerSearch]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card>
            <CardContent>
              <p className="text-red-600">No se pudieron cargar tus estadisticas.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const maxYear = Math.max(1, ...data.byYear.map(year => year.count));
  const maxDay = Math.max(1, ...data.dayOfWeek.map(day => day.count));
  const maxTimeRange = Math.max(1, ...data.timeRanges.map(range => range.count));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Mis estadisticas</h1>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">
              Historial personal de partidas completadas en el club.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile label="Partidas jugadas" value={data.summary.gamesPlayed} />
          <StatTile label="Como creador" value={data.summary.organizedGames} />
          <StatTile label="De otros" value={data.summary.joinedGames} />
          <StatTile label="Juegos distintos" value={data.summary.uniqueGames} />
          <StatTile label="Companeros" value={data.summary.uniquePlayers} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Partidas por mes</h2>
            </CardHeader>
            <CardContent>
              <MonthChart months={data.byMonth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Partidas por ano</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.byYear.length > 0 ? data.byYear.map(year => (
                  <BarRow key={year.year} label={String(year.year)} count={year.count} max={maxYear} />
                )) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">Todavia no hay partidas completadas.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--color-text)]">Actividad del ultimo ano</h2>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap activity={data.activityByDate} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Dias de juego</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.dayOfWeek.map(day => (
                  <BarRow key={day.day} label={day.day} count={day.count} max={maxDay} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Horario de juego</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.timeRanges.map(range => (
                  <BarRow key={range.key} label={range.label} count={range.count} max={maxTimeRange} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Partidas por juego</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[32rem] overflow-auto pr-1">
                {data.games.length > 0 ? data.games.map(game => (
                  <button
                    key={game.name}
                    type="button"
                    onClick={() => navigate(`/events/${game.latestEventId}`)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-cardBorder)] hover:bg-[var(--color-tableRowHover)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GameImage src={game.image} alt={game.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text)] truncate">{game.name}</p>
                        <p className="text-xs text-[var(--color-textSecondary)]">Ultima partida: {formatDate(game.latestDate)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
                      {game.count}
                    </span>
                  </button>
                )) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">Todavia no hay juegos jugados.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <h2 className="font-semibold text-[var(--color-text)]">Partidas con otras personas</h2>
                <input
                  type="search"
                  value={playerSearch}
                  onChange={(event) => setPlayerSearch(event.target.value)}
                  placeholder="Buscar persona..."
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[32rem] overflow-auto pr-1">
                {filteredPlayers.length > 0 ? filteredPlayers.map(player => (
                  <PlayerRow key={player.userId} player={player} />
                )) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">No hay companeros para esa busqueda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
