// server/src/routes/eventPhotoRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  getEventPhotos,
  uploadEventPhoto,
  deleteEventPhoto
} from '../controllers/eventPhotoController';

const router = Router();

// Configuración de multer para almacenar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/events/:eventId/photos - Obtener fotos de un evento
router.get('/:eventId/photos', getEventPhotos);

// POST /api/events/:eventId/photos - Subir foto a un evento
router.post('/:eventId/photos', upload.single('photo'), uploadEventPhoto);

// DELETE /api/events/:eventId/photos/:photoId - Eliminar foto
router.delete('/:eventId/photos/:photoId', deleteEventPhoto);

export default router;
