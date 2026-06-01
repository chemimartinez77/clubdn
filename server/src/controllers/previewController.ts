import { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { prisma } from '../config/database';

const CLIENT_URL = (process.env.CLIENT_URL ?? 'https://app.clubdreadnought.org').replace(/\/$/, '');
const SERVER_URL = (
  process.env.SERVER_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : CLIENT_URL)
).replace(/\/$/, '');

function formatSurpriseBoxShareDate(eventDate: Date, startHour: number | null, startMinute: number | null) {
  const date = new Date(eventDate);

  if (startHour !== null && startHour !== undefined) {
    date.setHours(startHour, startMinute ?? 0, 0, 0);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function sendCrawlerAwareHtml(req: Request, res: Response, redirectUrl: string, ogTitle: string, ogDescription: string, ogImage: string) {
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
  <meta property="og:url" content="${redirectUrl}" />
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
  <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
</head>
<body>
  <script>window.location.replace('${redirectUrl}');</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

function proxyRemoteImage(res: Response, imageUrl: string | null | undefined) {
  if (!imageUrl) {
    res.redirect(`${CLIENT_URL}/og-image.png`);
    return;
  }

  const protocol = imageUrl.startsWith('https') ? https : http;
  protocol.get(imageUrl, (imgRes) => {
    const resizer = sharp().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 });
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    imgRes.pipe(resizer).pipe(res);
  }).on('error', () => {
    res.redirect(`${CLIENT_URL}/og-image.png`);
  });
}

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

    proxyRemoteImage(res, event?.game?.image ?? event?.gameImage);
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
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        linkedNextEvent: {
          select: {
            gameName: true,
            title: true,
          },
        },
        game: { select: { image: true } },
      },
    });

    if (!event) {
      res.redirect(`${CLIENT_URL}/`);
      return;
    }

    const eventUrl = `${CLIENT_URL}/events/${event.id}`;
    const ogTitle = event.gameName && event.gameName !== event.title ? `${event.title} · ${event.gameName}` : event.title;
    const expansionsText = event.expansions.map((expansion) => expansion.game.name).join(', ');
    const linkedNextText = event.linkedNextEvent?.gameName || event.linkedNextEvent?.title || '';
    const ogDescription = [
      expansionsText ? `Expansiones: ${expansionsText}` : '',
      linkedNextText ? `Después se jugará: ${linkedNextText}` : '',
    ].filter(Boolean).join(' · ');
    const ogImage = event.game?.image || event.gameImage
      ? `${SERVER_URL}/preview/image/${event.id}`
      : `${CLIENT_URL}/og-image.png`;

    sendCrawlerAwareHtml(req, res, eventUrl, ogTitle, ogDescription, ogImage);
  } catch {
    res.redirect(`${CLIENT_URL}/`);
  }
};

export const proxySurpriseBoxImage = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const box = await prisma.surpriseBox.findUnique({
      where: { token },
      select: {
        coverImageUrl: true,
        winningOption: {
          select: {
            gameImage: true,
            gameThumbnail: true,
          },
        },
        options: {
          orderBy: { position: 'asc' },
          take: 1,
          select: {
            gameImage: true,
            gameThumbnail: true,
          },
        },
      },
    });

    const imageUrl =
      box?.coverImageUrl ||
      box?.winningOption?.gameImage ||
      box?.winningOption?.gameThumbnail ||
      box?.options[0]?.gameImage ||
      box?.options[0]?.gameThumbnail ||
      null;

    proxyRemoteImage(res, imageUrl);
  } catch {
    res.redirect(`${CLIENT_URL}/og-image.png`);
  }
};

export const previewSurpriseBox = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const box = await prisma.surpriseBox.findUnique({
      where: { token },
      select: {
        token: true,
        title: true,
        eventDate: true,
        startHour: true,
        startMinute: true,
        status: true,
        winningOption: {
          select: {
            gameName: true,
          },
        },
      },
    });

    if (!box) {
      res.redirect(`${CLIENT_URL}/`);
      return;
    }

    const publicUrl = `${CLIENT_URL}/caja-sorpresa/${box.token}`;
    const ogTitle = box.status === 'RESOLVED' && box.winningOption?.gameName
      ? `${box.title} · ${box.winningOption.gameName}`
      : box.title;
    const ogDescriptionLegacy = box.status === 'OPEN'
      ? 'Vota el primer juego y desbloquea la partida sorpresa.'
      : box.status === 'CLOSED'
        ? 'La caja sorpresa ya está cerrada.'
        : `La caja sorpresa ya se resolvió. Juego elegido: ${box.winningOption?.gameName ?? 'desconocido'}.`;
    void ogDescriptionLegacy;
    const ogDescription = formatSurpriseBoxShareDate(box.eventDate, box.startHour, box.startMinute);
    const ogImage = `${SERVER_URL}/preview/surprise-image/${box.token}`;

    sendCrawlerAwareHtml(req, res, publicUrl, ogTitle, ogDescription, ogImage);
  } catch {
    res.redirect(`${CLIENT_URL}/`);
  }
};
