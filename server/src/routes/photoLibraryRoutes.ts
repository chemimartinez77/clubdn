import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPhotoLibrary,
  searchPhotoLibraryGames,
  searchPhotoLibraryParticipants
} from '../controllers/eventPhotoController';

const router = Router();

router.use(authenticate);

router.get('/', getPhotoLibrary);
router.get('/games/search', searchPhotoLibraryGames);
router.get('/participants/search', searchPhotoLibraryParticipants);

export default router;
