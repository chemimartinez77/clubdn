// client/src/pages/WeeklyPreview.tsx
import { useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { api } from '../api/axios';
import type { Event, EventsResponse } from '../types/event';
import type { ApiResponse } from '../types/auth';

const HOUR_HEIGHT = 56; // px por hora
const START_HOUR = 9;
const END_HOUR = 28; // 28 = 4:00 AM del día siguiente
const TOTAL_HOURS = END_HOUR - START_HOUR;
const CLOSED_GAP_HOURS = 2; // mínimo de horas libres al inicio para mostrar "Club cerrado"

const DAY_NAMES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PARTIDA: { bg: '#7c3aed', border: '#6d28d9', text: '#ffffff' },
  TORNEO:  { bg: '#b91c1c', border: '#991b1b', text: '#ffffff' },
  OTROS:   { bg: '#0369a1', border: '#075985', text: '#ffffff' },
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

interface EventBlock {
  event: Event;
  startMinutes: number; // minutos desde START_HOUR
  durationMinutes: number;
  column: number;
  totalColumns: number;
}

function layoutEventsForDay(events: Event[]): EventBlock[] {
  const sorted = [...events].sort((a, b) => {
    const aStart = (a.startHour ?? 0) * 60 + (a.startMinute ?? 0);
    const bStart = (b.startHour ?? 0) * 60 + (b.startMinute ?? 0);
    return aStart - bStart;
  });

  const blocks: EventBlock[] = sorted.map(event => ({
    event,
    startMinutes: ((event.startHour ?? 10) - START_HOUR) * 60 + (event.startMinute ?? 0),
    durationMinutes: (event.durationHours ?? 2) * 60 + (event.durationMinutes ?? 0),
    column: 0,
    totalColumns: 1,
  }));

  for (let i = 0; i < blocks.length; i++) {
    const usedCols = new Set<number>();
    for (let j = 0; j < i; j++) {
      const aEnd = blocks[j].startMinutes + blocks[j].durationMinutes;
      const overlap = blocks[i].startMinutes < aEnd;
      if (overlap) usedCols.add(blocks[j].column);
    }
    let col = 0;
    while (usedCols.has(col)) col++;
    blocks[i].column = col;
  }

  // Calcular totalColumns por grupo de solapamiento real
  // Para cada bloque, buscar cuántos se solapan simultáneamente con él
  for (let i = 0; i < blocks.length; i++) {
    let maxConcurrent = 1;
    for (let j = 0; j < blocks.length; j++) {
      if (i === j) continue;
      const iEnd = blocks[i].startMinutes + blocks[i].durationMinutes;
      const jEnd = blocks[j].startMinutes + blocks[j].durationMinutes;
      const overlap = blocks[i].startMinutes < jEnd && blocks[j].startMinutes < iEnd;
      if (overlap) maxConcurrent = Math.max(maxConcurrent, blocks[j].column + 1);
    }
    blocks[i].totalColumns = Math.max(blocks[i].column + 1, maxConcurrent);
  }

  return blocks;
}

function getTimeStr(event: Event, durationMinutes: number): string {
  const startH = event.startHour ?? 0;
  const startM = event.startMinute ?? 0;
  const endTotalMin = startH * 60 + startM + durationMinutes;
  const endH = Math.floor(endTotalMin / 60);
  const endM = endTotalMin % 60;
  return `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} – ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function EventBlockView({ block }: { block: EventBlock }) {
  const { event, startMinutes, durationMinutes, column, totalColumns } = block;
  const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS.OTROS;

  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
  const widthPct = 100 / totalColumns;
  const leftPct = column * widthPct;
  const timeStr = getTimeStr(event, durationMinutes);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        left: `${leftPct + 0.5}%`,
        width: `${widthPct - 1}%`,
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '4px',
        padding: '3px 4px',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontSize: '11px',
        lineHeight: 1.2,
      }}
    >
      <div style={{ fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {event.title}
      </div>
      {height >= 32 && (
        <div style={{ opacity: 0.85, fontSize: '10px', marginTop: '1px' }}>{timeStr}</div>
      )}
      {height >= 48 && event.gameName && (
        <div style={{ opacity: 0.75, fontSize: '10px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.gameName}
        </div>
      )}
    </div>
  );
}

// Bloque "Club cerrado" que ocupa las horas vacías al inicio del día
function ClosedBlock({ hoursUntilFirst }: { hoursUntilFirst: number }) {
  const height = hoursUntilFirst * HOUR_HEIGHT;
  const startLabel = `${String(START_HOUR).padStart(2, '0')}:00`;
  const endH = START_HOUR + hoursUntilFirst;
  const endLabel = `${String(endH).padStart(2, '0')}:00`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '1%',
        width: '98%',
        height: `${height}px`,
        backgroundColor: 'rgba(15, 15, 30, 0.7)',
        border: '1px dashed #3d3d5c',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ color: '#4a4a6a', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Club cerrado
      </div>
      {height >= 40 && (
        <div style={{ color: '#3d3d5c', fontSize: '9px', marginTop: '2px' }}>
          {startLabel} – {endLabel}
        </div>
      )}
    </div>
  );
}

// Sección de índice de eventos truncados (los que tienen totalColumns >= 2)
function TruncatedIndex({ allBlocks }: { allBlocks: { day: Date; blocks: EventBlock[] }[] }) {
  // Recoger todos los eventos de la semana
  const truncated: { day: Date; block: EventBlock }[] = [];
  for (const { day, blocks } of allBlocks) {
    for (const block of blocks) {
      truncated.push({ day, block });
    }
  }

  if (truncated.length === 0) return null;

  // Agrupar por día
  const byDay: Map<string, { day: Date; blocks: EventBlock[] }> = new Map();
  for (const { day, block } of truncated) {
    const key = day.toDateString();
    if (!byDay.has(key)) byDay.set(key, { day, blocks: [] });
    byDay.get(key)!.blocks.push(block);
  }

  return (
    <div
      style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #2d2d44',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        Detalle de eventos
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Array.from(byDay.values()).map(({ day, blocks }) => (
          <div key={day.toDateString()} style={{ minWidth: '140px' }}>
            <div style={{ color: '#c084fc', fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'capitalize' }}>
              {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' }).format(day)}
            </div>
            {blocks.map(block => {
              const colors = EVENT_COLORS[block.event.type] ?? EVENT_COLORS.OTROS;
              const timeStr = getTimeStr(block.event, block.durationMinutes);
              return (
                <div
                  key={block.event.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '4px' }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: colors.bg, flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: 600, lineHeight: 1.2 }}>
                      {block.event.title}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '9px' }}>{timeStr}</div>
                    {block.event.gameName && (
                      <div style={{ color: '#64748b', fontSize: '9px' }}>{block.event.gameName}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyPreview() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'done' | 'error'>('idle');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const previewRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => {
    const base = getWeekStart(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const weekLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const start = new Intl.DateTimeFormat('es-ES', opts).format(weekStart);
    const end = new Intl.DateTimeFormat('es-ES', { ...opts, year: 'numeric' }).format(weekEnd);
    return `${start} – ${end}`;
  }, [weekStart, weekEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ['events-weekly-preview', weekStart.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        limit: '200',
      });
      const res = await api.get<ApiResponse<EventsResponse>>(`/api/events?${params}`);
      return res.data.data;
    },
  });

  const events = (data?.events ?? []).filter(e => e.status !== 'CANCELLED');

  const eventsByDay = useMemo(() => {
    return weekDays.map(day => {
      const key = day.toDateString();
      return events.filter(e => new Date(e.date).toDateString() === key);
    });
  }, [events, weekDays]);

  // Calcular bloques de layout para cada día (para la leyenda de truncados)
  const allDayBlocks = useMemo(() => {
    return weekDays.map((day, i) => ({
      day,
      blocks: layoutEventsForDay(eventsByDay[i]),
    }));
  }, [weekDays, eventsByDay]);

  // Horas libres al inicio de cada día (para "Club cerrado")
  const closedHoursPerDay = useMemo(() => {
    return eventsByDay.map(dayEvents => {
      if (dayEvents.length === 0) return TOTAL_HOURS; // sin eventos → todo el día cerrado
      const firstEventHour = Math.min(
        ...dayEvents.map(e => e.startHour ?? START_HOUR)
      );
      const gapHours = firstEventHour - START_HOUR;
      return gapHours >= CLOSED_GAP_HOURS ? gapHours : 0;
    });
  }, [eventsByDay]);

  async function captureImage(): Promise<string> {
    if (!previewRef.current) throw new Error('No ref');
    return toPng(previewRef.current, {
      pixelRatio: 2,
      backgroundColor: '#1a1a2e',
    });
  }

  async function handleDownload() {
    setDownloadStatus('downloading');
    try {
      const dataUrl = await captureImage();
      const link = document.createElement('a');
      link.download = `preview-semanal-${weekStart.toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadStatus('done');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    } catch {
      setDownloadStatus('idle');
    }
  }

  async function handleCopy() {
    setCopyStatus('copying');
    try {
      const dataUrl = await captureImage();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopyStatus('done');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Preview semanal</h1>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="px-3 py-1.5 rounded border border-[var(--color-cardBorder)] text-sm hover:bg-[var(--color-hover)] text-[var(--color-text)]"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded border border-[var(--color-cardBorder)] text-sm hover:bg-[var(--color-hover)] text-[var(--color-text)]"
            >
              Esta semana
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="px-3 py-1.5 rounded border border-[var(--color-cardBorder)] text-sm hover:bg-[var(--color-hover)] text-[var(--color-text)]"
            >
              Siguiente →
            </button>
            <Button onClick={handleDownload} disabled={isLoading || downloadStatus === 'downloading'} variant="secondary" size="sm">
              {downloadStatus === 'downloading' ? 'Generando...' : downloadStatus === 'done' ? 'Descargado' : 'Descargar PNG'}
            </Button>
            <Button onClick={handleCopy} disabled={isLoading || copyStatus === 'copying'} size="sm">
              {copyStatus === 'copying' ? 'Copiando...' : copyStatus === 'done' ? 'Copiado!' : copyStatus === 'error' ? 'Error (prueba descargar)' : 'Copiar al portapapeles'}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
          </div>
        )}

        {!isLoading && (
          <div
            ref={previewRef}
            style={{
              backgroundColor: '#1a1a2e',
              borderRadius: '12px',
              padding: '20px 16px 16px',
              fontFamily: 'system-ui, sans-serif',
              minWidth: '640px',
            }}
          >
            {/* Título */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#c084fc', fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Club Dreadnought
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '13px', marginTop: '2px' }}>
                Previsión semanal · {weekLabel}
              </div>
            </div>

            {/* Grid principal */}
            <div style={{ display: 'flex', gap: '0' }}>
              {/* Columna de horas */}
              <div style={{ width: '44px', flexShrink: 0, paddingTop: '36px' }}>
                {hours.map(h => (
                  <div
                    key={h}
                    style={{
                      height: `${HOUR_HEIGHT}px`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      paddingTop: '2px',
                      color: '#94a3b8',
                      fontSize: '10px',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                    }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Columnas de días */}
              {weekDays.map((day, i) => {
                const blocks = allDayBlocks[i].blocks;
                const isToday = day.toDateString() === new Date().toDateString();
                const closedHours = closedHoursPerDay[i];
                return (
                  <div key={i} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #2d2d44' }}>
                    {/* Header del día */}
                    <div style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid #2d2d44' }}>
                      <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {DAY_NAMES[i]}
                      </div>
                      <div
                        style={{
                          color: isToday ? '#c084fc' : '#e2e8f0',
                          fontWeight: isToday ? 700 : 500,
                          fontSize: '15px',
                          width: '26px',
                          height: '26px',
                          lineHeight: '26px',
                          borderRadius: '50%',
                          background: isToday ? 'rgba(192,132,252,0.15)' : 'transparent',
                          margin: '2px auto 0',
                          textAlign: 'center',
                        }}
                      >
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ position: 'relative', height: `${totalHeight}px` }}>
                      {/* Líneas de hora */}
                      {hours.map(h => (
                        <div
                          key={h}
                          style={{
                            position: 'absolute',
                            top: `${(h - START_HOUR) * HOUR_HEIGHT}px`,
                            left: 0,
                            right: 0,
                            borderTop: '1px solid #2d2d44',
                          }}
                        />
                      ))}
                      {/* Bloque "Club cerrado" */}
                      {closedHours > 0 && (
                        <ClosedBlock hoursUntilFirst={closedHours} />
                      )}
                      {/* Bloques de eventos */}
                      {blocks.map(block => (
                        <EventBlockView key={block.event.id} block={block} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leyenda de tipos */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2d2d44' }}>
              {Object.entries(EVENT_COLORS).map(([type, colors]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: colors.bg }} />
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {type === 'PARTIDA' ? 'Partida' : type === 'TORNEO' ? 'Torneo' : 'Evento'}
                  </span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', color: '#4a4a6a', fontSize: '10px' }}>
                clubdreadnought.com
              </div>
            </div>

            {/* Índice de partidas simultáneas (solo si hay) */}
            <TruncatedIndex allBlocks={allDayBlocks} />
          </div>
        )}
      </div>
    </Layout>
  );
}
