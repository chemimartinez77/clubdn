import { BggSyncJobStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { getBGGCollection } from '../services/bggService';
import { ensureGameFromBgg, estimateBggSyncSeconds, sleep } from '../services/gameCatalogService';

const BGG_SYNC_POLL_MS = 5000;
const BGG_SYNC_DELAY_MS = 1200;

type ImportPayloadItem = {
  bggId: string;
  title: string;
  thumbnail: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  own: boolean;
  wishlist: boolean;
  previouslyOwned: boolean;
  wishlistPriority: number | null;
};

type DeletePayloadItem = {
  gameId: string;
  title: string;
};

let workerStarted = false;
let processing = false;

function parseImportPayload(payload: Prisma.JsonValue): ImportPayloadItem[] {
  return Array.isArray(payload) ? payload as ImportPayloadItem[] : [];
}

function parseDeletePayload(payload: Prisma.JsonValue): DeletePayloadItem[] {
  return Array.isArray(payload) ? payload as DeletePayloadItem[] : [];
}

async function markStaleJobsAsQueued() {
  await prisma.bggSyncJob.updateMany({
    where: { status: BggSyncJobStatus.PROCESSING },
    data: { status: BggSyncJobStatus.QUEUED, startedAt: null, error: 'Reanudado tras reinicio del servidor' },
  });
}

/**
 * Calcula el diff entre la colección BGG del usuario y su ludoteca en DB,
 * y actualiza el job a PENDING con los payloads calculados.
 * Si BGG falla, marca el job como FAILED.
 */
async function computeAndSaveDiff(jobId: string) {
  const job = await prisma.bggSyncJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== BggSyncJobStatus.QUEUED) return;

  try {
    const [bggCollection, dbGames] = await Promise.all([
      getBGGCollection(job.bggUsername),
      prisma.userGame.findMany({
        where: { userId: job.userId, status: 'active' },
        select: {
          own: true,
          wishlist: true,
          previouslyOwned: true,
          wishlistPriority: true,
          gameId: true,
          game: { select: { id: true, name: true } },
        },
      }),
    ]);

    const dbGameMap = new Map(dbGames.map((g) => [g.gameId, g] as const));
    const bggIds = new Set(bggCollection.map((game) => game.bggId));

    const toImport = bggCollection.filter((bggGame) => {
      const existing = dbGameMap.get(bggGame.bggId);
      if (!existing) return true;
      if (bggGame.own !== existing.own) return true;
      if (bggGame.wishlist !== existing.wishlist) return true;
      if (bggGame.previouslyOwned !== existing.previouslyOwned) return true;
      if (bggGame.wishlist && bggGame.wishlistPriority !== existing.wishlistPriority) return true;
      return false;
    });

    const toDelete = dbGames
      .filter((game) => (game.own || game.wishlist || game.previouslyOwned) && !bggIds.has(game.gameId))
      .map((game) => ({ gameId: game.gameId, title: game.game.name }));

    const importIds = toImport.map((item) => item.bggId);
    const existingCatalogGames = importIds.length > 0
      ? await prisma.game.findMany({ where: { id: { in: importIds } }, select: { id: true } })
      : [];

    const existingCatalogIds = new Set(existingCatalogGames.map((game) => game.id));
    const newCatalogItems = toImport.filter((item) => !existingCatalogIds.has(item.bggId)).length;
    const estimatedSeconds = estimateBggSyncSeconds(newCatalogItems, toImport.length + toDelete.length);

    await prisma.bggSyncJob.update({
      where: { id: jobId },
      data: {
        status: BggSyncJobStatus.PENDING,
        importPayload: toImport as unknown as Prisma.JsonArray,
        deletePayload: toDelete as unknown as Prisma.JsonArray,
        totalToImport: toImport.length,
        totalToDelete: toDelete.length,
        estimatedSeconds,
      },
    });
  } catch (error) {
    console.error(`[BGG_SYNC] Error calculando diff para job ${jobId}:`, error);
    await prisma.bggSyncJob.update({
      where: { id: jobId },
      data: {
        status: BggSyncJobStatus.FAILED,
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Error al consultar BGG',
      },
    });
  }
}

async function processJob(jobId: string) {
  const job = await prisma.bggSyncJob.findUnique({ where: { id: jobId } });

  if (!job) return;

  // Si fue cancelado entre el findFirst y el processJob, saltar
  if (job.status === BggSyncJobStatus.CANCELLED) return;

  const toImport = parseImportPayload(job.importPayload);
  const toDelete = parseDeletePayload(job.deletePayload);

  let processed = 0;
  let imported = 0;
  let linkedExisting = 0;
  let failed = 0;

  await prisma.bggSyncJob.update({
    where: { id: job.id },
    data: {
      status: BggSyncJobStatus.PROCESSING,
      startedAt: new Date(),
      error: null,
      processed: 0,
      imported: 0,
      linkedExisting: 0,
      failed: 0,
      deleted: 0,
    },
  });

  try {
    for (const item of toImport) {
      try {
        const existingGame = await prisma.game.findUnique({
          where: { id: item.bggId },
          select: { id: true },
        });

        if (!existingGame) {
          try {
            await ensureGameFromBgg(item.bggId);
          } catch {
            // Si BGG no devuelve datos completos, crear una entrada mínima con los datos del payload
            await prisma.game.upsert({
              where: { id: item.bggId },
              create: {
                id: item.bggId,
                name: item.title,
                thumbnail: item.thumbnail,
                yearPublished: item.yearPublished,
                minPlayers: item.minPlayers,
                maxPlayers: item.maxPlayers,
              },
              update: {},
            });
          }
          imported += 1;
          await sleep(BGG_SYNC_DELAY_MS);
        } else {
          linkedExisting += 1;
        }

        await prisma.userGame.upsert({
          where: {
            userId_gameId: {
              userId: job.userId,
              gameId: item.bggId,
            },
          },
          update: {
            status: 'active',
            own: item.own ?? true,
            wishlist: item.wishlist ?? false,
            previouslyOwned: item.previouslyOwned ?? false,
            wishlistPriority: item.wishlistPriority ?? null,
            locationId: item.own ? (job.locationId ?? undefined) : undefined,
          },
          create: {
            userId: job.userId,
            gameId: item.bggId,
            own: item.own ?? true,
            wishlist: item.wishlist ?? false,
            previouslyOwned: item.previouslyOwned ?? false,
            wishlistPriority: item.wishlistPriority ?? null,
            locationId: item.own ? (job.locationId ?? null) : null,
          },
        });
      } catch (error) {
        failed += 1;
        console.error(`[BGG_SYNC] Error importando ${item.bggId} para job ${job.id}:`, error);
      }

      processed += 1;
      await prisma.bggSyncJob.update({
        where: { id: job.id },
        data: { processed, imported, linkedExisting, failed },
      });
    }

    let deleted = 0;
    if (toDelete.length > 0) {
      const deleteResult = await prisma.userGame.updateMany({
        where: {
          userId: job.userId,
          gameId: { in: toDelete.map((item) => item.gameId) },
        },
        data: { status: 'deleted' },
      });
      deleted = deleteResult.count;
      processed += toDelete.length;
      await prisma.bggSyncJob.update({
        where: { id: job.id },
        data: { processed, deleted },
      });
    }

    await prisma.userProfile.upsert({
      where: { userId: job.userId },
      update: { lastBggSync: new Date() },
      create: { userId: job.userId, lastBggSync: new Date() },
    });

    await prisma.bggSyncJob.update({
      where: { id: job.id },
      data: {
        status: BggSyncJobStatus.COMPLETED,
        finishedAt: new Date(),
        processed,
        imported,
        linkedExisting,
        failed,
      },
    });
  } catch (error) {
    console.error(`[BGG_SYNC] Error fatal en job ${job.id}:`, error);
    await prisma.bggSyncJob.update({
      where: { id: job.id },
      data: {
        status: BggSyncJobStatus.FAILED,
        finishedAt: new Date(),
        processed,
        imported,
        linkedExisting,
        failed,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      },
    });
  }
}

async function processNextPendingJob() {
  if (processing) {
    return;
  }

  processing = true;

  try {
    // Primero: calcular diff de jobs QUEUED (fase rápida, 1 a la vez)
    const queuedJob = await prisma.bggSyncJob.findFirst({
      where: { status: BggSyncJobStatus.QUEUED },
      orderBy: { requestedAt: 'asc' },
      select: { id: true },
    });

    if (queuedJob) {
      await computeAndSaveDiff(queuedJob.id);
      return; // en el próximo tick se procesará como PENDING
    }

    // Después: importar jobs PENDING con diff ya calculado
    const pendingJob = await prisma.bggSyncJob.findFirst({
      where: { status: BggSyncJobStatus.PENDING },
      orderBy: { requestedAt: 'asc' },
      select: { id: true },
    });

    if (pendingJob) {
      await processJob(pendingJob.id);
    }
  } finally {
    processing = false;
  }
}

export async function pokeBggSyncWorker() {
  void processNextPendingJob();
}

export async function startBggSyncJobWorker() {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  await markStaleJobsAsQueued();
  setInterval(() => {
    void processNextPendingJob();
  }, BGG_SYNC_POLL_MS);
  void processNextPendingJob();
}
