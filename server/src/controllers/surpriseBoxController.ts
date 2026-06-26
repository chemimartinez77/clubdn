import { Prisma, SurpriseBoxStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { generateInvitationToken } from '../utils/invitationToken';
import { isAdminLikeRole } from '../utils/roles';

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const SERVER_URL = (
  process.env.SERVER_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : CLIENT_URL)
).replace(/\/$/, '');
const SURPRISE_BOX_COVERS = [`${CLIENT_URL}/mysterybox1.def.png`, `${CLIENT_URL}/mysterybox2.def.png`];
const getRandomCover = () => SURPRISE_BOX_COVERS[Math.floor(Math.random() * SURPRISE_BOX_COVERS.length)];

function getReadableConflictTitle(event: { title: string; gameName?: string | null }) {
  if (event.title === 'Caja misteriosa' && event.gameName) {
    return `Caja misteriosa · ${event.gameName}`;
  }

  return event.title || event.gameName || 'otra partida';
}

type SurpriseOptionInput = {
  gameId?: string;
};

const surpriseBoxInclude = {
  options: {
    orderBy: { position: 'asc' as const },
  },
  draftEvent: {
    select: {
      id: true,
      title: true,
      date: true,
    },
  },
  resolvedEvent: {
    select: {
      id: true,
      title: true,
      date: true,
      gameName: true,
      gameImage: true,
    },
  },
  winningOption: true,
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.SurpriseBoxInclude;

function buildPublicUrl(token: string) {
  return `${CLIENT_URL}/caja-sorpresa/${token}`;
}

function buildPreviewUrl(token: string) {
  return `${SERVER_URL}/preview/surprise/${token}`;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function parseNullableInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeOptionInputs(raw: unknown): SurpriseOptionInput[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();

  return raw
    .map((item) => {
      const gameId = typeof item === 'object' && item !== null && 'gameId' in item
        ? String((item as SurpriseOptionInput).gameId ?? '').trim()
        : '';
      return { gameId };
    })
    .filter((item) => item.gameId && !seen.has(item.gameId) && seen.add(item.gameId));
}

async function getScheduleConflict(
  userId: string,
  eventDate: Date,
  startHour: number | null,
  startMinute: number | null,
  durationHours: number | null,
  durationMinutes: number | null,
  excludeBoxId?: string
): Promise<string | null> {
  if (startHour === null || startHour === undefined) return null;

  const newStart = startHour * 60 + (startMinute ?? 0);
  const totalDuration = (durationHours ?? 0) * 60 + (durationMinutes ?? 0);
  const newEnd = newStart + (totalDuration > 0 ? totalDuration : 1);

  const dayStart = new Date(eventDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const eventSelect = {
    title: true,
    gameName: true,
    startHour: true,
    startMinute: true,
    durationHours: true,
    durationMinutes: true,
  };

  const [registrations, ownedEvents, ownBoxes] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'WAITLIST'] },
        event: {
          date: { gte: dayStart, lt: dayEnd },
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      },
      include: { event: { select: eventSelect } },
    }),
    prisma.event.findMany({
      where: {
        createdBy: userId,
        date: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      select: eventSelect,
    }),
    prisma.surpriseBox.findMany({
      where: {
        createdById: userId,
        status: SurpriseBoxStatus.OPEN,
        eventDate: { gte: dayStart, lt: dayEnd },
        ...(excludeBoxId ? { id: { not: excludeBoxId } } : {}),
      },
      select: { title: true, startHour: true, startMinute: true, durationHours: true, durationMinutes: true },
    }),
  ]);

  const checkOverlap = (startHour: number | null, startMinute: number | null, durationHours: number | null, durationMinutes: number | null) => {
    if (startHour === null || startHour === undefined) return false;
    const currentStart = startHour * 60 + (startMinute ?? 0);
    const currentDuration = (durationHours ?? 0) * 60 + (durationMinutes ?? 0);
    const currentEnd = currentStart + (currentDuration > 0 ? currentDuration : 1);
    return newStart < currentEnd && currentStart < newEnd;
  };

  for (const registration of registrations) {
    const event = registration.event;
    if (checkOverlap(event.startHour, event.startMinute, event.durationHours, event.durationMinutes)) {
      return getReadableConflictTitle(event);
    }
  }

  for (const event of ownedEvents) {
    if (checkOverlap(event.startHour, event.startMinute, event.durationHours, event.durationMinutes)) {
      return getReadableConflictTitle(event);
    }
  }

  for (const box of ownBoxes) {
    if (checkOverlap(box.startHour, box.startMinute, box.durationHours, box.durationMinutes)) {
      return box.title ?? 'partida a elegir';
    }
  }

  return null;
}

async function serializeSurpriseBox(box: Prisma.SurpriseBoxGetPayload<{ include: typeof surpriseBoxInclude }>) {
  return {
    id: box.id,
    token: box.token,
    title: box.title,
    subtitle: box.subtitle,
    description: box.description,
    coverImageUrl: box.coverImageUrl,
    status: box.status,
    eventDate: box.eventDate,
    startHour: box.startHour,
    startMinute: box.startMinute,
    durationHours: box.durationHours,
    durationMinutes: box.durationMinutes,
    location: box.location,
    address: box.address,
    maxAttendees: box.maxAttendees,
    requiresApproval: box.requiresApproval,
    allowLateJoin: box.allowLateJoin,
    language: box.language,
    englishLevel: box.englishLevel,
    createdAt: box.createdAt,
    updatedAt: box.updatedAt,
    resolvedAt: box.resolvedAt,
    closedAt: box.closedAt,
    publicUrl: buildPublicUrl(box.token),
    previewUrl: buildPreviewUrl(box.token),
    createdBy: box.createdBy,
    options: box.options.map((option) => ({
      id: option.id,
      position: option.position,
      gameId: option.gameId,
      gameName: option.gameName,
      gameImage: option.gameImage,
      gameThumbnail: option.gameThumbnail,
      isWinner: option.id === box.winningOptionId,
    })),
    winningOptionId: box.winningOptionId,
    draftEvent: box.draftEvent,
    resolvedEvent: box.resolvedEvent,
  };
}

function validateCreatePayload(req: Request) {
  const title = String(req.body.title ?? '').trim();
  const subtitle = typeof req.body.subtitle === 'string' ? req.body.subtitle.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const location = String(req.body.location ?? '').trim();
  const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
  const dateRaw = String(req.body.date ?? '').trim();
  const eventDate = new Date(dateRaw);
  const startHour = parseNullableInt(req.body.startHour);
  const startMinute = parseNullableInt(req.body.startMinute);
  const durationHours = parseNullableInt(req.body.durationHours);
  const durationMinutes = parseNullableInt(req.body.durationMinutes);
  const maxAttendees = Number.parseInt(String(req.body.maxAttendees ?? ''), 10);
  const requiresApproval = parseBoolean(req.body.requiresApproval, true);
  const allowLateJoin = parseBoolean(req.body.allowLateJoin, false);
  const language = req.body.language === 'en' ? 'en' : 'es';
  const englishLevel = language === 'en' && typeof req.body.englishLevel === 'string'
    ? req.body.englishLevel.trim() || null
    : null;
  const options = normalizeOptionInputs(req.body.options);

  if (title.length < 3) {
    return { error: 'El título debe tener al menos 3 caracteres' };
  }

  if (!location) {
    return { error: 'La ubicación es obligatoria' };
  }

  if (Number.isNaN(eventDate.getTime()) || eventDate <= new Date()) {
    return { error: 'La fecha de la caja misteriosa debe ser futura' };
  }

  if (Number.isNaN(maxAttendees) || maxAttendees < 1) {
    return { error: 'El número de plazas debe ser al menos 1' };
  }

  if (options.length < 2 || options.length > 3) {
    return { error: 'Debes indicar entre 2 y 3 juegos para la partida a elegir' };
  }

  if (startHour !== null && (startHour < 0 || startHour > 23)) {
    return { error: 'La hora de inicio no es válida' };
  }

  if (startMinute !== null && ![0, 15, 30, 45].includes(startMinute)) {
    return { error: 'Los minutos de inicio no son válidos' };
  }

  return {
    data: {
      title,
      subtitle: subtitle || null,
      description: description || null,
      location,
      address: address || null,
      eventDate,
      startHour,
      startMinute,
      durationHours,
      durationMinutes,
      maxAttendees,
      requiresApproval,
      allowLateJoin,
      language,
      englishLevel,
      options,
    },
  };
}

export const createSurpriseBox = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const parsed = validateCreatePayload(req);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const conflictTitle = await getScheduleConflict(
      userId,
      parsed.data.eventDate,
      parsed.data.startHour,
      parsed.data.startMinute,
      parsed.data.durationHours,
      parsed.data.durationMinutes
    );

    if (conflictTitle) {
      return res.status(409).json({
        success: false,
        message: `No puedes preparar esta caja misteriosa porque tienes conflicto horario con "${conflictTitle}"`,
      });
    }

    const existingOpenBox = await prisma.surpriseBox.findFirst({
      where: { createdById: userId, status: SurpriseBoxStatus.OPEN },
      select: { id: true, title: true },
    });

    if (existingOpenBox) {
      return res.status(409).json({
        success: false,
        message: `Ya hay una caja misteriosa activa${existingOpenBox.title ? `: "${existingOpenBox.title}"` : ''}. Ciérrala o espera a que se resuelva antes de crear otra.`,
      });
    }

    const games = await prisma.game.findMany({
      where: { id: { in: parsed.data.options.map((option) => option.gameId!) } },
      select: { id: true, name: true, image: true, thumbnail: true },
    });

    if (games.length !== parsed.data.options.length) {
      return res.status(400).json({
        success: false,
        message: 'Todos los juegos de la caja misteriosa deben existir en el catálogo',
      });
    }

    const gameMap = new Map(games.map((game) => [game.id, game]));

    const coverImageUrl = getRandomCover();

    const created = await prisma.$transaction(async (tx) => {
      const draftTitle = `${parsed.data.title} · Por decidir`;
      const draftEvent = await tx.event.create({
        data: {
          title: draftTitle,
          description: parsed.data.description || 'Caja misteriosa: el juego se decidirá por votación',
          type: 'PARTIDA',
          status: 'DRAFT',
          date: parsed.data.eventDate,
          startHour: parsed.data.startHour,
          startMinute: parsed.data.startMinute,
          durationHours: parsed.data.durationHours,
          durationMinutes: parsed.data.durationMinutes,
          location: parsed.data.location,
          address: parsed.data.address,
          maxAttendees: parsed.data.maxAttendees,
          requiresApproval: parsed.data.requiresApproval,
          allowLateJoin: parsed.data.allowLateJoin,
          language: parsed.data.language,
          englishLevel: parsed.data.englishLevel,
          gameImage: coverImageUrl,
          createdBy: userId,
        },
        select: { id: true },
      });

      return tx.surpriseBox.create({
        data: {
          token: generateInvitationToken(),
          title: parsed.data.title,
          subtitle: parsed.data.subtitle,
          description: parsed.data.description,
          coverImageUrl,
          eventDate: parsed.data.eventDate,
          startHour: parsed.data.startHour,
          startMinute: parsed.data.startMinute,
          durationHours: parsed.data.durationHours,
          durationMinutes: parsed.data.durationMinutes,
          location: parsed.data.location,
          address: parsed.data.address,
          maxAttendees: parsed.data.maxAttendees,
          requiresApproval: parsed.data.requiresApproval,
          allowLateJoin: parsed.data.allowLateJoin,
          language: parsed.data.language,
          englishLevel: parsed.data.englishLevel,
          createdById: userId,
          draftEventId: draftEvent.id,
          options: {
            create: parsed.data.options.map((option, index) => {
              const game = gameMap.get(option.gameId!);
              return {
                position: index,
                gameId: option.gameId!,
                gameName: game?.name || option.gameId!,
                gameImage: game?.image || null,
                gameThumbnail: game?.thumbnail || null,
              };
            }),
          },
        },
        include: surpriseBoxInclude,
      });
    });

    return res.status(201).json({
      success: true,
      data: await serializeSurpriseBox(created),
      message: 'Caja misteriosa creada correctamente',
    });
  } catch (error) {
    console.error('Error al crear la caja misteriosa:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la caja misteriosa' });
  }
};

export const listMySurpriseBoxes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const boxes = await prisma.surpriseBox.findMany({
      where: { createdById: userId },
      include: surpriseBoxInclude,
      orderBy: [{ status: 'asc' }, { eventDate: 'asc' }, { createdAt: 'desc' }],
    });

    return res.status(200).json({
      success: true,
      data: await Promise.all(boxes.map((box) => serializeSurpriseBox(box))),
    });
  } catch (error) {
    console.error('Error al listar cajas sorpresa:', error);
    return res.status(500).json({ success: false, message: 'Error al listar las cajas sorpresa' });
  }
};

export const getPublicSurpriseBox = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const box = await prisma.surpriseBox.findUnique({
      where: { token },
      include: surpriseBoxInclude,
    });

    if (!box) {
      return res.status(404).json({ success: false, message: 'Caja misteriosa no encontrada' });
    }

    return res.status(200).json({
      success: true,
      data: await serializeSurpriseBox(box),
    });
  } catch (error) {
    console.error('Error al obtener la caja misteriosa pública:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la caja misteriosa' });
  }
};

export const closeSurpriseBox = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const existing = await prisma.surpriseBox.findUnique({
      where: { id },
      select: { id: true, createdById: true, status: true, draftEventId: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Caja misteriosa no encontrada' });
    }

    if (!isAdminLikeRole(userRole) && existing.createdById !== userId) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para cerrar esta caja misteriosa' });
    }

    if (existing.status !== SurpriseBoxStatus.OPEN) {
      return res.status(400).json({ success: false, message: 'Solo se pueden cerrar cajas sorpresa abiertas' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.draftEventId) {
        await tx.event.update({
          where: { id: existing.draftEventId },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: userId },
        });
      }
      return tx.surpriseBox.update({
        where: { id },
        data: { status: SurpriseBoxStatus.CLOSED, closedAt: new Date() },
        include: surpriseBoxInclude,
      });
    });

    return res.status(200).json({
      success: true,
      data: await serializeSurpriseBox(updated),
      message: 'Caja misteriosa cerrada correctamente',
    });
  } catch (error) {
    console.error('Error al cerrar la caja misteriosa:', error);
    return res.status(500).json({ success: false, message: 'Error al cerrar la caja misteriosa' });
  }
};

export const voteSurpriseBox = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const userId = req.user?.userId;
    const optionId = String(req.body.optionId ?? '').trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!optionId) {
      return res.status(400).json({ success: false, message: 'Debes elegir una opción' });
    }

    const current = await prisma.surpriseBox.findUnique({
      where: { token },
      include: surpriseBoxInclude,
    });

    if (!current) {
      return res.status(404).json({ success: false, message: 'Caja misteriosa no encontrada' });
    }

    if (current.status !== SurpriseBoxStatus.OPEN) {
      return res.status(400).json({
        success: false,
        message: current.status === SurpriseBoxStatus.RESOLVED
          ? 'La caja misteriosa ya se resolvió'
          : 'La caja misteriosa está cerrada',
        data: await serializeSurpriseBox(current),
      });
    }

    const selectedOption = current.options.find((option) => option.id === optionId);
    if (!selectedOption) {
      return res.status(400).json({ success: false, message: 'La opción elegida no pertenece a esta caja misteriosa' });
    }

    const conflictTitle = await getScheduleConflict(
      userId,
      current.eventDate,
      current.startHour,
      current.startMinute,
      current.durationHours,
      current.durationMinutes,
      current.id
    );

    if (conflictTitle) {
      return res.status(409).json({
        success: false,
        message: `No puedes votar esta caja misteriosa porque ya tienes conflicto horario con "${conflictTitle}"`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const box = await tx.surpriseBox.findUnique({
        where: { token },
        include: surpriseBoxInclude,
      });

      if (!box) {
        throw new Error('BOX_NOT_FOUND');
      }

      if (box.status !== SurpriseBoxStatus.OPEN) {
        return { alreadyResolved: true, box };
      }

      const option = box.options.find((item) => item.id === optionId);
      if (!option) {
        throw new Error('OPTION_NOT_FOUND');
      }

      const resolvedEventTitle = `${box.title} · ${option.gameName}`;

      await tx.$queryRaw`SELECT id FROM "SurpriseBox" WHERE id = ${box.id} FOR UPDATE`;

      // Reutilizar el evento DRAFT si existe, o crear uno nuevo como fallback
      let resolvedEventId: string;
      if (box.draftEventId) {
        await tx.event.update({
          where: { id: box.draftEventId },
          data: {
            title: resolvedEventTitle,
            description: box.description || `Caja misteriosa resuelta: ${option.gameName}`,
            status: 'SCHEDULED',
            gameName: option.gameName,
            gameImage: option.gameImage || option.gameThumbnail || null,
            bggId: option.gameId,
          },
        });
        resolvedEventId = box.draftEventId;
      } else {
        const createdEvent = await tx.event.create({
          data: {
            title: resolvedEventTitle,
            description: box.description || `Caja misteriosa resuelta: ${option.gameName}`,
            type: 'PARTIDA',
            date: box.eventDate,
            startHour: box.startHour,
            startMinute: box.startMinute,
            durationHours: box.durationHours,
            durationMinutes: box.durationMinutes,
            location: box.location,
            address: box.address,
            maxAttendees: box.maxAttendees,
            requiresApproval: box.requiresApproval,
            allowLateJoin: box.allowLateJoin,
            language: box.language,
            englishLevel: box.englishLevel,
            gameName: option.gameName,
            gameImage: option.gameImage || option.gameThumbnail || null,
            bggId: option.gameId,
            createdBy: box.createdById,
          },
          select: { id: true },
        });
        resolvedEventId = createdEvent.id;
      }

      await tx.eventRegistration.create({
        data: {
          eventId: resolvedEventId,
          userId: box.createdById,
          status: 'CONFIRMED',
        },
      });

      if (userId !== box.createdById) {
        await tx.eventRegistration.create({
          data: {
            eventId: resolvedEventId,
            userId,
            status: 'CONFIRMED',
          },
        });
      }

      const updated = await tx.surpriseBox.update({
        where: { id: box.id },
        data: {
          status: SurpriseBoxStatus.RESOLVED,
          winningOptionId: option.id,
          resolvedByUserId: userId,
          resolvedEventId,
          resolvedAt: new Date(),
        },
        include: surpriseBoxInclude,
      });

      return { alreadyResolved: false, box: updated };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    const serialized = await serializeSurpriseBox(result.box as Prisma.SurpriseBoxGetPayload<{ include: typeof surpriseBoxInclude }>);
    return res.status(result.alreadyResolved ? 200 : 201).json({
      success: true,
      data: serialized,
      message: result.alreadyResolved
        ? 'La caja misteriosa ya estaba resuelta'
        : 'La caja misteriosa se ha resuelto y la partida se ha creado automáticamente',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'BOX_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Caja misteriosa no encontrada' });
    }
    if (error instanceof Error && error.message === 'OPTION_NOT_FOUND') {
      return res.status(400).json({ success: false, message: 'La opción elegida no pertenece a esta caja misteriosa' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      const box = await prisma.surpriseBox.findUnique({
        where: { token },
        include: surpriseBoxInclude,
      });
      return res.status(409).json({
        success: false,
        message: 'La caja misteriosa se estaba resolviendo. Vuelve a cargar la página.',
        data: box ? await serializeSurpriseBox(box) : null,
      });
    }

    console.error('Error al votar la caja misteriosa:', error);
    return res.status(500).json({ success: false, message: 'Error al votar la caja misteriosa' });
  }
};
