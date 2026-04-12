// server/src/controllers/marketplaceController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../config/database';
import {
  notifyMarketplaceNewMessage,
  notifyMarketplaceNewConversation,
  notifyMarketplaceNewOffer,
  notifyMarketplaceOfferAccepted,
  notifyMarketplaceOfferRejected,
  notifyMarketplaceOfferCountered,
} from '../services/notificationService';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGES = 4;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const CANCELLATION_REASONS = [
  'Me he arrepentido',
  'No me llega el presupuesto',
  'Ya lo conseguí por otro lado',
  'No localizo el artículo',
  'He decidido no venderlo',
  'El comprador no responde',
] as const;

const VALID_CATEGORIES = [
  'JUEGOS_MESA', 'ROL', 'WARGAMES', 'MINIATURAS', 'ACCESORIOS', 'MATERIAL_RELACIONADO',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const listingPublicSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  price: true,
  status: true,
  images: true,
  contactExtra: true,
  isArchived: true,
  isHidden: true,
  viewsCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true }
  },
};

// ─── LISTINGS ────────────────────────────────────────────────────────────────

/**
 * GET /api/marketplace/listings
 * Listado público: solo PUBLICADO, no archivado, no oculto
 */
export const getListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = '1',
      pageSize = '20',
    } = req.query as Record<string, string>;

    const validSortBy = ['createdAt', 'price', 'title'].includes(sortBy) ? sortBy : 'createdAt';
    const validSortDir = sortDir === 'asc' ? 'asc' : 'desc';
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize)));
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {
      status: 'PUBLICADO',
      isArchived: false,
      isHidden: false,
    };

    if (q?.trim()) {
      where.OR = [
        { title: { contains: q.trim(), mode: 'insensitive' } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        select: listingPublicSelect,
        orderBy: { [validSortBy]: validSortDir },
        skip,
        take: pageSizeNum,
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum),
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo listado mercadillo:', error);
    res.status(500).json({ success: false, message: 'Error al obtener anuncios' });
  }
};

/**
 * GET /api/marketplace/listings/mine
 * Mis anuncios (incluye archivados)
 */
export const getMyListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const listings = await prisma.marketplaceListing.findMany({
      where: { authorId: userId },
      select: listingPublicSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: { listings } });
  } catch (error) {
    console.error('Error obteniendo mis anuncios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tus anuncios' });
  }
};

/**
 * GET /api/marketplace/listings/:id
 * Detalle de un anuncio
 */
export const getListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: listingPublicSelect,
    });

    if (!listing) {
      res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
      return;
    }

    // Solo el autor puede ver archivados/ocultos (y admins lo ven via ruta admin)
    if ((listing.isArchived || listing.isHidden) && listing.author.id !== userId) {
      res.status(404).json({ success: false, message: 'Anuncio no disponible' });
      return;
    }

    res.status(200).json({ success: true, data: { listing } });
  } catch (error) {
    console.error('Error obteniendo anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el anuncio' });
  }
};

/**
 * POST /api/marketplace/listings/:id/view
 * Registra una apertura del detalle para cualquier usuario distinto del autor
 */
export const recordListingView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        isArchived: true,
        isHidden: true,
        viewsCount: true,
      },
    });

    if (!listing) {
      res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
      return;
    }

    if ((listing.isArchived || listing.isHidden) && listing.authorId !== userId) {
      res.status(404).json({ success: false, message: 'Anuncio no disponible' });
      return;
    }

    if (listing.authorId === userId) {
      res.status(200).json({ success: true, data: { viewsCount: listing.viewsCount, counted: false } });
      return;
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      select: { viewsCount: true },
    });

    res.status(200).json({ success: true, data: { viewsCount: updated.viewsCount, counted: true } });
  } catch (error) {
    console.error('Error registrando visita de anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al registrar la visita' });
  }
};

/**
 * POST /api/marketplace/listings
 * Crear anuncio (publicación directa)
 */
export const createListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { title, description, category, price, contactExtra } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ success: false, message: 'El título es obligatorio' });
      return;
    }
    if (!description?.trim()) {
      res.status(400).json({ success: false, message: 'La descripción es obligatoria' });
      return;
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ success: false, message: 'Categoría no válida' });
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({ success: false, message: 'El precio es obligatorio y debe ser mayor que 0' });
      return;
    }

    // Subir imágenes
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > MAX_IMAGES) {
      res.status(400).json({ success: false, message: `Máximo ${MAX_IMAGES} imágenes` });
      return;
    }

    const imageUrls: string[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        res.status(400).json({ success: false, message: 'Tipo de imagen no permitido' });
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        res.status(400).json({ success: false, message: 'Una imagen supera el tamaño máximo (5MB)' });
        return;
      }
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'clubdn/marketplace',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto:good' },
            ],
          },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        stream.end(file.buffer);
      });
      imageUrls.push(result.secure_url);
    }

    const listing = await prisma.marketplaceListing.create({
      data: {
        authorId: userId,
        title: title.trim(),
        description: description.trim(),
        category,
        price: parsedPrice,
        images: imageUrls,
        contactExtra: contactExtra?.trim() || null,
      },
      select: listingPublicSelect,
    });

    res.status(201).json({ success: true, data: { listing } });
  } catch (error) {
    console.error('Error creando anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al crear el anuncio' });
  }
};

/**
 * PUT /api/marketplace/listings/:id
 * Editar anuncio (solo autor, solo si PUBLICADO)
 */
export const updateListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { title, description, category, price, contactExtra, keepImages } = req.body;

    const existing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
      return;
    }
    if (existing.authorId !== userId) {
      res.status(403).json({ success: false, message: 'No puedes editar este anuncio' });
      return;
    }
    if (existing.status !== 'PUBLICADO') {
      res.status(400).json({ success: false, message: 'Solo se pueden editar anuncios en estado PUBLICADO' });
      return;
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ success: false, message: 'Categoría no válida' });
      return;
    }
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        res.status(400).json({ success: false, message: 'El precio debe ser mayor que 0' });
        return;
      }
    }

    // Imágenes que se conservan (enviadas como JSON array de URLs)
    let currentImages: string[] = [];
    if (keepImages) {
      try {
        currentImages = JSON.parse(keepImages);
        if (!Array.isArray(currentImages)) currentImages = [];
      } catch {
        currentImages = [];
      }
    }

    // Subir nuevas imágenes
    const files = (req.files as Express.Multer.File[]) || [];
    if (currentImages.length + files.length > MAX_IMAGES) {
      res.status(400).json({ success: false, message: `Máximo ${MAX_IMAGES} imágenes en total` });
      return;
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        res.status(400).json({ success: false, message: 'Tipo de imagen no permitido' });
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        res.status(400).json({ success: false, message: 'Una imagen supera el tamaño máximo (5MB)' });
        return;
      }
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'clubdn/marketplace',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto:good' },
            ],
          },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        stream.end(file.buffer);
      });
      currentImages.push(result.secure_url);
    }

    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;

    const listing = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(description?.trim() && { description: description.trim() }),
        ...(category && { category }),
        ...(parsedPrice !== undefined && { price: parsedPrice }),
        ...(contactExtra !== undefined && { contactExtra: contactExtra?.trim() || null }),
        images: currentImages,
      },
      select: listingPublicSelect,
    });

    res.status(200).json({ success: true, data: { listing } });
  } catch (error) {
    console.error('Error actualizando anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el anuncio' });
  }
};

/**
 * PATCH /api/marketplace/listings/:id/status
 * Cambiar estado del anuncio (solo autor)
 * PUBLICADO → RESERVADO → VENDIDO (y RESERVADO → PUBLICADO para cancelar reserva)
 */
export const updateListingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { status } = req.body;

    const validStatuses = ['PUBLICADO', 'RESERVADO', 'VENDIDO'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Estado no válido' });
      return;
    }

    const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
      return;
    }
    if (listing.authorId !== userId) {
      res.status(403).json({ success: false, message: 'No puedes modificar este anuncio' });
      return;
    }
    if (listing.isArchived) {
      res.status(400).json({ success: false, message: 'El anuncio está archivado' });
      return;
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: { status },
      select: listingPublicSelect,
    });

    res.status(200).json({ success: true, data: { listing: updated } });
  } catch (error) {
    console.error('Error cambiando estado de anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado' });
  }
};

/**
 * PATCH /api/marketplace/listings/:id/archive
 * Archivar/desarchivar anuncio propio
 * Al archivar cancela las ofertas PENDIENTE activas
 */
export const archiveListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { archive = true } = req.body;

    const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
      return;
    }
    if (listing.authorId !== userId) {
      res.status(403).json({ success: false, message: 'No puedes archivar este anuncio' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (archive) {
        // Cancelar ofertas PENDIENTE de todas las conversaciones de este anuncio
        const conversations = await tx.marketplaceConversation.findMany({
          where: { listingId: id },
          select: { id: true },
        });
        const convIds = conversations.map(c => c.id);
        if (convIds.length > 0) {
          await tx.marketplaceOffer.updateMany({
            where: { conversationId: { in: convIds }, status: 'PENDIENTE' },
            data: { status: 'CANCELADA' },
          });
        }
      }

      await tx.marketplaceListing.update({
        where: { id },
        data: { isArchived: !!archive },
      });
    });

    res.status(200).json({ success: true, message: archive ? 'Anuncio archivado' : 'Anuncio reactivado' });
  } catch (error) {
    console.error('Error archivando anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al archivar el anuncio' });
  }
};

// ─── CONVERSACIONES ──────────────────────────────────────────────────────────

/**
 * POST /api/marketplace/listings/:id/conversations
 * Abrir o recuperar conversación con el vendedor
 */
export const openConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: listingId } = req.params;
    const buyerId = req.user!.userId;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      select: { id: true, authorId: true, title: true, status: true, isArchived: true, isHidden: true },
    });

    if (!listing || listing.isArchived || listing.isHidden) {
      res.status(404).json({ success: false, message: 'Anuncio no disponible' });
      return;
    }
    if (listing.authorId === buyerId) {
      res.status(400).json({ success: false, message: 'No puedes abrir una conversación en tu propio anuncio' });
      return;
    }
    if (listing.status === 'VENDIDO') {
      res.status(400).json({ success: false, message: 'Este anuncio ya está vendido' });
      return;
    }

    // Buscar o crear conversación
    let conversation = await prisma.marketplaceConversation.findUnique({
      where: { listingId_buyerId: { listingId: listingId!, buyerId } },
    });

    const isNew = !conversation;
    if (!conversation) {
      conversation = await prisma.marketplaceConversation.create({
        data: { listingId: listingId!, buyerId },
      });
    }

    // Notificar al vendedor si es nueva conversación
    if (isNew) {
      const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { name: true } });
      try {
        await notifyMarketplaceNewConversation(
          listing.authorId,
          buyer?.name ?? 'Un usuario',
          listing.title,
          conversation.id
        );
      } catch { /* no bloquear */ }
    }

    res.status(isNew ? 201 : 200).json({ success: true, data: { conversation, isNew } });
  } catch (error) {
    console.error('Error abriendo conversación:', error);
    res.status(500).json({ success: false, message: 'Error al abrir conversación' });
  }
};

/**
 * GET /api/marketplace/conversations
 * Mis conversaciones (como comprador o vendedor)
 */
export const getMyConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const conversations = await prisma.marketplaceConversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { listing: { authorId: userId } },
        ],
      },
      include: {
        listing: { select: { id: true, title: true, price: true, status: true, images: true, isArchived: true, author: { select: { id: true, name: true } } } },
        buyer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true } } } },
        offers: { orderBy: { createdAt: 'desc' }, take: 1, include: { proposedBy: { select: { id: true, name: true } } } },
        reads: { where: { userId }, select: { lastReadAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calcular unreadCount: mensajes de la contraparte posteriores a lastReadAt
    const unreadCounts = await Promise.all(
      conversations.map(conv => {
        const lastReadAt = conv.reads[0]?.lastReadAt ?? new Date(0);
        return prisma.marketplaceMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: lastReadAt },
          },
        });
      })
    );

    const result = conversations.map((conv, i) => ({
      ...conv,
      reads: undefined,
      unreadCount: unreadCounts[i],
    }));

    res.status(200).json({ success: true, data: { conversations: result } });
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener conversaciones' });
  }
};

/**
 * GET /api/marketplace/conversations/:id
 * Detalle de conversación con mensajes y ofertas
 */
export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, price: true, status: true, images: true, isArchived: true, authorId: true, author: { select: { id: true, name: true } } } },
        buyer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true } } } },
        offers: { orderBy: { createdAt: 'desc' }, include: { proposedBy: { select: { id: true, name: true } } } },
      },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }

    const isSeller = conversation.listing.authorId === userId;
    const isBuyer = conversation.buyerId === userId;
    if (!isSeller && !isBuyer) {
      res.status(403).json({ success: false, message: 'No tienes acceso a esta conversación' });
      return;
    }

    res.status(200).json({ success: true, data: { conversation, isSeller, isBuyer } });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la conversación' });
  }
};

/**
 * POST /api/marketplace/conversations/:id/read
 * Marcar conversación como leída (upsert lastReadAt)
 */
export const markConversationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user!.userId;

    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      select: { buyerId: true, listing: { select: { authorId: true } } },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }

    const isSeller = conversation.listing.authorId === userId;
    const isBuyer = conversation.buyerId === userId;
    if (!isSeller && !isBuyer) {
      res.status(403).json({ success: false, message: 'No tienes acceso a esta conversación' });
      return;
    }

    await prisma.marketplaceConversationRead.upsert({
      where: { conversationId_userId: { conversationId: conversationId!, userId } },
      create: { conversationId: conversationId!, userId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marcando conversación como leída:', error);
    res.status(500).json({ success: false, message: 'Error al marcar como leída' });
  }
};

// ─── MENSAJES ────────────────────────────────────────────────────────────────

/**
 * POST /api/marketplace/conversations/:id/messages
 * Enviar mensaje en una conversación
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const senderId = req.user!.userId;
    const { body } = req.body;

    if (!body?.trim()) {
      res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío' });
      return;
    }

    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      include: { listing: { select: { authorId: true, title: true } }, buyer: { select: { id: true } } },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }

    const isSeller = conversation.listing.authorId === senderId;
    const isBuyer = conversation.buyerId === senderId;
    if (!isSeller && !isBuyer) {
      res.status(403).json({ success: false, message: 'No tienes acceso a esta conversación' });
      return;
    }

    const message = await prisma.marketplaceMessage.create({
      data: { conversationId: conversationId!, senderId, body: body.trim() },
      include: { sender: { select: { id: true, name: true } } },
    });

    // Actualizar updatedAt de la conversación y marcar como leído para el emisor
    await Promise.all([
      prisma.marketplaceConversation.update({
        where: { id: conversationId! },
        data: { updatedAt: new Date() },
      }),
      prisma.marketplaceConversationRead.upsert({
        where: { conversationId_userId: { conversationId: conversationId!, userId: senderId } },
        create: { conversationId: conversationId!, userId: senderId, lastReadAt: new Date() },
        update: { lastReadAt: new Date() },
      }),
    ]);

    // Notificar a la contraparte
    const recipientId = isSeller ? conversation.buyer.id : conversation.listing.authorId;
    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
    try {
      await notifyMarketplaceNewMessage(
        recipientId,
        sender?.name ?? 'Un usuario',
        conversation.listing.title,
        conversationId!
      );
    } catch { /* no bloquear */ }

    res.status(201).json({ success: true, data: { message } });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ success: false, message: 'Error al enviar el mensaje' });
  }
};

// ─── OFERTAS ─────────────────────────────────────────────────────────────────

/**
 * POST /api/marketplace/conversations/:id/offers
 * Crear oferta (solo el comprador)
 */
export const createOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const buyerId = req.user!.userId;
    const { amount } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'El importe de la oferta debe ser mayor que 0' });
      return;
    }

    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      include: { listing: { select: { authorId: true, title: true, status: true, isArchived: true } } },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }
    if (conversation.buyerId !== buyerId) {
      res.status(403).json({ success: false, message: 'Solo el comprador puede hacer ofertas' });
      return;
    }
    if (conversation.listing.status !== 'PUBLICADO' || conversation.listing.isArchived) {
      res.status(400).json({ success: false, message: 'El anuncio no está disponible' });
      return;
    }

    // Cancelar oferta PENDIENTE anterior si existe
    await prisma.marketplaceOffer.updateMany({
      where: { conversationId, status: 'PENDIENTE' },
      data: { status: 'CANCELADA' },
    });

    const offer = await prisma.marketplaceOffer.create({
      data: { conversationId: conversationId!, proposedById: buyerId, amount: parsedAmount },
      include: { proposedBy: { select: { id: true, name: true } } },
    });

    // Notificar al vendedor
    const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { name: true } });
    try {
      await notifyMarketplaceNewOffer(
        conversation.listing.authorId,
        buyer?.name ?? 'Un usuario',
        conversation.listing.title,
        parsedAmount,
        conversationId!
      );
    } catch { /* no bloquear */ }

    res.status(201).json({ success: true, data: { offer } });
  } catch (error) {
    console.error('Error creando oferta:', error);
    res.status(500).json({ success: false, message: 'Error al crear la oferta' });
  }
};

/**
 * PATCH /api/marketplace/conversations/:id/offers/:offerId
 * Aceptar / Rechazar / Contraofertar (solo el vendedor)
 */
export const respondOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId, offerId } = req.params;
    const sellerId = req.user!.userId;
    const { action, counterAmount } = req.body;

    const validActions = ['ACEPTADA', 'RECHAZADA', 'CONTRAOFERTA'];
    if (!validActions.includes(action)) {
      res.status(400).json({ success: false, message: 'Acción no válida' });
      return;
    }

    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      include: {
        listing: { select: { id: true, authorId: true, title: true } },
        buyer: { select: { id: true } },
      },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }
    if (conversation.listing.authorId !== sellerId) {
      res.status(403).json({ success: false, message: 'Solo el vendedor puede responder ofertas' });
      return;
    }

    const offer = await prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.conversationId !== conversationId || offer.status !== 'PENDIENTE') {
      res.status(404).json({ success: false, message: 'Oferta no encontrada o ya procesada' });
      return;
    }

    const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { name: true } });

    if (action === 'ACEPTADA') {
      await prisma.$transaction(async (tx) => {
        await tx.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'ACEPTADA' } });
        // Cancelar otras ofertas PENDIENTE del mismo anuncio
        const otherConvs = await tx.marketplaceConversation.findMany({
          where: { listingId: conversation.listing.id, id: { not: conversationId } },
          select: { id: true },
        });
        if (otherConvs.length > 0) {
          await tx.marketplaceOffer.updateMany({
            where: { conversationId: { in: otherConvs.map(c => c.id) }, status: 'PENDIENTE' },
            data: { status: 'CANCELADA' },
          });
        }
        // Marcar anuncio como RESERVADO
        await tx.marketplaceListing.update({
          where: { id: conversation.listing.id },
          data: { status: 'RESERVADO' },
        });
      });

      try {
        await notifyMarketplaceOfferAccepted(
          conversation.buyer.id,
          conversation.listing.title,
          parseFloat(offer.amount.toString()),
          conversationId
        );
      } catch { /* no bloquear */ }

    } else if (action === 'RECHAZADA') {
      await prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'RECHAZADA' } });

      try {
        await notifyMarketplaceOfferRejected(
          conversation.buyer.id,
          conversation.listing.title,
          parseFloat(offer.amount.toString()),
          conversationId
        );
      } catch { /* no bloquear */ }

    } else if (action === 'CONTRAOFERTA') {
      const parsedCounter = parseFloat(counterAmount);
      if (isNaN(parsedCounter) || parsedCounter <= 0) {
        res.status(400).json({ success: false, message: 'El importe de la contraoferta debe ser mayor que 0' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // Marcar oferta original como CONTRAOFERTA
        await tx.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'CONTRAOFERTA' } });
        // Crear nueva oferta del vendedor
        await tx.marketplaceOffer.create({
          data: { conversationId, proposedById: sellerId, amount: parsedCounter },
        });
      });

      try {
        await notifyMarketplaceOfferCountered(
          conversation.buyer.id,
          seller?.name ?? 'El vendedor',
          conversation.listing.title,
          parsedCounter,
          conversationId
        );
      } catch { /* no bloquear */ }
    }

    res.status(200).json({ success: true, message: 'Oferta procesada correctamente' });
  } catch (error) {
    console.error('Error respondiendo oferta:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la oferta' });
  }
};

// ─── CANCELAR RESERVA ────────────────────────────────────────────────────────

/**
 * POST /api/marketplace/conversations/:id/cancel
 * Cancelar reserva (comprador o vendedor) con motivo
 * Devuelve el anuncio a PUBLICADO
 */
export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user!.userId;
    const { reason } = req.body;

    if (!reason || !CANCELLATION_REASONS.includes(reason)) {
      res.status(400).json({ success: false, message: 'Motivo de cancelación no válido' });
      return;
    }

    const conversation = await prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      include: { listing: { select: { id: true, authorId: true, status: true } } },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }

    const isSeller = conversation.listing.authorId === userId;
    const isBuyer = conversation.buyerId === userId;
    if (!isSeller && !isBuyer) {
      res.status(403).json({ success: false, message: 'No tienes acceso a esta conversación' });
      return;
    }
    if (conversation.listing.status !== 'RESERVADO') {
      res.status(400).json({ success: false, message: 'El anuncio no está en estado RESERVADO' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Registrar cancelación
      await tx.marketplaceCancellation.create({
        data: {
          conversationId: conversationId!,
          cancelledById: userId,
          role: isBuyer ? 'BUYER' : 'SELLER',
          reason,
        },
      });
      // Cancelar ofertas aceptadas de esta conversación
      await tx.marketplaceOffer.updateMany({
        where: { conversationId, status: 'ACEPTADA' },
        data: { status: 'CANCELADA' },
      });
      // Devolver anuncio a PUBLICADO
      await tx.marketplaceListing.update({
        where: { id: conversation.listing.id },
        data: { status: 'PUBLICADO' },
      });
    });

    res.status(200).json({ success: true, message: 'Reserva cancelada. El anuncio vuelve a estar disponible.' });
  } catch (error) {
    console.error('Error cancelando reserva:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar la reserva' });
  }
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────

/**
 * GET /api/marketplace/admin/listings
 * Listado admin con todos los anuncios
 */
export const adminGetListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q, category, status, isArchived, isHidden,
      sortBy = 'createdAt', sortDir = 'desc',
      page = '1', pageSize = '50',
    } = req.query as Record<string, string>;

    const where: any = {};
    if (q?.trim()) {
      where.OR = [
        { title: { contains: q.trim(), mode: 'insensitive' } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }
    if (status && ['PUBLICADO', 'RESERVADO', 'VENDIDO'].includes(status)) where.status = status;
    if (category && VALID_CATEGORIES.includes(category)) where.category = category;
    if (isArchived !== undefined) where.isArchived = isArchived === 'true';
    if (isHidden !== undefined) where.isHidden = isHidden === 'true';

    const validSortBy = ['createdAt', 'price', 'title', 'status'].includes(sortBy) ? sortBy : 'createdAt';
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        select: { ...listingPublicSelect, _count: { select: { conversations: true } } },
        orderBy: { [validSortBy]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: { listings, pagination: { currentPage: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) } },
    });
  } catch (error) {
    console.error('Error obteniendo listado admin mercadillo:', error);
    res.status(500).json({ success: false, message: 'Error al obtener anuncios' });
  }
};

/**
 * PATCH /api/marketplace/admin/listings/:id/hide
 * Ocultar / mostrar anuncio
 */
export const adminHideListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hide } = req.body;

    await prisma.marketplaceListing.update({ where: { id }, data: { isHidden: !!hide } });
    res.status(200).json({ success: true, message: hide ? 'Anuncio ocultado' : 'Anuncio visible' });
  } catch (error) {
    console.error('Error ocultando anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al modificar visibilidad' });
  }
};

/**
 * PATCH /api/marketplace/admin/listings/:id/close
 * Cerrar y archivar anuncio
 */
export const adminCloseListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      const conversations = await tx.marketplaceConversation.findMany({
        where: { listingId: id },
        select: { id: true },
      });
      const convIds = conversations.map(c => c.id);
      if (convIds.length > 0) {
        await tx.marketplaceOffer.updateMany({
          where: { conversationId: { in: convIds }, status: 'PENDIENTE' },
          data: { status: 'CANCELADA' },
        });
      }
      await tx.marketplaceListing.update({ where: { id }, data: { isArchived: true, isHidden: true } });
    });

    res.status(200).json({ success: true, message: 'Anuncio cerrado y archivado' });
  } catch (error) {
    console.error('Error cerrando anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al cerrar el anuncio' });
  }
};

/**
 * DELETE /api/marketplace/admin/listings/:id
 * Eliminar anuncio (cascade a conversaciones, mensajes, ofertas)
 */
export const adminDeleteListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.marketplaceListing.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Anuncio eliminado' });
  } catch (error) {
    console.error('Error eliminando anuncio:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar el anuncio' });
  }
};

/**
 * GET /api/marketplace/admin/cancellations
 * Historial de cancelaciones para admins
 */
export const adminGetCancellations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', pageSize = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));

    const [cancellations, total] = await Promise.all([
      prisma.marketplaceCancellation.findMany({
        include: {
          cancelledBy: { select: { id: true, name: true, email: true } },
          conversation: {
            include: {
              listing: { select: { id: true, title: true } },
              buyer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.marketplaceCancellation.count(),
    ]);

    res.status(200).json({
      success: true,
      data: { cancellations, pagination: { currentPage: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) } },
    });
  } catch (error) {
    console.error('Error obteniendo cancelaciones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener cancelaciones' });
  }
};
