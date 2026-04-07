// server/src/controllers/previewController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const CLIENT_URL = process.env.CLIENT_URL ?? 'https://app.clubdreadnought.org';

export const previewEvent = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        gameName: true,
        gameImage: true,
        date: true,
        startHour: true,
        startMinute: true,
        location: true,
      },
    });

    if (!event) {
      res.redirect(`${CLIENT_URL}/`);
      return;
    }

    const eventUrl = `${CLIENT_URL}/events/${event.id}`;

    // Título: "Título de partida · Nombre del juego" o solo el título si no hay juego
    const ogTitle = event.gameName && event.gameName !== event.title
      ? `${event.title} · ${event.gameName}`
      : event.title;

    // Descripción: fecha, hora y lugar
    const d = new Date(event.date);
    const dateStr = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const timeStr = event.startHour != null
      ? `${String(event.startHour).padStart(2, '0')}:${String(event.startMinute ?? 0).padStart(2, '0')}`
      : null;
    const ogDescription = [dateStr, timeStr, event.location].filter(Boolean).join(' · ');

    const ogImage = event.gameImage ?? `${CLIENT_URL}/og-image.png`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${eventUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=${eventUrl}" />
</head>
<body>
  <script>window.location.replace('${eventUrl}');</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.redirect(`${CLIENT_URL}/`);
  }
};
