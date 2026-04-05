// server/src/routes/announcementRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  notifyAnnouncement,
  toggleLike
} from '../controllers/announcementController';

const router = Router();

router.use(authenticate);

router.get('/', listAnnouncements);
router.post('/', requireAdmin, createAnnouncement);
router.put('/:id', requireAdmin, updateAnnouncement);
router.delete('/:id', requireAdmin, deleteAnnouncement);
router.post('/:id/notify', requireSuperAdmin, notifyAnnouncement);
router.post('/:id/like', toggleLike);

export default router;
