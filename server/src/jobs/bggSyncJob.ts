import { BggSyncJobStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ensureGameFromBgg, sleep } from '../services/gameCatalogService';

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

async function markStaleJobsAsPending() {
  await prisma.bggSyncJob.updateMany({
    where: { status: BggSyncJobStatus.PROCESSING },
    data: { status: BggSyncJobStatus.PENDING, startedAt: null, error: 'Reanudado tras reinicio del servidor' },
  });
}

async function processJob(jobId: string) {
  const job = await prisma.bggSyncJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return;
  }

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
            wishlistPriority: item.wishlistPriority ?? null,
            locationId: item.own ? (job.locationId ?? undefined) : undefined,
          },
          create: {
            userId: job.userId,
            gameId: item.bggId,
            own: item.own ?? true,
            wishlist: item.wishlist ?? false,
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
    const job = await prisma.bggSyncJob.findFirst({
      where: { status: BggSyncJobStatus.PENDING },
      orderBy: { requestedAt: 'asc' },
      select: { id: true },
    });

    if (job) {
      await processJob(job.id);
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
  await markStaleJobsAsPending();
  setInterval(() => {
    void processNextPendingJob();
  }, BGG_SYNC_POLL_MS);
  void processNextPendingJob();
}
