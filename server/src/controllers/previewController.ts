// server/src/controllers/previewController.ts
import { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import { prisma } from '../config/database';

const CLIENT_URL = process.env.CLIENT_URL ?? 'https://app.clubdreadnought.org';

// Proxy de imagen: descarga desde BGG (que bloquea hotlinking) y la sirve desde nuestro dominio
export const proxyImage = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        gameImage: true,
        game: { select: { image: true } },
      },
    });

    // Preferir la imagen de alta res de la tabla Game, con fallback al gameImage del evento
    const imageUrl = event?.game?.image ?? event?.gameImage;
    if (!imageUrl) {
      res.redirect(`${CLIENT_URL}/og-image.png`);
      return;
    }
    const protocol = imageUrl.startsWith('https') ? https : http;

    protocol.get(imageUrl, (imgRes) => {
      const contentType = imgRes.headers['content-type'] ?? 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      imgRes.pipe(res);
    }).on('error', () => {
      res.redirect(`${CLIENT_URL}/og-image.png`);
    });
  } catch {
    res.redirect(`${CLIENT_URL}/og-image.png`);
  }
};

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
        game: { select: { image: true } },
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

    const ogDescription = '';

    // Usar proxy para la imagen (BGG bloquea hotlinking directo)
    // Preferir imagen de alta res de Game, con fallback al gameImage del evento
    const hasImage = event.game?.image ?? event.gameImage;
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const SERVER_URL = railwayDomain ? `https://${railwayDomain}` : (process.env.SERVER_URL ?? CLIENT_URL);
    const ogImage = hasImage
      ? `${SERVER_URL}/preview/image/${event.id}`
      : `${CLIENT_URL}/og-image.png`;

    const userAgent = req.headers['user-agent'] ?? '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i.test(userAgent);

    // Los crawlers NO deben recibir redirección — leen los meta tags y se quedan aquí
    // Los usuarios normales se redirigen a la app
    const html = isCrawler
      ? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="600" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:url" content="${eventUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${ogImage}" />
</head>
<body></body>
</html>`
      : `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
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
