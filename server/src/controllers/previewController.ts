// server/src/controllers/previewController.ts
import { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
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
    console.log(`[proxyImage] event=${id} imageUrl=${imageUrl ?? 'null'}`);
    if (!imageUrl) {
      console.log(`[proxyImage] event=${id} no image → redirect og-image.png`);
      res.redirect(`${CLIENT_URL}/og-image.png`);
      return;
    }
    const protocol = imageUrl.startsWith('https') ? https : http;

    protocol.get(imageUrl, (imgRes) => {
      const contentLength = imgRes.headers['content-length'];
      console.log(`[proxyImage] event=${id} status=${imgRes.statusCode} contentLength=${contentLength ?? 'unknown'}`);
      // Redimensionar a max 600px y convertir a JPEG para que quede por debajo de los 300KB
      // que WhatsApp acepta para imágenes OG
      const resizer = sharp().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      imgRes.pipe(resizer).pipe(res);
    }).on('error', (err) => {
      console.log(`[proxyImage] event=${id} error=${err.message} → redirect og-image.png`);
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
        expansions: {
          include: {
            game: {
              select: {
                name: true,
              }
            }
          },
          orderBy: { position: 'asc' }
        },
        linkedNextEvent: {
          select: {
            gameName: true,
            title: true,
          }
        },
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

    const expansionsText = event.expansions.map((expansion) => expansion.game.name).join(', ');
    const linkedNextText = event.linkedNextEvent?.gameName || event.linkedNextEvent?.title || '';
    const ogDescriptionParts = [
      expansionsText ? `Expansiones: ${expansionsText}` : '',
      linkedNextText ? `Después se jugará: ${linkedNextText}` : '',
    ].filter(Boolean);
    const ogDescription = ogDescriptionParts.join(' · ');

    // Usar proxy para la imagen (BGG bloquea hotlinking directo)
    // Preferir imagen de alta res de Game, con fallback al gameImage del evento
    const hasImage = event.game?.image ?? event.gameImage;
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const serverUrl = process.env.SERVER_URL
      ?? (railwayDomain ? `https://${railwayDomain}` : CLIENT_URL);
    const ogImage = hasImage
      ? `${serverUrl}/preview/image/${event.id}`
      : `${CLIENT_URL}/og-image.png`;

    const userAgent = req.headers['user-agent'] ?? '';
    // WhatsApp usa facebookexternalhit o WhatsApp/x.x como UA
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i.test(userAgent);
    console.log(`[preview] event=${event.id} isCrawler=${isCrawler} ua="${userAgent}"`);

    // Los crawlers deben quedarse en esta página para leer los meta tags.
    // Si se les añade redirección, la siguen y aterrizan en la SPA (index.html genérico),
    // perdiendo los meta tags específicos del evento.
    const html = isCrawler
      ? `<!DOCTYPE html>
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
