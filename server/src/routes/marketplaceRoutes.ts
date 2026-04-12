// server/src/routes/marketplaceRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireMarketplaceAccess } from '../middleware/marketplaceAccess';
import {
  getListings,
  getMyListings,
  getListing,
  createListing,
  updateListing,
  updateListingStatus,
  archiveListing,
  openConversation,
  getMyConversations,
  getConversation,
  sendMessage,
  createOffer,
  respondOffer,
  cancelReservation,
  markConversationRead,
  adminGetListings,
  adminHideListing,
  adminCloseListing,
  adminDeleteListing,
  adminGetCancellations,
} from '../controllers/marketplaceController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Todas las rutas requieren autenticación
router.use(authenticate);

// ─── Rutas de usuario (requieren acceso al mercadillo) ───────────────────────

router.get('/listings', requireMarketplaceAccess, getListings);
router.get('/listings/mine', requireMarketplaceAccess, getMyListings);
router.get('/listings/:id', requireMarketplaceAccess, getListing);
router.post('/listings', requireMarketplaceAccess, upload.array('images', 4), createListing);
router.put('/listings/:id', requireMarketplaceAccess, upload.array('images', 4), updateListing);
router.patch('/listings/:id/status', requireMarketplaceAccess, updateListingStatus);
router.patch('/listings/:id/archive', requireMarketplaceAccess, archiveListing);

router.post('/listings/:id/conversations', requireMarketplaceAccess, openConversation);
router.get('/conversations', requireMarketplaceAccess, getMyConversations);
router.get('/conversations/:id', requireMarketplaceAccess, getConversation);
router.post('/conversations/:id/messages', requireMarketplaceAccess, sendMessage);
router.post('/conversations/:id/offers', requireMarketplaceAccess, createOffer);
router.patch('/conversations/:id/offers/:offerId', requireMarketplaceAccess, respondOffer);
router.post('/conversations/:id/cancel', requireMarketplaceAccess, cancelReservation);
router.post('/conversations/:id/read', requireMarketplaceAccess, markConversationRead);

// ─── Rutas de admin ──────────────────────────────────────────────────────────

router.get('/admin/listings', requireAdmin, adminGetListings);
router.patch('/admin/listings/:id/hide', requireAdmin, adminHideListing);
router.patch('/admin/listings/:id/close', requireAdmin, adminCloseListing);
router.delete('/admin/listings/:id', requireAdmin, adminDeleteListing);
router.get('/admin/cancellations', requireAdmin, adminGetCancellations);

export default router;
