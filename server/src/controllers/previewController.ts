// server/src/controllers/previewController.ts
import { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { prisma } from '../config/database';
import { getBGGGame } from '../services/bggService';

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

// HTML con meta tags OG para un juego de BGG directamente (sin evento)
export const previewBggGame = async (req: Request, res: Response) => {
  const bggId = req.params['bggId'];

  if (!bggId) {
    res.redirect(`${CLIENT_URL}/`);
    return;
  }

  try {
    const game = await getBGGGame(bggId);

    if (!game) {
      res.redirect(`${CLIENT_URL}/`);
      return;
    }

    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const serverUrl = process.env.SERVER_URL
      ?? (railwayDomain ? `https://${railwayDomain}` : CLIENT_URL);

    const ogTitle = game.name;
    const ogImage = game.image || game.thumbnail
      ? `${serverUrl}/preview/bgg-image/${bggId}`
      : `${CLIENT_URL}/og-image.png`;
    const ogUrl = `${CLIENT_URL}/events`;

    const userAgent = req.headers['user-agent'] ?? '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i.test(userAgent);

    const html = isCrawler
      ? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${ogUrl}" />
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
  <meta http-equiv="refresh" content="0; url=${ogUrl}" />
</head>
<body>
  <script>window.location.replace('${ogUrl}');</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.redirect(`${CLIENT_URL}/`);
  }
};

// Proxy de imagen de un juego BGG por su bggId (sin pasar por un evento)
export const proxyBggGameImage = async (req: Request, res: Response) => {
  const bggId = req.params['bggId'];

  if (!bggId) {
    res.redirect(`${CLIENT_URL}/og-image.png`);
    return;
  }

  try {
    const game = await getBGGGame(bggId);
    const imageUrl = game?.image || game?.thumbnail;

    if (!imageUrl) {
      res.redirect(`${CLIENT_URL}/og-image.png`);
      return;
    }

    const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
    const protocol = fullUrl.startsWith('https') ? https : http;

    protocol.get(fullUrl, (imgRes) => {
      const resizer = sharp().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      imgRes.pipe(resizer).pipe(res);
    }).on('error', () => {
      res.redirect(`${CLIENT_URL}/og-image.png`);
    });
  } catch {
    res.redirect(`${CLIENT_URL}/og-image.png`);
  }
};

// Descarga una imagen desde una URL y devuelve su Buffer
function fetchImageBuffer(url: string): Promise<Buffer> {
  // Las URLs de BGG pueden venir sin protocolo (//cf.geekdo-images.com/...)
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;
  const protocol = fullUrl.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    protocol.get(fullUrl, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Imagen combinada de dos juegos BGG side-by-side
export const proxyDualImage = async (req: Request, res: Response) => {
  const { bgg1, bgg2 } = req.query as { bgg1?: string; bgg2?: string };

  if (!bgg1 || !bgg2) {
    res.status(400).send('Se requieren bgg1 y bgg2');
    return;
  }

  try {
    const [game1, game2] = await Promise.all([getBGGGame(bgg1), getBGGGame(bgg2)]);

    const url1 = game1?.image || game1?.thumbnail;
    const url2 = game2?.image || game2?.thumbnail;

    if (!url1 || !url2) {
      res.redirect(`${CLIENT_URL}/og-image.png`);
      return;
    }

    const [buf1, buf2] = await Promise.all([fetchImageBuffer(url1), fetchImageBuffer(url2)]);

    const HALF_W = 300;
    const CANVAS_H = 300;

    const [left, right] = await Promise.all([
      sharp(buf1).resize(HALF_W, CANVAS_H, { fit: 'inside', withoutEnlargement: true }).toBuffer(),
      sharp(buf2).resize(HALF_W, CANVAS_H, { fit: 'inside', withoutEnlargement: true }).toBuffer(),
    ]);

    const [leftMeta, rightMeta] = await Promise.all([
      sharp(left).metadata(),
      sharp(right).metadata(),
    ]);

    const leftH  = leftMeta.height  ?? CANVAS_H;
    const rightH = rightMeta.height ?? CANVAS_H;

    const result = await sharp({
      create: { width: HALF_W * 2, height: CANVAS_H, channels: 3, background: '#1a1a2e' },
    })
      .composite([
        { input: left,  left: 0,      top: Math.floor((CANVAS_H - leftH)  / 2) },
        { input: right, left: HALF_W, top: Math.floor((CANVAS_H - rightH) / 2) },
      ])
      .jpeg({ quality: 80 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result);
  } catch (err) {
    console.error('[proxyDualImage] error:', err);
    res.redirect(`${CLIENT_URL}/og-image.png`);
  }
};

// HTML con meta tags OG para propuesta de 2 juegos
export const previewDual = async (req: Request, res: Response) => {
  const { bgg1, bgg2, title } = req.query as { bgg1?: string; bgg2?: string; title?: string };

  if (!bgg1 || !bgg2) {
    res.redirect(`${CLIENT_URL}/`);
    return;
  }

  try {
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const serverUrl = process.env.SERVER_URL
      ?? (railwayDomain ? `https://${railwayDomain}` : CLIENT_URL);

    let ogTitle = title ?? '';
    if (!ogTitle) {
      const [game1, game2] = await Promise.all([getBGGGame(bgg1), getBGGGame(bgg2)]);
      ogTitle = [game1?.name, game2?.name].filter(Boolean).join(' o ') || 'Propuesta de juego';
    }

    const ogDescription = '¿A qué jugamos? Vota tu favorito.';
    const ogImage = `${serverUrl}/preview/dual-image?bgg1=${encodeURIComponent(bgg1)}&bgg2=${encodeURIComponent(bgg2)}`;
    const ogUrl = `${CLIENT_URL}/events`;

    const userAgent = req.headers['user-agent'] ?? '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i.test(userAgent);

    const html = isCrawler
      ? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${ogUrl}" />
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
  <meta http-equiv="refresh" content="0; url=${ogUrl}" />
</head>
<body>
  <script>window.location.replace('${ogUrl}');</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.redirect(`${CLIENT_URL}/`);
  }
};
