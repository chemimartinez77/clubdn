import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';

const pad = (n: number) => n.toString().padStart(2, '0');

const toIcsDate = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

// Formatea una fecha como hora local Madrid (sin conversión UTC) para usar con TZID
const toIcsDateLocal = (year: number, month: number, day: number, hour: number, minute: number): string =>
  `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;

const escapeIcs = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/**
 * GET /api/calendar/:token
 * Endpoint público (sin JWT). Devuelve el calendario ICS personal del usuario.
 * Usa `any` en las queries que dependen de calendarToken (campo nuevo, requiere prisma generate).
 */
export const getUserCalendar = async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.params.token ?? '';
  const token = rawToken.endsWith('.ics') ? rawToken.slice(0, -4) : rawToken;

  const user = await (prisma.user as any).findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true }
  });

  if (!user) {
    res.status(404).send('Calendario no encontrado');
    return;
  }

  const registrations: any[] = await prisma.eventRegistration.findMany({
    where: {
      userId: user.id,
      status: 'CONFIRMED',
      event: {
        status: { in: ['SCHEDULED', 'ONGOING'] },
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    select: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          startHour: true,
          startMinute: true,
          durationHours: true,
          durationMinutes: true,
          location: true,
          address: true
        }
      }
    }
  });

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Club Dreadnought//ES',
    'NAME:Club Dreadnought',
    'X-WR-CALNAME:Club Dreadnought',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const reg of registrations) {
    const event = reg.event;
    const base = new Date(event.date);
    const hour = event.startHour ?? 0;
    const minute = event.startMinute ?? 0;
    const totalMinutes = (event.durationHours ?? 2) * 60 + (event.durationMinutes ?? 0);

    // Usamos hora local Madrid con TZID para evitar desfase UTC
    const year = base.getUTCFullYear();
    const month = base.getUTCMonth() + 1;
    const day = base.getUTCDate();
    const endHour = Math.floor((hour * 60 + minute + totalMinutes) / 60) % 24;
    const endMinute = (hour * 60 + minute + totalMinutes) % 60;

    const location = [event.location, event.address].filter(Boolean).join(', ');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@clubdreadnought`);
    lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
    lines.push(`DTSTART;TZID=Europe/Madrid:${toIcsDateLocal(year, month, day, hour, minute)}`);
    lines.push(`DTEND;TZID=Europe/Madrid:${toIcsDateLocal(year, month, day, endHour, endMinute)}`);
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="clubdn.ics"');
  res.send(lines.join('\r\n'));
};

/**
 * POST /api/calendar/token (autenticado)
 * Genera o regenera el calendarToken del usuario autenticado.
 */
export const generateCalendarToken = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'No autorizado' });
    return;
  }

  const token = randomUUID();

  await (prisma.user as any).update({
    where: { id: userId },
    data: { calendarToken: token }
  });

  res.json({ success: true, data: { token } });
};
