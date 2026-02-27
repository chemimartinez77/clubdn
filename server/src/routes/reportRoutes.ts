// server/src/routes/reportRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  createReport,
  listReports,
  toggleVote,
  getReportComments,
  createReportComment
} from '../controllers/reportController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

router.use(authenticate);

// GET /api/reports
router.get('/', listReports);

// POST /api/reports
router.post('/', upload.single('screenshot'), createReport);

// POST /api/reports/:id/votes
router.post('/:id/votes', toggleVote);

// GET /api/reports/:id/comments
router.get('/:id/comments', getReportComments);

// POST /api/reports/:id/comments
router.post('/:id/comments', upload.array('images', 2), createReportComment);

export default router;
