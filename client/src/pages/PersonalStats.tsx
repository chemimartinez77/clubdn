import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { GameImage } from '../components/events/EventCard';
import { api } from '../api/axios';
import type {
  DetailedMonthStat,
  DetailedPlayerStat,
  DetailedTimeRange,
  DetailedYearStat,
  TopDay,
  UserDetailedStats,
  UserDetailedStatsResponse,
} from '../types/stats';
import type { PublicConfig } from '../types/config';

const formatDate = (value: string) => (
  new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const polarPoint = (index: number, total: number, radius: number, center = 90) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
};

const buildMonthlySeries = (months: DetailedMonthStat[]) => {
  if (months.length === 0) return [];

  const first = months[0]!;
  const last = months[months.length - 1]!;
  const counts = new Map(months.map(month => [month.key, month.count]));
  const series: DetailedMonthStat[] = [];
  let year = first.year;
  let month = first.month;

  while (year < last.year || (year === last.year && month <= last.month)) {
    const key = `${year}-${`${month}`.padStart(2, '0')}`;
    series.push({
      key,
      year,
      month,
      label: `${MONTH_SHORT[month - 1]} ${year}`,
      count: counts.get(key) ?? 0,
    });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return series;
};

const getBestMonth = (months: DetailedMonthStat[]) => {
  const series = buildMonthlySeries(months);
  let bestMonth: DetailedMonthStat | null = null;

  for (const month of series) {
    if (!bestMonth || month.count > bestMonth.count) bestMonth = month;
  }

  return bestMonth;
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
    return <p className="text-sm text-[var(--color-textSecondary)]">Todavía no hay partidas completadas.</p>;
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

function CumulativeLineChart({ months }: { months: DetailedMonthStat[] }) {
  const series = useMemo(() => buildMonthlySeries(months), [months]);
  const { cumulative, max, total } = useMemo(() => {
    const cum = series.reduce<({ count: number; total: number } & (typeof series)[number])[]>((acc, month) => {
      const prev = acc.at(-1)?.total ?? 0;
      return [...acc, { ...month, total: prev + month.count }];
    }, []);
    const finalTotal = cum.at(-1)?.total ?? 0;
    return { cumulative: cum, max: Math.max(1, finalTotal), total: finalTotal };
  }, [series]);
  const width = 720;
  const height = 220;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const points = cumulative.map((month, index) => {
    const x = padding + (cumulative.length <= 1 ? chartWidth : (index / (cumulative.length - 1)) * chartWidth);
    const y = padding + chartHeight - (month.total / max) * chartHeight;
    return { ...month, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  if (points.length === 0) {
    return <p className="text-sm text-[var(--color-textSecondary)]">Todavía no hay partidas completadas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[560px] w-full h-64">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-cardBorder)" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--color-cardBorder)" />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="4" fill="var(--color-primary)">
              <title>{`${point.label}: ${point.total} acumuladas`}</title>
            </circle>
            {(index === 0 || index === points.length - 1 || point.month === 1) && (
              <text x={point.x} y={height - 8} textAnchor="middle" className="fill-[var(--color-textSecondary)] text-[11px]">
                {point.key.slice(2)}
              </text>
            )}
          </g>
        ))}
        <text x={width - padding} y={padding - 8} textAnchor="end" className="fill-[var(--color-text)] text-sm font-semibold">
          {total} partidas
        </text>
      </svg>
    </div>
  );
}

function YearSmallMultiples({ months, years }: { months: DetailedMonthStat[]; years: DetailedYearStat[] }) {
  const counts = new Map(months.map(month => [month.key, month.count]));
  const max = Math.max(1, ...months.map(month => month.count));

  if (years.length === 0) {
    return <p className="text-sm text-[var(--color-textSecondary)]">Todavía no hay partidas completadas.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {years.map(year => (
        <div key={year.year} className="rounded-lg border border-[var(--color-cardBorder)] p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-[var(--color-text)]">{year.year}</span>
            <span className="text-sm text-[var(--color-textSecondary)]">{year.count} partidas</span>
          </div>
          <div className="grid grid-cols-12 gap-1 items-end h-24">
            {Array.from({ length: 12 }, (_, index) => {
              const month = index + 1;
              const key = `${year.year}-${`${month}`.padStart(2, '0')}`;
              const count = counts.get(key) ?? 0;
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div className="h-16 flex items-end">
                    <div
                      className={`w-full min-w-3 rounded-t ${count > 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-tableRowHover)]'}`}
                      style={{ height: `${count > 0 ? Math.max(6, (count / max) * 64) : 4}px` }}
                      title={`${MONTH_SHORT[index]}: ${count}`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--color-textSecondary)]">{MONTH_SHORT[index]?.charAt(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekdayRadar({ days }: { days: TopDay[] }) {
  const max = Math.max(1, ...days.map(day => day.count));
  const points = days.map((day, index) => {
    const radius = 18 + (day.count / max) * 66;
    return { ...day, ...polarPoint(index, days.length, radius) };
  });
  const polygon = points.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <div className="flex flex-col md:flex-row items-center gap-5">
      <svg viewBox="0 0 180 180" className="w-64 h-64 shrink-0">
        {[24, 46, 68, 90].map(radius => (
          <polygon
            key={radius}
            points={days.map((_, index) => {
              const point = polarPoint(index, days.length, radius);
              return `${point.x},${point.y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--color-cardBorder)"
          />
        ))}
        {days.map((day, index) => {
          const label = polarPoint(index, days.length, 78);
          return (
            <text key={day.day} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--color-textSecondary)] text-[10px]">
              {day.day.slice(0, 3)}
            </text>
          );
        })}
        <polygon points={polygon} fill="var(--color-primary)" fillOpacity="0.25" stroke="var(--color-primary)" strokeWidth="3" />
        {points.map(point => (
          <circle key={point.day} cx={point.x} cy={point.y} r="4" fill="var(--color-primary)">
            <title>{`${point.day}: ${point.count}`}</title>
          </circle>
        ))}
      </svg>
      <div className="space-y-2 w-full">
        {days.map(day => (
          <BarRow key={day.day} label={day.day} count={day.count} max={max} />
        ))}
      </div>
    </div>
  );
}

function TimeClockChart({ ranges }: { ranges: DetailedTimeRange[] }) {
  const knownRanges = ranges.filter(range => range.key !== 'unknown');
  const max = Math.max(1, ...knownRanges.map(range => range.count));
  const arcs = [
    { key: 'night', label: '0-8', start: 0, hours: 8 },
    { key: 'morning', label: '8-14', start: 8, hours: 6 },
    { key: 'afternoon', label: '14-20', start: 14, hours: 6 },
    { key: 'evening', label: '20-24', start: 20, hours: 4 },
  ] as const;
  const countFor = (key: DetailedTimeRange['key']) => ranges.find(range => range.key === key)?.count ?? 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-5">
      <svg viewBox="0 0 200 200" className="w-64 h-64 shrink-0">
        <circle cx="100" cy="100" r="78" fill="none" stroke="var(--color-cardBorder)" strokeWidth="2" />
        {arcs.map(arc => {
          const count = countFor(arc.key);
          const radius = 42 + (count / max) * 44;
          const start = ((arc.start / 24) * Math.PI * 2) - Math.PI / 2;
          const end = (((arc.start + arc.hours) / 24) * Math.PI * 2) - Math.PI / 2;
          const largeArc = arc.hours > 12 ? 1 : 0;
          const x1 = 100 + Math.cos(start) * radius;
          const y1 = 100 + Math.sin(start) * radius;
          const x2 = 100 + Math.cos(end) * radius;
          const y2 = 100 + Math.sin(end) * radius;
          const labelPoint = polarPoint(arc.start + arc.hours / 2, 24, 76, 100);
          return (
            <g key={arc.key}>
              <path
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={Math.max(8, 10 + (count / max) * 18)}
                strokeLinecap="round"
                opacity={count > 0 ? 0.9 : 0.18}
              >
                <title>{`${arc.label}: ${count}`}</title>
              </path>
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--color-text)] text-xs font-semibold">
                {arc.label}
              </text>
            </g>
          );
        })}
        <circle cx="100" cy="100" r="28" fill="var(--color-cardBackground)" stroke="var(--color-cardBorder)" />
        <text x="100" y="96" textAnchor="middle" className="fill-[var(--color-text)] text-sm font-bold">24h</text>
        <text x="100" y="112" textAnchor="middle" className="fill-[var(--color-textSecondary)] text-[10px]">inicio</text>
      </svg>
      <div className="space-y-3 w-full">
        {ranges.map(range => (
          <BarRow key={range.key} label={range.label} count={range.count} max={Math.max(max, range.count)} />
        ))}
      </div>
    </div>
  );
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function ActivityHeatmap({ activity }: { activity: DetailedMonthStat[] }) {
  const max = useMemo(() => Math.max(1, ...activity.map(m => m.count)), [activity]);

  const years = useMemo(() => {
    const set = new Set(activity.map(m => m.year));
    return Array.from(set).sort((a, b) => a - b);
  }, [activity]);

  const dataMap = useMemo(() =>
    new Map(activity.map(m => [`${m.year}-${m.month}`, m.count])),
    [activity]
  );

  const colorFor = (count: number) => {
    if (count === 0) return 'bg-[var(--color-tableRowHover)] text-transparent';
    if (count / max >= 0.75) return 'bg-[var(--color-primary)] text-white';
    if (count / max >= 0.5) return 'bg-sky-500 text-white';
    if (count / max >= 0.25) return 'bg-sky-300 text-sky-900';
    return 'bg-sky-100 text-sky-900';
  };

  if (years.length === 0) return (
    <p className="text-sm text-[var(--color-textSecondary)]">Sin datos de actividad.</p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 w-full">
        <thead>
          <tr>
            <th className="w-12" />
            {MONTH_LABELS.map(m => (
              <th key={m} className="text-xs font-normal text-[var(--color-textSecondary)] text-center pb-1">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map(year => (
            <tr key={year}>
              <td className="text-xs text-[var(--color-textSecondary)] pr-2 text-right align-middle">{year}</td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const count = dataMap.get(`${year}-${month}`) ?? 0;
                return (
                  <td key={month} className="p-0">
                    <div
                      className={`flex items-center justify-center rounded text-[11px] font-medium h-8 ${colorFor(count)}`}
                      title={`${MONTH_LABELS[month - 1]} ${year}: ${count} ${count === 1 ? 'partida' : 'partidas'}`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-textSecondary)]">
        <span>0</span>
        <span className="w-6 h-4 rounded bg-sky-100" />
        <span className="w-6 h-4 rounded bg-sky-300" />
        <span className="w-6 h-4 rounded bg-sky-500" />
        <span className="w-6 h-4 rounded bg-[var(--color-primary)]" />
        <span>{max}</span>
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
          <p className="text-xs text-[var(--color-textSecondary)]">Última partida: {formatDate(player.latestDate)}</p>
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

  const { data: publicConfig, isLoading: isLoadingPublicConfig } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PublicConfig }>('/api/config/public');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const { data, isLoading, isError } = useQuery<UserDetailedStats>({
    queryKey: ['userDetailedStats'],
    queryFn: async () => {
      const response = await api.get<UserDetailedStatsResponse>('/api/stats/user/detailed');
      return response.data.data;
    },
    enabled: publicConfig?.personalStatsEnabled !== false,
  });

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!data) return [];
    if (!query) return data.players;
    return data.players.filter(player => player.name.toLowerCase().includes(query));
  }, [data, playerSearch]);

  if (isLoadingPublicConfig || isLoading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
        </div>
      </Layout>
    );
  }

  if (publicConfig?.personalStatsEnabled === false) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card>
            <CardContent>
              <h1 className="text-xl font-semibold text-[var(--color-text)] mb-2">Estadísticas desactivadas</h1>
              <p className="text-[var(--color-textSecondary)]">La consulta de estadísticas personales está desactivada temporalmente por la administración del club.</p>
            </CardContent>
          </Card>
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
              <p className="text-red-600">No se pudieron cargar tus estadísticas.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const maxYear = Math.max(1, ...data.byYear.map(year => year.count));
  const maxDay = Math.max(1, ...data.dayOfWeek.map(day => day.count));
  const maxTimeRange = Math.max(1, ...data.timeRanges.map(range => range.count));
  const bestMonth = getBestMonth(data.byMonth);
  const currentMonthKey = toDateKey(new Date()).slice(0, 7);
  const currentMonthCount = data.byMonth.find(month => month.key === currentMonthKey)?.count ?? 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Mis estadísticas</h1>
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
          <StatTile label="Partidas organizadas" value={data.summary.organizedGames} />
          <StatTile label="Partidas como asistente" value={data.summary.joinedGames} />
          <StatTile label="Juegos distintos" value={data.summary.uniqueGames} />
          <StatTile label="Compañeros diferentes" value={data.summary.uniquePlayers} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Partidas este mes" value={currentMonthCount} />
          <StatTile label="Mes con más partidas" value={bestMonth ? `${bestMonth.count} (${bestMonth.label})` : '-'} />
          <StatTile label="Mejor racha semanal" value={data.weeklyStats.bestWeeklyStreak} />
          <StatTile label="Racha actual (semanas seguidas jugando)" value={data.weeklyStats.currentWeeklyStreak} />
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
              <h2 className="font-semibold text-[var(--color-text)]">Partidas por año</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.byYear.length > 0 ? data.byYear.map(year => (
                  <BarRow key={year.year} label={String(year.year)} count={year.count} max={maxYear} />
                )) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">Todavía no hay partidas completadas.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--color-text)]">Progreso acumulado</h2>
          </CardHeader>
          <CardContent>
            <CumulativeLineChart months={data.byMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--color-text)]">Meses por año</h2>
          </CardHeader>
          <CardContent>
            <YearSmallMultiples months={data.byMonth} years={data.byYear} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--color-text)]">Actividad del último año</h2>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap activity={data.byMonth} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Días de juego</h2>
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
              <h2 className="font-semibold text-[var(--color-text)]">Radar semanal</h2>
            </CardHeader>
            <CardContent>
              <WeekdayRadar days={data.dayOfWeek} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--color-text)]">Reloj de juego</h2>
            </CardHeader>
            <CardContent>
              <TimeClockChart ranges={data.timeRanges} />
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
                        <p className="text-xs text-[var(--color-textSecondary)]">Última partida: {formatDate(game.latestDate)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
                      {game.count}
                    </span>
                  </button>
                )) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">Todavía no hay juegos jugados.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <h2 className="font-semibold text-[var(--color-text)]">Partidas con compañeros diferentes</h2>
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
                  <p className="text-sm text-[var(--color-textSecondary)]">No hay compañeros para esa búsqueda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
