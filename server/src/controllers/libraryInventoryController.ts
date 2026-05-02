import { GameCondition, GameType, LibraryDonationStatus, LibraryItemLoanStatus, LibraryLoanStatus, LibraryLoanPolicy, LibraryQueueStatus, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getRPGGeekItem } from '../services/bggService';
import { ensureGameFromBgg } from '../services/gameCatalogService';
import { createBulkNotifications, createNotification } from '../services/notificationService';
import { findUserIdsByPersonSearch, normalizeSearchTerm } from '../utils/personSearch';
import { CLUB_OWNER_EMAIL, isClubOwnerEmail } from '../utils/libraryOwnership';

function getUserDisplayName(user: { name: string; profile?: { nick?: string | null } | null }) {
  return user.profile?.nick?.trim() || user.name;
}

async function getNextInternalId(): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ max_id: number | null }>>(Prisma.sql`
    SELECT MAX(CASE WHEN "internalId" ~ '^[0-9]+$' THEN "internalId"::integer ELSE NULL END) AS max_id
    FROM "LibraryItem"
  `);

  const nextId = (rows[0]?.max_id ?? 0) + 1;
  return String(nextId);
}

async function ensureLibraryCatalogEntry({
  bggId,
  gameType,
  fallbackName,
}: {
  bggId?: string | null;
  gameType: GameType;
  fallbackName: string;
}) {
  if (!bggId?.trim()) {
    return {
      gameId: null,
      name: fallbackName.trim(),
      description: null,
      thumbnail: null,
      image: null,
      yearPublished: null as number | null,
    };
  }

  if (gameType === 'ROL') {
    const prefixedId = bggId.startsWith('rpgg-') ? bggId : `rpgg-${bggId}`;
    let game = await prisma.game.findUnique({ where: { id: prefixedId } });

    if (!game) {
      const rpggItem = await getRPGGeekItem(prefixedId);
      if (!rpggItem) {
        throw new Error('Juego de RPGGeek no encontrado');
      }

      game = await prisma.game.create({
        data: {
          id: prefixedId,
          name: rpggItem.name,
          alternateNames: rpggItem.alternateNames,
          description: rpggItem.description,
          yearPublished: rpggItem.yearPublished,
          image: rpggItem.image,
          thumbnail: rpggItem.thumbnail,
          minPlayers: rpggItem.minPlayers,
          maxPlayers: rpggItem.maxPlayers,
          playingTime: rpggItem.playingTime,
          minPlaytime: rpggItem.minPlaytime,
          maxPlaytime: rpggItem.maxPlaytime,
          minAge: rpggItem.minAge,
          usersRated: rpggItem.usersRated,
          averageRating: rpggItem.averageRating,
          bayesAverage: rpggItem.bayesAverage,
          rank: rpggItem.rank,
          complexityRating: rpggItem.complexityRating,
          numOwned: rpggItem.numOwned,
          numWanting: rpggItem.numWanting,
          numWishing: rpggItem.numWishing,
          numComments: rpggItem.numComments,
          categories: rpggItem.categories,
          mechanics: rpggItem.mechanics,
          families: rpggItem.families,
          designers: rpggItem.designers,
          artists: rpggItem.artists,
          publishers: rpggItem.publishers,
          lastSyncedAt: new Date(),
        },
      });
    }

    return {
      gameId: game.id,
      name: game.name,
      description: game.description,
      thumbnail: game.thumbnail,
      image: game.image,
      yearPublished: game.yearPublished,
    };
  }

  const { game } = await ensureGameFromBgg(bggId, { refreshIfExists: false });
  return {
    gameId: game.id,
    name: game.name,
    description: game.description,
    thumbnail: game.thumbnail,
    image: game.image,
    yearPublished: game.yearPublished,
  };
}

async function findBlockingReason(itemId: string): Promise<string | null> {
  const [activeLoan, queueEntry] = await Promise.all([
    prisma.libraryLoan.findFirst({
      where: {
        libraryItemId: itemId,
        status: { in: [LibraryLoanStatus.REQUESTED, LibraryLoanStatus.ACTIVE] },
      },
      select: { id: true },
    }),
    prisma.libraryQueue.findFirst({
      where: {
        libraryItemId: itemId,
        status: { in: [LibraryQueueStatus.WAITING, LibraryQueueStatus.NOTIFIED] },
      },
      select: { id: true },
    }),
  ]);

  if (activeLoan) {
    return 'No se puede dar de baja porque el ítem tiene un préstamo o solicitud activa.';
  }

  if (queueEntry) {
    return 'No se puede dar de baja porque el ítem tiene usuarios en cola de espera.';
  }

  return null;
}

function mapInventoryItem(item: {
  id: string;
  internalId: string;
  name: string;
  gameType: GameType;
  condition: GameCondition;
  thumbnail: string | null;
  loanStatus: LibraryItemLoanStatus;
  loanPolicy: LibraryLoanPolicy;
  notes: string | null;
  ownerEmail: string | null;
  ownerUserId: string | null;
  ownerUser: { id: string; name: string; email: string; profile?: { nick?: string | null } | null } | null;
  donorUserId: string | null;
  donorUser: { id: string; name: string; email: string; profile?: { nick?: string | null } | null } | null;
  acquisitionDate: Date | null;
  bajaAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    ownerDisplayName: item.ownerUser ? getUserDisplayName(item.ownerUser) : (isClubOwnerEmail(item.ownerEmail) ? 'Club Dreadnought' : item.ownerEmail),
    donorDisplayName: item.donorUser ? getUserDisplayName(item.donorUser) : null,
    isClubOwned: isClubOwnerEmail(item.ownerEmail) && !item.ownerUserId,
    isDonated: !!item.donorUserId,
  };
}

export const searchLibraryMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Escribe al menos 2 caracteres para buscar' });
      return;
    }

    const term = normalizeSearchTerm(q);
    const matchedUserIds = await findUserIdsByPersonSearch({
      search: term,
      extraWhere: [
        Prisma.sql`u."status" = 'APPROVED'`,
        Prisma.sql`m."type" IN ('SOCIO', 'COLABORADOR', 'EN_PRUEBAS', 'FAMILIAR')`,
        Prisma.sql`m."isActive" = true`,
      ],
      includeNick: true,
      includeEmail: true,
      limit: 25,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: matchedUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
        profile: { select: { nick: true, avatar: true } },
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    res.json({
      success: true,
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        nick: user.profile?.nick ?? null,
        avatar: user.profile?.avatar ?? null,
        displayName: getUserDisplayName(user),
      })),
    });
  } catch (error) {
    console.error('Error al buscar miembros para inventario:', error);
    res.status(500).json({ success: false, message: 'Error al buscar miembros' });
  }
};

export const getAdminLibraryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
    const includeInactive = req.query.includeInactive === 'true';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: Prisma.LibraryItemWhereInput = {};

    if (!includeInactive) {
      where.bajaAt = null;
    }

    if (search) {
      where.OR = [
        { internalId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { ownerEmail: { contains: search, mode: 'insensitive' } },
        { ownerUser: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { donorUser: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.libraryItem.findMany({
        where,
        select: {
          id: true,
          internalId: true,
          name: true,
          gameType: true,
          condition: true,
          thumbnail: true,
          loanStatus: true,
          loanPolicy: true,
          notes: true,
          ownerEmail: true,
          ownerUserId: true,
          ownerUser: { select: { id: true, name: true, email: true, profile: { select: { nick: true } } } },
          donorUserId: true,
          donorUser: { select: { id: true, name: true, email: true, profile: { select: { nick: true } } } },
          acquisitionDate: true,
          bajaAt: true,
          createdAt: true,
          updatedAt: true,
          queue: {
            where: { status: { in: [LibraryQueueStatus.WAITING, LibraryQueueStatus.NOTIFIED] } },
            select: { id: true },
          },
          loans: {
            where: { status: { in: [LibraryLoanStatus.REQUESTED, LibraryLoanStatus.ACTIVE] } },
            select: { id: true, status: true },
          },
        },
        orderBy: [
          { bajaAt: 'asc' },
          { name: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.libraryItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map((item) => ({
          ...mapInventoryItem(item),
          queueCount: item.queue.length,
          hasActiveLoan: item.loans.length > 0,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(Math.ceil(total / pageSize), 1),
        },
      },
    });
  } catch (error) {
    console.error('Error al obtener inventario admin:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el inventario' });
  }
};

export const createAdminLibraryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      bggId,
      name,
      ownerType,
      ownerUserId,
      condition,
      gameType,
      notes,
      loanPolicy,
      acquisitionDate,
    } = req.body as {
      bggId?: string | null;
      name?: string;
      ownerType?: 'club' | 'member';
      ownerUserId?: string | null;
      condition?: GameCondition;
      gameType?: GameType;
      notes?: string | null;
      loanPolicy?: LibraryLoanPolicy;
      acquisitionDate?: string | null;
    };

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
      return;
    }

    if (!ownerType || (ownerType !== 'club' && ownerType !== 'member')) {
      res.status(400).json({ success: false, message: 'El propietario es obligatorio' });
      return;
    }

    if (!condition || !gameType || !loanPolicy) {
      res.status(400).json({ success: false, message: 'Faltan campos obligatorios del inventario' });
      return;
    }

    let ownerUser:
      | {
          id: string;
          email: string;
        }
      | null = null;

    if (ownerType === 'member') {
      if (!ownerUserId) {
        res.status(400).json({ success: false, message: 'Debes seleccionar un miembro propietario' });
        return;
      }

      ownerUser = await prisma.user.findUnique({
        where: { id: ownerUserId },
        select: { id: true, email: true },
      });

      if (!ownerUser) {
        res.status(404).json({ success: false, message: 'Miembro propietario no encontrado' });
        return;
      }
    }

    const catalogData = await ensureLibraryCatalogEntry({
      bggId: bggId?.trim() || null,
      gameType,
      fallbackName: name.trim(),
    });

    const libraryItem = await prisma.libraryItem.create({
      data: {
        internalId: await getNextInternalId(),
        bggId: catalogData.gameId,
        name: catalogData.name,
        description: catalogData.description,
        thumbnail: catalogData.thumbnail,
        image: catalogData.image,
        yearPublished: catalogData.yearPublished,
        gameType,
        condition,
        notes: notes?.trim() || null,
        loanPolicy,
        loanStatus: LibraryItemLoanStatus.AVAILABLE,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        ownerEmail: ownerType === 'club' ? CLUB_OWNER_EMAIL : ownerUser?.email ?? null,
        ownerUserId: ownerType === 'member' ? ownerUser?.id ?? null : null,
      },
      select: {
        id: true,
        internalId: true,
        name: true,
      },
    });

    res.status(201).json({ success: true, data: libraryItem, message: 'Ítem creado correctamente' });
  } catch (error) {
    console.error('Error al crear ítem manual:', error);
    res.status(500).json({ success: false, message: 'Error al crear el ítem del inventario' });
  }
};

export const markLibraryItemAsBaja = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { id } = req.params;

    const item = await prisma.libraryItem.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerEmail: true,
        ownerUserId: true,
        bajaAt: true,
      },
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Ítem no encontrado' });
      return;
    }

    if (item.bajaAt) {
      res.status(400).json({ success: false, message: 'El ítem ya está dado de baja' });
      return;
    }

    if (!item.ownerUserId || isClubOwnerEmail(item.ownerEmail)) {
      res.status(400).json({ success: false, message: 'Solo se pueden dar de baja ítems de particulares' });
      return;
    }

    const blockingReason = await findBlockingReason(item.id);
    if (blockingReason) {
      res.status(400).json({ success: false, message: blockingReason });
      return;
    }

    await prisma.libraryItem.update({
      where: { id: item.id },
      data: {
        bajaAt: new Date(),
        bajaByUserId: adminId,
      },
    });

    res.json({
      success: true,
      message: 'Ítem dado de baja. No se ha eliminado de la base de datos.',
    });
  } catch (error) {
    console.error('Error al dar de baja un ítem:', error);
    res.status(500).json({ success: false, message: 'Error al dar de baja el ítem' });
  }
};

export const reactivateLibraryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.libraryItem.findUnique({
      where: { id },
      select: { id: true, bajaAt: true },
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Ítem no encontrado' });
      return;
    }

    if (!item.bajaAt) {
      res.status(400).json({ success: false, message: 'El ítem no está dado de baja' });
      return;
    }

    await prisma.libraryItem.update({
      where: { id },
      data: {
        bajaAt: null,
        bajaByUserId: null,
      },
    });

    res.json({ success: true, message: 'Ítem reactivado correctamente' });
  } catch (error) {
    console.error('Error al reactivar ítem:', error);
    res.status(500).json({ success: false, message: 'Error al reactivar el ítem' });
  }
};

export const createDonationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterUserId = req.user?.userId;
    const {
      bggId,
      name,
      gameType,
      condition,
      notes,
      acquisitionDate,
    } = req.body as {
      bggId?: string | null;
      name?: string;
      gameType?: GameType;
      condition?: GameCondition;
      notes?: string | null;
      acquisitionDate?: string | null;
    };

    if (!requesterUserId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    if (!name?.trim() || !gameType || !condition) {
      res.status(400).json({ success: false, message: 'Debes rellenar nombre, tipo y estado' });
      return;
    }

    const request = await prisma.libraryDonationRequest.create({
      data: {
        requesterUserId,
        bggId: bggId?.trim() || null,
        name: name.trim(),
        gameType,
        condition,
        notes: notes?.trim() || null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'CHEMI'] }, status: 'APPROVED' },
      select: { id: true },
    });

    await createBulkNotifications({
      userIds: admins.map((admin) => admin.id),
      type: 'LIBRARY_DONATION_REQUESTED',
      title: 'Nueva propuesta de donación',
      message: `Un socio ha propuesto donar "${name.trim()}" a la ludoteca del club.`,
      metadata: { donationRequestId: request.id, gameName: name.trim() },
    });

    res.status(201).json({ success: true, message: 'Solicitud de donación enviada correctamente', data: request });
  } catch (error) {
    console.error('Error al crear solicitud de donación:', error);
    res.status(500).json({ success: false, message: 'Error al enviar la solicitud de donación' });
  }
};

export const getDonationRequestsAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.libraryDonationRequest.findMany({
      select: {
        id: true,
        bggId: true,
        name: true,
        gameType: true,
        condition: true,
        notes: true,
        acquisitionDate: true,
        status: true,
        reviewedAt: true,
        rejectionReason: true,
        requesterUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { nick: true, avatar: true } },
          },
        },
        reviewerUser: {
          select: {
            id: true,
            name: true,
            profile: { select: { nick: true } },
          },
        },
        createdLibraryItemId: true,
        createdAt: true,
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: requests.map((request) => ({
        ...request,
        requesterDisplayName: getUserDisplayName(request.requesterUser),
        reviewerDisplayName: request.reviewerUser ? getUserDisplayName(request.reviewerUser) : null,
      })),
    });
  } catch (error) {
    console.error('Error al listar solicitudes de donación:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las solicitudes de donación' });
  }
};

export const approveDonationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewerUserId = req.user?.userId;
    const { id } = req.params;
    const {
      bggId,
      name,
      gameType,
      condition,
      notes,
      loanPolicy,
      acquisitionDate,
    } = req.body as {
      bggId?: string | null;
      name?: string;
      gameType?: GameType;
      condition?: GameCondition;
      notes?: string | null;
      loanPolicy?: LibraryLoanPolicy;
      acquisitionDate?: string | null;
    };

    const request = await prisma.libraryDonationRequest.findUnique({
      where: { id },
      include: {
        requesterUser: { select: { id: true, name: true, profile: { select: { nick: true } } } },
      },
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Solicitud de donación no encontrada' });
      return;
    }

    if (request.status !== LibraryDonationStatus.PENDING) {
      res.status(400).json({ success: false, message: 'La solicitud ya fue revisada' });
      return;
    }

    const finalName = name?.trim() || request.name;
    const finalGameType = gameType || request.gameType;
    const finalCondition = condition || request.condition;
    const finalNotes = notes?.trim() || request.notes;
    const finalBggId = bggId?.trim() || request.bggId;

    if (!loanPolicy) {
      res.status(400).json({ success: false, message: 'Debes indicar la política de préstamo del ítem aprobado' });
      return;
    }

    const catalogData = await ensureLibraryCatalogEntry({
      bggId: finalBggId,
      gameType: finalGameType,
      fallbackName: finalName,
    });

    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.libraryItem.create({
        data: {
          internalId: await getNextInternalId(),
          bggId: catalogData.gameId,
          name: catalogData.name,
          description: catalogData.description,
          thumbnail: catalogData.thumbnail,
          image: catalogData.image,
          yearPublished: catalogData.yearPublished,
          gameType: finalGameType,
          condition: finalCondition,
          notes: finalNotes,
          loanPolicy,
          loanStatus: LibraryItemLoanStatus.AVAILABLE,
          acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : request.acquisitionDate,
          ownerEmail: CLUB_OWNER_EMAIL,
          ownerUserId: null,
          donorUserId: request.requesterUserId,
        },
        select: { id: true, name: true, internalId: true },
      });

      await tx.libraryDonationRequest.update({
        where: { id: request.id },
        data: {
          status: LibraryDonationStatus.APPROVED,
          reviewerUserId,
          reviewedAt: new Date(),
          rejectionReason: null,
          createdLibraryItemId: item.id,
          bggId: finalBggId,
          name: finalName,
          gameType: finalGameType,
          condition: finalCondition,
          notes: finalNotes,
          acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : request.acquisitionDate,
        },
      });

      return item;
    });

    await createNotification({
      userId: request.requesterUserId,
      type: 'LIBRARY_DONATION_APPROVED',
      title: 'Donación aprobada',
      message: `Tu donación "${createdItem.name}" ha sido aprobada y ya forma parte de la ludoteca del club.`,
      metadata: { donationRequestId: request.id, libraryItemId: createdItem.id },
    });

    res.json({ success: true, message: 'Donación aprobada y registrada en inventario', data: createdItem });
  } catch (error) {
    console.error('Error al aprobar donación:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar la donación' });
  }
};

export const rejectDonationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewerUserId = req.user?.userId;
    const { id } = req.params;
    const { rejectionReason } = req.body as { rejectionReason?: string | null };

    const request = await prisma.libraryDonationRequest.findUnique({
      where: { id },
      select: { id: true, requesterUserId: true, name: true, status: true },
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Solicitud de donación no encontrada' });
      return;
    }

    if (request.status !== LibraryDonationStatus.PENDING) {
      res.status(400).json({ success: false, message: 'La solicitud ya fue revisada' });
      return;
    }

    await prisma.libraryDonationRequest.update({
      where: { id },
      data: {
        status: LibraryDonationStatus.REJECTED,
        reviewerUserId,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });

    await createNotification({
      userId: request.requesterUserId,
      type: 'LIBRARY_DONATION_REJECTED',
      title: 'Donación no aprobada',
      message: `La propuesta de donación "${request.name}" no ha sido aprobada.`,
      metadata: { donationRequestId: request.id, rejectionReason: rejectionReason?.trim() || null },
    });

    res.json({ success: true, message: 'Solicitud de donación rechazada' });
  } catch (error) {
    console.error('Error al rechazar donación:', error);
    res.status(500).json({ success: false, message: 'Error al rechazar la donación' });
  }
};
