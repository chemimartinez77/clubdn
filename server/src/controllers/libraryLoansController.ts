import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { GameCondition, LibraryItemLoanStatus, LibraryLoanPolicy, LibraryLoanStatus, LibraryQueueStatus } from '@prisma/client';
import { getLoanConfig } from '../config/libraryLoans';

const LOAN_SELECT = {
  id: true,
  status: true,
  loanedAt: true,
  dueAt: true,
  returnedAt: true,
  renewalCount: true,
  conditionOut: true,
  conditionIn: true,
  notesOut: true,
  notesIn: true,
  createdAt: true,
  libraryItem: {
    select: { id: true, internalId: true, name: true, gameType: true, condition: true, thumbnail: true, loanStatus: true }
  },
  user: { select: { id: true, name: true } },
  loanedBy: { select: { id: true, name: true } },
  returnedBy: { select: { id: true, name: true } },
};

async function notifyAdmins(title: string, message: string, type: 'LIBRARY_LOAN_REQUESTED' | 'LIBRARY_LOAN_CONSULT_REQUESTED' | 'LIBRARY_LOAN_RENEWED', metadata: object) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'APPROVED' },
    select: { id: true }
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map(a => ({ userId: a.id, type, title, message, metadata }))
  });
}

async function notifyUser(userId: string, type: 'LIBRARY_LOAN_CONFIRMED' | 'LIBRARY_LOAN_RETURNED' | 'LIBRARY_QUEUE_AVAILABLE', title: string, message: string, metadata: object) {
  await prisma.notification.create({ data: { userId, type, title, message, metadata } });
}

async function notifyNextInQueue(libraryItemId: string, itemName: string) {
  const nextInQueue = await prisma.libraryQueue.findFirst({
    where: { libraryItemId, status: LibraryQueueStatus.WAITING },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true }
  });

  if (!nextInQueue) return;

  const now = new Date();
  await prisma.libraryQueue.update({
    where: { id: nextInQueue.id },
    data: { status: LibraryQueueStatus.NOTIFIED, notifiedAt: now }
  });
  await notifyUser(
    nextInQueue.userId,
    'LIBRARY_QUEUE_AVAILABLE',
    'Juego disponible',
    `"${itemName}" ya está disponible. ¡Solicita tu préstamo antes de que lo haga otro socio!`,
    { itemId: libraryItemId, itemName }
  );
}

/**
 * GET /api/library-loans/search-item?internalId=...
 * Admin: busca un ítem por internalId con contexto operativo completo.
 */
export const searchItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { internalId } = req.query;
    if (!internalId || typeof internalId !== 'string') {
      res.status(400).json({ success: false, message: 'internalId es obligatorio' });
      return;
    }

    const item = await prisma.libraryItem.findUnique({
      where: { internalId },
      select: {
        id: true, internalId: true, name: true, gameType: true, condition: true,
        thumbnail: true, loanStatus: true, isLoanable: true, loanPolicy: true, notes: true, ownerEmail: true,
        loans: {
          where: { status: { in: ['REQUESTED', 'ACTIVE'] } },
          select: LOAN_SELECT,
          take: 1
        },
        queue: {
          where: { status: { in: ['WAITING', 'NOTIFIED'] } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, status: true, createdAt: true, user: { select: { id: true, name: true } } }
        }
      }
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Ítem no encontrado' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error en searchItem:', error);
    res.status(500).json({ success: false, message: 'Error al buscar el ítem' });
  }
};

/**
 * POST /api/library-loans
 * Socio autenticado: solicita un préstamo.
 */
export const requestLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const { internalId, libraryItemId } = req.body;
    if (!internalId && !libraryItemId) {
      res.status(400).json({ success: false, message: 'Se requiere internalId o libraryItemId' });
      return;
    }

    const { loanEnabled, loanMaxActivePerUser } = await getLoanConfig();
    if (!loanEnabled) { res.status(503).json({ success: false, message: 'El sistema de préstamos está temporalmente desactivado' }); return; }

    const item = await prisma.libraryItem.findUnique({
      where: internalId ? { internalId } : { id: libraryItemId },
      select: { id: true, internalId: true, name: true, loanStatus: true, isLoanable: true, loanPolicy: true }
    });

    if (!item) { res.status(404).json({ success: false, message: 'Ítem no encontrado' }); return; }
    if (!item.isLoanable) { res.status(400).json({ success: false, message: 'Este ítem no está disponible para préstamo' }); return; }

    if (item.loanPolicy !== LibraryLoanPolicy.LOANABLE) { res.status(400).json({ success: false, message: 'Este item no esta disponible para prestamo' }); return; }
    if (loanMaxActivePerUser > 0) {
      const activeCount = await prisma.libraryLoan.count({
        where: { userId, status: { in: [LibraryLoanStatus.REQUESTED, LibraryLoanStatus.ACTIVE] } }
      });
      if (activeCount >= loanMaxActivePerUser) {
        res.status(400).json({ success: false, message: `Has alcanzado el maximo de ${loanMaxActivePerUser} prestamo(s) activos o pendientes` });
        return;
      }
    }

    // Atomically claim the item inside the transaction to prevent race conditions:
    // updateMany with loanStatus=AVAILABLE guard ensures only one concurrent request wins.
    let loan;
    try {
      loan = await prisma.$transaction(async (tx) => {
        const claimed = await tx.libraryItem.updateMany({
          where: { id: item.id, loanStatus: LibraryItemLoanStatus.AVAILABLE },
          data: { loanStatus: LibraryItemLoanStatus.REQUESTED },
        });
        if (claimed.count === 0) {
          throw Object.assign(new Error('ITEM_NOT_AVAILABLE'), { code: 'ITEM_NOT_AVAILABLE' });
        }

        const newLoan = await tx.libraryLoan.create({
          data: { libraryItemId: item.id, userId, status: LibraryLoanStatus.REQUESTED },
          select: LOAN_SELECT,
        });

        // Mark any active queue entry for this user as FULFILLED
        await tx.libraryQueue.updateMany({
          where: {
            libraryItemId: item.id,
            userId,
            status: { in: [LibraryQueueStatus.WAITING, LibraryQueueStatus.NOTIFIED] },
          },
          data: { status: LibraryQueueStatus.FULFILLED },
        });

        return newLoan;
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'ITEM_NOT_AVAILABLE') {
        res.status(400).json({ success: false, message: 'El ítem no está disponible actualmente' });
        return;
      }
      throw err;
    }

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await notifyAdmins(
      'Nueva solicitud de préstamo',
      `${requester?.name ?? 'Un socio'} ha solicitado el préstamo de "${item.name}" (ID: ${item.internalId})`,
      'LIBRARY_LOAN_REQUESTED',
      { loanId: loan.id, itemId: item.id, itemName: item.name }
    );

    res.status(201).json({ success: true, message: 'Solicitud de préstamo registrada', data: loan });
  } catch (error) {
    console.error('Error en requestLoan:', error);
    res.status(500).json({ success: false, message: 'Error al registrar la solicitud' });
  }
};

/**
 * PATCH /api/library-loans/:loanId/confirm-delivery
 * Admin: confirma la entrega física (REQUESTED → ACTIVE).
 */
export const confirmDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { loanId } = req.params;

    const loan = await prisma.libraryLoan.findUnique({
      where: { id: loanId },
      select: { id: true, status: true, userId: true, libraryItemId: true, libraryItem: { select: { name: true, internalId: true } } }
    });

    if (!loan) { res.status(404).json({ success: false, message: 'Préstamo no encontrado' }); return; }
    if (loan.status !== 'REQUESTED') { res.status(400).json({ success: false, message: 'Solo se pueden confirmar solicitudes pendientes' }); return; }

    const { loanDurationDays } = await getLoanConfig();
    const now = new Date();
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + loanDurationDays);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.libraryLoan.update({
        where: { id: loanId },
        data: { status: LibraryLoanStatus.ACTIVE, loanedAt: now, dueAt, loanedByUserId: adminId },
        select: LOAN_SELECT
      });
      await tx.libraryItem.update({ where: { id: loan.libraryItemId }, data: { loanStatus: LibraryItemLoanStatus.ON_LOAN } });
      return updatedLoan;
    });

    await notifyUser(
      loan.userId,
      'LIBRARY_LOAN_CONFIRMED',
      'Préstamo confirmado',
      `Tu préstamo de "${loan.libraryItem.name}" ha sido confirmado. Fecha de devolución: ${dueAt.toLocaleDateString('es-ES')}`,
      { loanId: loan.id, itemName: loan.libraryItem.name, dueAt: dueAt.toISOString() }
    );

    res.json({ success: true, message: 'Entrega confirmada', data: updated });
  } catch (error) {
    console.error('Error en confirmDelivery:', error);
    res.status(500).json({ success: false, message: 'Error al confirmar la entrega' });
  }
};

/**
 * POST /api/library-loans/:loanId/renew
 * Socio: renueva su préstamo activo si no hay lista de espera.
 */
export const renewLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { loanId } = req.params;

    const loan = await prisma.libraryLoan.findUnique({
      where: { id: loanId },
      select: { id: true, status: true, userId: true, dueAt: true, renewalCount: true, libraryItemId: true, libraryItem: { select: { name: true, internalId: true } } }
    });

    if (!loan) { res.status(404).json({ success: false, message: 'Préstamo no encontrado' }); return; }
    if (loan.userId !== userId) { res.status(403).json({ success: false, message: 'No tienes permiso para renovar este préstamo' }); return; }
    if (loan.status !== 'ACTIVE') { res.status(400).json({ success: false, message: 'Solo se pueden renovar préstamos activos' }); return; }

    const hasQueue = await prisma.libraryQueue.findFirst({
      where: { libraryItemId: loan.libraryItemId, status: { in: ['WAITING', 'NOTIFIED'] } }
    });
    if (hasQueue) {
      res.status(400).json({ success: false, message: 'No es posible renovar: hay socios en lista de espera para este juego' });
      return;
    }

    const { loanDurationDays } = await getLoanConfig();
    const newDueAt = new Date(loan.dueAt ?? new Date());
    newDueAt.setDate(newDueAt.getDate() + loanDurationDays);

    const updated = await prisma.libraryLoan.update({
      where: { id: loanId },
      data: { dueAt: newDueAt, renewalCount: { increment: 1 } },
      select: LOAN_SELECT
    });

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await notifyAdmins(
      'Renovación de préstamo',
      `${requester?.name ?? 'Un socio'} ha renovado el préstamo de "${loan.libraryItem.name}" (ID: ${loan.libraryItem.internalId}). Nueva fecha de devolución: ${newDueAt.toLocaleDateString('es-ES')}`,
      'LIBRARY_LOAN_RENEWED',
      { loanId: loan.id, itemName: loan.libraryItem.name, newDueAt: newDueAt.toISOString() }
    );

    res.json({ success: true, message: 'Préstamo renovado', data: updated });
  } catch (error) {
    console.error('Error en renewLoan:', error);
    res.status(500).json({ success: false, message: 'Error al renovar el préstamo' });
  }
};

/**
 * POST /api/library-loans/:loanId/return
 * Admin: registra la devolución física.
 */
export const returnLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const { loanId } = req.params;
    const { conditionIn, notesIn, nextLoanStatus } = req.body as {
      conditionIn?: GameCondition;
      notesIn?: string;
      nextLoanStatus?: LibraryItemLoanStatus;
    };

    const loan = await prisma.libraryLoan.findUnique({
      where: { id: loanId },
      select: { id: true, status: true, userId: true, libraryItemId: true, conditionOut: true, libraryItem: { select: { name: true, internalId: true, condition: true } } }
    });

    if (!loan) { res.status(404).json({ success: false, message: 'Préstamo no encontrado' }); return; }
    if (loan.status !== 'ACTIVE') { res.status(400).json({ success: false, message: 'Solo se pueden devolver préstamos activos' }); return; }

    const validFinalStatuses: LibraryItemLoanStatus[] = [
      LibraryItemLoanStatus.AVAILABLE,
      LibraryItemLoanStatus.MAINTENANCE,
      LibraryItemLoanStatus.BLOCKED,
    ];
    if (nextLoanStatus && !validFinalStatuses.includes(nextLoanStatus)) {
      res.status(400).json({ success: false, message: 'Estado final del ítem no válido' });
      return;
    }

    const now = new Date();
    const finalItemStatus: LibraryItemLoanStatus = nextLoanStatus ?? LibraryItemLoanStatus.AVAILABLE;

    const conditionChanged = conditionIn && conditionIn !== loan.libraryItem.condition;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.libraryLoan.update({
        where: { id: loanId },
        data: { status: LibraryLoanStatus.RETURNED, returnedAt: now, returnedByUserId: adminId, conditionIn, notesIn },
        select: LOAN_SELECT
      });
      await tx.libraryItem.update({
        where: { id: loan.libraryItemId },
        data: {
          loanStatus: finalItemStatus,
          ...(conditionChanged ? { condition: conditionIn } : {})
        }
      });
      return updatedLoan;
    });

    await notifyUser(
      loan.userId,
      'LIBRARY_LOAN_RETURNED',
      'Devolución registrada',
      `La devolución de "${loan.libraryItem.name}" ha sido registrada. ¡Gracias!`,
      { loanId: loan.id, itemName: loan.libraryItem.name }
    );

    // Si el ítem vuelve a estar disponible, notificar al siguiente en cola
    if (finalItemStatus === LibraryItemLoanStatus.AVAILABLE) {
      const nextInQueue = await prisma.libraryQueue.findFirst({
        where: { libraryItemId: loan.libraryItemId, status: LibraryQueueStatus.WAITING },
        orderBy: { createdAt: 'asc' },
        select: { id: true, userId: true }
      });
      if (nextInQueue) {
        await prisma.libraryQueue.update({ where: { id: nextInQueue.id }, data: { status: LibraryQueueStatus.NOTIFIED, notifiedAt: now } });
        await notifyUser(
          nextInQueue.userId,
          'LIBRARY_QUEUE_AVAILABLE',
          'Juego disponible',
          `"${loan.libraryItem.name}" ya está disponible. ¡Solicita tu préstamo antes de que lo haga otro socio!`,
          { itemId: loan.libraryItemId, itemName: loan.libraryItem.name }
        );
      }
    }

    res.json({ success: true, message: 'Devolución registrada', data: updated });
  } catch (error) {
    console.error('Error en returnLoan:', error);
    res.status(500).json({ success: false, message: 'Error al registrar la devolución' });
  }
};

/**
 * POST /api/library-loans/:loanId/cancel
 * Socio o Admin: cancela una solicitud pendiente (REQUESTED).
 */
export const cancelLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { loanId } = req.params;

    const loan = await prisma.libraryLoan.findUnique({
      where: { id: loanId },
      select: { id: true, status: true, userId: true, libraryItemId: true, libraryItem: { select: { name: true } } }
    });

    if (!loan) { res.status(404).json({ success: false, message: 'Préstamo no encontrado' }); return; }

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isAdmin && loan.userId !== userId) { res.status(403).json({ success: false, message: 'No tienes permiso' }); return; }
    if (loan.status !== 'REQUESTED') { res.status(400).json({ success: false, message: 'Solo se pueden cancelar solicitudes pendientes' }); return; }

    await prisma.$transaction(async (tx) => {
      await tx.libraryLoan.update({ where: { id: loanId }, data: { status: LibraryLoanStatus.CANCELLED } });
      await tx.libraryItem.update({ where: { id: loan.libraryItemId }, data: { loanStatus: LibraryItemLoanStatus.AVAILABLE } });
    });

    await notifyNextInQueue(loan.libraryItemId, loan.libraryItem.name);

    res.json({ success: true, message: 'Solicitud cancelada' });
  } catch (error) {
    console.error('Error en cancelLoan:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar la solicitud' });
  }
};

/**
 * GET /api/library-loans/me
 * Socio: sus préstamos activos e historial.
 */
export const getMyLoans = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const [active, history, queue] = await Promise.all([
      prisma.libraryLoan.findMany({
        where: { userId, status: { in: ['REQUESTED', 'ACTIVE'] } },
        select: LOAN_SELECT,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.libraryLoan.findMany({
        where: { userId, status: { in: ['RETURNED', 'CANCELLED'] } },
        select: LOAN_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.libraryQueue.findMany({
        where: { userId, status: { in: [LibraryQueueStatus.WAITING, LibraryQueueStatus.NOTIFIED] } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, status: true, notifiedAt: true, createdAt: true,
          libraryItem: { select: { id: true, name: true, thumbnail: true, loanStatus: true } },
        },
      }),
    ]);

    res.json({ success: true, data: { active, history, queue } });
  } catch (error) {
    console.error('Error en getMyLoans:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los préstamos' });
  }
};

/**
 * GET /api/library-loans/active
 * Admin: todos los préstamos activos o solicitados.
 */
export const getActiveLoans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const loans = await prisma.libraryLoan.findMany({
      where: { status: { in: ['REQUESTED', 'ACTIVE'] } },
      select: LOAN_SELECT,
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: loans });
  } catch (error) {
    console.error('Error en getActiveLoans:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los préstamos activos' });
  }
};

/**
 * GET /api/library-loans/queue/:itemId
 * Admin: cola de espera de un ítem.
 */
export const getItemQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const queue = await prisma.libraryQueue.findMany({
      where: { libraryItemId: itemId, status: { in: ['WAITING', 'NOTIFIED'] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, notifiedAt: true, createdAt: true, user: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data: queue });
  } catch (error) {
    console.error('Error en getItemQueue:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la cola' });
  }
};

/**
 * POST /api/library-loans/queue
 * Socio: apuntarse a la cola de espera de un ítem.
 */
export const joinQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const { libraryItemId } = req.body;
    if (!libraryItemId) { res.status(400).json({ success: false, message: 'libraryItemId es obligatorio' }); return; }

    const { loanEnabled } = await getLoanConfig();
    if (!loanEnabled) { res.status(503).json({ success: false, message: 'El sistema de préstamos está temporalmente desactivado' }); return; }

    const item = await prisma.libraryItem.findUnique({
      where: { id: libraryItemId },
      select: { id: true, name: true, loanStatus: true, isLoanable: true, loanPolicy: true }
    });

    if (!item) { res.status(404).json({ success: false, message: 'Ítem no encontrado' }); return; }
    if (!item.isLoanable) { res.status(400).json({ success: false, message: 'Este ítem no está disponible para préstamo' }); return; }
    if (item.loanStatus === 'AVAILABLE') { res.status(400).json({ success: false, message: 'El ítem está disponible: solicita el préstamo directamente' }); return; }

    if (item.loanPolicy !== LibraryLoanPolicy.LOANABLE) { res.status(400).json({ success: false, message: 'Este item no esta disponible para prestamo' }); return; }

    const activeLoan = await prisma.libraryLoan.findFirst({
      where: { libraryItemId, userId, status: { in: ['REQUESTED', 'ACTIVE'] } }
    });
    if (activeLoan) { res.status(400).json({ success: false, message: 'Ya tienes un préstamo activo o pendiente de este juego' }); return; }

    // @@unique garantiza que no puede haber duplicado activo, pero el estado CANCELLED permite re-entrar
    const existing = await prisma.libraryQueue.findFirst({
      where: { libraryItemId, userId, status: { in: ['WAITING', 'NOTIFIED'] } }
    });
    if (existing) { res.status(400).json({ success: false, message: 'Ya estás en la lista de espera de este juego' }); return; }

    // Upsert para reutilizar registro cancelado anterior si existe
    const entry = await prisma.libraryQueue.upsert({
      where: { libraryItemId_userId: { libraryItemId, userId } },
      update: { status: LibraryQueueStatus.WAITING, notifiedAt: null, createdAt: new Date() },
      create: { libraryItemId, userId, status: LibraryQueueStatus.WAITING },
      select: { id: true, status: true, createdAt: true }
    });

    res.status(201).json({ success: true, message: 'Apuntado a la lista de espera', data: entry });
  } catch (error) {
    console.error('Error en joinQueue:', error);
    res.status(500).json({ success: false, message: 'Error al apuntarse a la lista' });
  }
};

/**
 * DELETE /api/library-loans/queue/:itemId
 * Socio: salir de la cola de espera.
 */
export const leaveQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const { itemId } = req.params;

    const entry = await prisma.libraryQueue.findFirst({
      where: { libraryItemId: itemId, userId, status: { in: ['WAITING', 'NOTIFIED'] } }
    });

    if (!entry) { res.status(404).json({ success: false, message: 'No estás en la lista de espera de este juego' }); return; }

    await prisma.libraryQueue.update({ where: { id: entry.id }, data: { status: LibraryQueueStatus.CANCELLED } });

    res.json({ success: true, message: 'Saliste de la lista de espera' });
  } catch (error) {
    console.error('Error en leaveQueue:', error);
    res.status(500).json({ success: false, message: 'Error al salir de la lista' });
  }
};

/**
 * PATCH /api/library-loans/items/:itemId/loanable
 * Admin: activa o desactiva el préstamo de un ítem.
 */
export const toggleLoanable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { isLoanable } = req.body;

    if (typeof isLoanable !== 'boolean') {
      res.status(400).json({ success: false, message: 'isLoanable debe ser un booleano' });
      return;
    }

    const item = await prisma.libraryItem.update({
      where: { id: itemId },
      data: { isLoanable, loanPolicy: isLoanable ? LibraryLoanPolicy.LOANABLE : LibraryLoanPolicy.NOT_LOANABLE },
      select: { id: true, name: true, internalId: true, isLoanable: true, loanPolicy: true, loanStatus: true },
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error en toggleLoanable:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el ítem' });
  }
};

/**
 * PATCH /api/library-loans/items/:itemId/loan-policy
 * Admin: define si un item es prestable, consultable o no prestable.
 */
export const updateLoanPolicy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { loanPolicy } = req.body as { loanPolicy?: LibraryLoanPolicy };

    const validPolicies = [
      LibraryLoanPolicy.NOT_LOANABLE,
      LibraryLoanPolicy.CONSULT,
      LibraryLoanPolicy.LOANABLE,
    ];
    if (!loanPolicy || !validPolicies.includes(loanPolicy)) {
      res.status(400).json({ success: false, message: 'loanPolicy no valido' });
      return;
    }

    const item = await prisma.libraryItem.update({
      where: { id: itemId },
      data: {
        loanPolicy,
        isLoanable: loanPolicy === LibraryLoanPolicy.LOANABLE,
      },
      select: { id: true, name: true, internalId: true, isLoanable: true, loanPolicy: true, loanStatus: true },
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error en updateLoanPolicy:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el item' });
  }
};

/**
 * POST /api/library-loans/consult
 * Socio: consulta a admins por un item marcado como CONSULT.
 */
export const consultLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const { libraryItemId } = req.body;
    if (!libraryItemId) { res.status(400).json({ success: false, message: 'libraryItemId es obligatorio' }); return; }

    const { loanEnabled } = await getLoanConfig();
    if (!loanEnabled) { res.status(503).json({ success: false, message: 'El sistema de prestamos esta temporalmente desactivado' }); return; }

    const item = await prisma.libraryItem.findUnique({
      where: { id: libraryItemId },
      select: { id: true, internalId: true, name: true, loanPolicy: true }
    });
    if (!item) { res.status(404).json({ success: false, message: 'Item no encontrado' }); return; }
    if (item.loanPolicy !== LibraryLoanPolicy.CONSULT) {
      res.status(400).json({ success: false, message: 'Este item no requiere consulta de prestamo' });
      return;
    }

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await notifyAdmins(
      'Consulta de prestamo',
      `${requester?.name ?? 'Un socio'} quiere consultar el prestamo de "${item.name}" (ID: ${item.internalId})`,
      'LIBRARY_LOAN_CONSULT_REQUESTED',
      { itemId: item.id, itemName: item.name, internalId: item.internalId, requesterId: userId }
    );

    res.status(201).json({ success: true, message: 'Consulta enviada a administracion' });
  } catch (error) {
    console.error('Error en consultLoan:', error);
    res.status(500).json({ success: false, message: 'Error al enviar la consulta' });
  }
};
