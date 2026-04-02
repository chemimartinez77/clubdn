// server/src/routes/announcementRoutes.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/announcementController';

const router = Router();

router.use(authenticate);

router.get('/', listAnnouncements);
router.post('/', requireAdmin, createAnnouncement);
router.put('/:id', requireAdmin, updateAnnouncement);
router.delete('/:id', requireAdmin, deleteAnnouncement);

export default router;
