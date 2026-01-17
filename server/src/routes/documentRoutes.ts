// server/src/routes/documentRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  getDocuments,
  downloadDocument,
  uploadDocument,
  deleteDocument,
  getDocumentStats
} from '../controllers/documentController';

const router = Router();

// Configuración de multer para almacenar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB máximo
  }
});

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/documents - Listar documentos (filtrados según rol)
router.get('/', getDocuments);

// GET /api/documents/stats - Estadísticas (solo admin)
router.get('/stats', getDocumentStats);

// GET /api/documents/:id/download - Descargar documento
router.get('/:id/download', downloadDocument);

// POST /api/documents - Subir documento (solo admin)
router.post('/', upload.single('file'), uploadDocument);

// DELETE /api/documents/:id - Eliminar documento (solo admin)
router.delete('/:id', deleteDocument);

export default router;
