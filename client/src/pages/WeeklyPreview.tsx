// client/src/pages/WeeklyPreview.tsx
import { useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { api } from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import type { Event, EventsResponse } from '../types/event';
import type { ApiResponse } from '../types/auth';
import type { ThemeColors } from '../config/themes';

const HOUR_HEIGHT = 56;
const START_HOUR = 9;
const END_HOUR = 28; // 4:00 AM del día siguiente
const TOTAL_HOURS = END_HOUR - START_HOUR;
const CLOSED_GAP_MINUTES = 60;

const DAY_NAMES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

// Mezcla un color hex con blanco/negro según amount (0-1)
function hexMix(hex: string, target: string, amount: number): string {
  const parse = (h: string) => {
    const c = h.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(target);
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const b = Math.round(b1 + (b2 - b1) * amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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
  startMinutes: number;
  durationMinutes: number;
  column: number;
  totalColumns: number;
}

interface ClosedGap {
  startMinutes: number;
  endMinutes: number;
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
      if (blocks[i].startMinutes < aEnd) usedCols.add(blocks[j].column);
    }
    let col = 0;
    while (usedCols.has(col)) col++;
    blocks[i].column = col;
  }

  for (let i = 0; i < blocks.length; i++) {
    let maxConcurrent = 1;
    for (let j = 0; j < blocks.length; j++) {
      if (i === j) continue;
      const iEnd = blocks[i].startMinutes + blocks[i].durationMinutes;
      const jEnd = blocks[j].startMinutes + blocks[j].durationMinutes;
      if (blocks[i].startMinutes < jEnd && blocks[j].startMinutes < iEnd) {
        maxConcurrent = Math.max(maxConcurrent, blocks[j].column + 1);
      }
    }
    blocks[i].totalColumns = Math.max(blocks[i].column + 1, maxConcurrent);
  }

  return blocks;
}

function getClosedGaps(events: Event[]): ClosedGap[] {
  const totalMinutes = TOTAL_HOURS * 60;
  if (events.length === 0) return [{ startMinutes: 0, endMinutes: totalMinutes }];

  const occupied: [number, number][] = events.map(e => {
    const start = ((e.startHour ?? START_HOUR) - START_HOUR) * 60 + (e.startMinute ?? 0);
    const dur = (e.durationHours ?? 2) * 60 + (e.durationMinutes ?? 0);
    return [Math.max(0, start), Math.min(totalMinutes, start + dur)];
  });

  occupied.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of occupied) {
    if (merged.length === 0 || s > merged[merged.length - 1][1]) {
      merged.push([s, e]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    }
  }

  const gaps: ClosedGap[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s - cursor >= CLOSED_GAP_MINUTES) gaps.push({ startMinutes: cursor, endMinutes: s });
    cursor = e;
  }
  if (totalMinutes - cursor >= CLOSED_GAP_MINUTES) gaps.push({ startMinutes: cursor, endMinutes: totalMinutes });
  return gaps;
}

function formatHour(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getTimeStr(event: Event, durationMinutes: number): string {
  const startH = event.startHour ?? 0;
  const startM = event.startMinute ?? 0;
  const startTotalMin = startH * 60 + startM;
  return `${formatHour(startTotalMin)} – ${formatHour(startTotalMin + durationMinutes)}`;
}

// Paleta de colores alternos para eventos no solapados (con y sin socio)
const ALT_COLORS_SOCIO = ['#2563eb', '#7c3aed', '#0f766e', '#b45309', '#be185d'];
const ALT_COLORS_NO_SOCIO_ALPHA = 0.55; // mezcla con background

function EventBlockView({ block, colors, colorIndex = 0 }: { block: EventBlock; colors: ThemeColors; colorIndex?: number }) {
  const { event, startMinutes, durationMinutes, column, totalColumns } = block;
  const hasSocio = event.hasSocioRegistered;
  const isOverlapping = totalColumns > 1;

  // Color base: si solapa usamos primary (las rayas ya distinguen visualmente),
  // si no solapa alternamos entre colores de la paleta
  let bgBase: string;
  if (isOverlapping) {
    bgBase = hasSocio
      ? colors.primary
      : hexMix(colors.primary, colors.background, 0.55);
  } else {
    const paletteColor = ALT_COLORS_SOCIO[colorIndex % ALT_COLORS_SOCIO.length];
    bgBase = hasSocio
      ? paletteColor
      : hexMix(paletteColor, colors.background, ALT_COLORS_NO_SOCIO_ALPHA);
  }

  const border = hexMix(bgBase, '#000000', 0.25);

  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
  const widthPct = 100 / totalColumns;
  const timeStr = getTimeStr(event, durationMinutes);

  // Patrón de rayas diagonales para eventos solapados
  const stripeOverlay = isOverlapping
    ? `repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 3px, transparent 3px, transparent 9px)`
    : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        left: `${column * widthPct + 0.5}%`,
        width: `${widthPct - 1}%`,
        backgroundColor: bgBase,
        backgroundImage: stripeOverlay,
        borderLeft: `3px solid ${border}`,
        color: '#ffffff',
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
      {height >= 48 && event.gameName && event.gameName !== event.title && (
        <div style={{ opacity: 0.75, fontSize: '10px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.gameName}
        </div>
      )}
    </div>
  );
}

function ClosedBlock({ gap, colors }: { gap: ClosedGap; colors: ThemeColors }) {
  const top = (gap.startMinutes / 60) * HOUR_HEIGHT;
  const height = ((gap.endMinutes - gap.startMinutes) / 60) * HOUR_HEIGHT;
  const startLabel = formatHour(START_HOUR * 60 + gap.startMinutes);
  const endLabel = formatHour(START_HOUR * 60 + gap.endMinutes);
  const borderColor = hexMix(colors.cardBorder, colors.background, 0.3);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: '1%',
        width: '98%',
        height: `${height}px`,
        backgroundColor: hexMix(colors.background, '#000000', 0.15),
        border: `1px dashed ${borderColor}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ color: borderColor, fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Club cerrado
      </div>
      {height >= 40 && (
        <div style={{ color: hexMix(colors.cardBorder, colors.background, 0.5), fontSize: '9px', marginTop: '2px' }}>
          {startLabel} – {endLabel}
        </div>
      )}
    </div>
  );
}

function EventIndex({ allBlocks, colors }: { allBlocks: { day: Date; blocks: EventBlock[] }[]; colors: ThemeColors }) {
  const byDay: Map<string, { day: Date; blocks: EventBlock[] }> = new Map();
  for (const { day, blocks } of allBlocks) {
    if (blocks.length === 0) continue;
    byDay.set(day.toDateString(), { day, blocks });
  }
  if (byDay.size === 0) return null;

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.cardBorder}` }}>
      <div style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        Detalle de eventos
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Array.from(byDay.values()).map(({ day, blocks }) => (
          <div key={day.toDateString()} style={{ minWidth: '140px' }}>
            <div style={{ color: colors.accent, fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'capitalize' }}>
              {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' }).format(day)}
            </div>
            {blocks.map(block => {
              const hasSocio = block.event.hasSocioRegistered;
              const dotColor = hasSocio ? colors.primary : hexMix(colors.primary, colors.background, 0.55);
              const timeStr = getTimeStr(block.event, block.durationMinutes);
              return (
                <div key={block.event.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: dotColor, flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ color: colors.text, fontSize: '10px', fontWeight: 600, lineHeight: 1.2 }}>
                      {block.event.title}
                    </div>
                    <div style={{ color: colors.textSecondary, fontSize: '9px' }}>{timeStr}</div>
                    {block.event.gameName && block.event.gameName !== block.event.title && (
                      <div style={{ color: hexMix(colors.textSecondary, colors.background, 0.3), fontSize: '9px' }}>
                        {block.event.gameName}
                      </div>
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
  const { theme, themeMode } = useTheme();
  const colors = theme.colors[themeMode];

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

  const allDayBlocks = useMemo(() => {
    return weekDays.map((day, i) => ({
      day,
      blocks: layoutEventsForDay(eventsByDay[i]),
    }));
  }, [weekDays, eventsByDay]);

  const closedGapsPerDay = useMemo(() => {
    return eventsByDay.map(dayEvents => getClosedGaps(dayEvents));
  }, [eventsByDay]);

  async function captureImage(): Promise<string> {
    if (!previewRef.current) throw new Error('No ref');
    return toPng(previewRef.current, { pixelRatio: 2, backgroundColor: colors.background });
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
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopyStatus('done');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const gridBorder = hexMix(colors.cardBorder, colors.background, 0.3);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Preview semanal</h1>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setWeekOffset(o => o - 1)} className="px-3 py-1.5 rounded border border-[var(--color-cardBorder)] text-sm hover:bg-[var(--color-hover)] text-[var(--color-text)]">
              ← Anterior
            </button>
            <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded border border-[var(--color-cardBorder)] text-sm hover:bg-[var(--color-hover)] text-[var(--color-text)]">
              Esta semana
            </button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="px-3 py-1.5 rounded border border-[var(--color-cardBorder)] text-sm hover:bg-[var(--color-hover)] text-[var(--color-text)]">
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
              backgroundColor: colors.background,
              borderRadius: '12px',
              padding: '20px 16px 16px',
              fontFamily: 'system-ui, sans-serif',
              minWidth: '640px',
            }}
          >
            {/* Título */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: colors.accent, fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Club Dreadnought
              </div>
              <div style={{ color: colors.text, fontSize: '13px', marginTop: '2px', opacity: 0.7 }}>
                Previsión semanal · {weekLabel}
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'flex' }}>
              {/* Columna de horas */}
              <div style={{ width: '44px', flexShrink: 0, paddingTop: '36px' }}>
                {hours.map(h => (
                  <div key={h} style={{ height: `${HOUR_HEIGHT}px`, display: 'flex', alignItems: 'flex-start', paddingTop: '2px', color: colors.textSecondary, fontSize: '10px', justifyContent: 'flex-end', paddingRight: '8px', opacity: 0.6 }}>
                    {formatHour(h * 60)}
                  </div>
                ))}
              </div>

              {/* Columnas de días */}
              {weekDays.map((day, i) => {
                const gaps = closedGapsPerDay[i];
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={i} style={{ flex: 1, minWidth: 0, borderLeft: `1px solid ${gridBorder}` }}>
                    {/* Header del día */}
                    <div style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: `1px solid ${gridBorder}` }}>
                      <div style={{ color: colors.textSecondary, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                        {DAY_NAMES[i]}
                      </div>
                      <div style={{
                        color: isToday ? colors.accent : colors.text,
                        fontWeight: isToday ? 700 : 500,
                        fontSize: '15px',
                        width: '26px',
                        height: '26px',
                        lineHeight: '26px',
                        borderRadius: '50%',
                        background: isToday ? hexMix(colors.accent, colors.background, 0.8) : 'transparent',
                        margin: '2px auto 0',
                        textAlign: 'center',
                      }}>
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ position: 'relative', height: `${totalHeight}px` }}>
                      {hours.map(h => (
                        <div key={h} style={{ position: 'absolute', top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, left: 0, right: 0, borderTop: `1px solid ${gridBorder}` }} />
                      ))}
                      {gaps.map((gap, gi) => (
                        <ClosedBlock key={gi} gap={gap} colors={colors} />
                      ))}
                      {allDayBlocks[i].blocks.map((block, blockIdx) => (
                        <EventBlockView key={block.event.id} block={block} colors={colors} colorIndex={blockIdx} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${gridBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: colors.primary }} />
                <span style={{ color: colors.textSecondary, fontSize: '11px' }}>Con socio</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: hexMix(colors.primary, colors.background, 0.55) }} />
                <span style={{ color: colors.textSecondary, fontSize: '11px' }}>Sin socio confirmado</span>
              </div>
              <div style={{ marginLeft: 'auto', color: hexMix(colors.textSecondary, colors.background, 0.4), fontSize: '10px' }}>
                clubdreadnought.com
              </div>
            </div>

            <EventIndex allBlocks={allDayBlocks} colors={colors} />
          </div>
        )}
      </div>
    </Layout>
  );
}
