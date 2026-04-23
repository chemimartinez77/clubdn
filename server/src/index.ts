// server/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { prisma } from './config/database';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import statsRoutes from './routes/statsRoutes';
import profileRoutes from './routes/profileRoutes';
import eventRoutes from './routes/eventRoutes';
import bggRoutes from './routes/bggRoutes';
import membershipRoutes from './routes/membershipRoutes';
import gameRoutes from './routes/gameRoutes';
import configRoutes from './routes/configRoutes';
import ludotecaRoutes from './routes/ludotecaRoutes';
import documentRoutes from './routes/documentRoutes';
import invitationRoutes from './routes/invitationRoutes';
import shareLinkRoutes from './routes/shareLinkRoutes';
import eventPhotoRoutes from './routes/eventPhotoRoutes';
import notificationRoutes from './routes/notificationRoutes';
import badgeRoutes from './routes/badgeRoutes';
import reportRoutes from './routes/reportRoutes';
import financialRoutes from './routes/financial';
import azulRoutes from './routes/azulRoutes';
import viernesRoutes from './routes/viernesRoutes';
import calendarRoutes from './routes/calendarRoutes';
import pageViewRoutes from './routes/pageViewRoutes';
import announcementRoutes from './routes/announcementRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import libraryLoansRoutes from './routes/libraryLoansRoutes';
import previewRoutes from './routes/previewRoutes';
import pushRoutes from './routes/pushRoutes';
import myLudotecaRoutes from './routes/myLudotecaRoutes';
import jugadoresLudotecaRoutes from './routes/jugadoresLudotecaRoutes';
import quienSabeJugarRoutes from './routes/quienSabeJugarRoutes';
import { startEventCompletionJob } from './jobs/eventCompletionJob';
import { startMemberPromotionJob } from './jobs/memberPromotionJob';
import { startNotificationCleanupJob } from './jobs/notificationCleanupJob';
import { startBggSyncJobWorker } from './jobs/bggSyncJob';
import { startLibraryLoanJob } from './jobs/libraryLoanJob';

// Cargar variables de entorno
dotenv.config();

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido. El servidor no puede arrancar sin él.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Necesario para que express-rate-limit funcione correctamente detrás del proxy de Railway
app.set('trust proxy', 1);

// Middleware CORS - Configurado para Capacitor
const allowedOrigins = [
  'https://clubdn-web-production.up.railway.app',
  'https://clubdn-web-staging.up.railway.app',
  'https://app.clubdreadnought.org',
  'https://staging.clubdreadnought.org',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:5174'
];

function isAllowedCorsOrigin(origin?: string): boolean {
  return !origin || allowedOrigins.includes(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (typeof origin === 'string' && isAllowedCorsOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(isAllowedCorsOrigin(typeof origin === 'string' ? origin : undefined) ? 200 : 403);
  }

  return next();
});

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas peticiones, intenta de nuevo en unos minutos' }
});

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos' }
});

app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Rutas de autenticación y administración
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bgg', bggRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ludoteca', ludotecaRoutes);
app.use('/api/my-ludoteca', myLudotecaRoutes);
app.use('/api/jugadores-ludoteca', jugadoresLudotecaRoutes);
app.use('/api/quien-sabe-jugar', quienSabeJugarRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/share', shareLinkRoutes);
app.use('/api/events', eventPhotoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/azul', azulRoutes);
app.use('/api/viernes', viernesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/pageviews', pageViewRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/library-loans', libraryLoansRoutes);
app.use('/preview', previewRoutes);
app.use('/api/push', pushRoutes);

// Ruta 404
app.use((_req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint no encontrado' 
  });
});

// Manejo de errores global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Solo iniciar servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
    startEventCompletionJob();
    startMemberPromotionJob();
    startNotificationCleanupJob();
    void startBggSyncJobWorker();
    startLibraryLoanJob();
  });

  // Manejo de cierre graceful
  process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido. Cerrando servidor...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('\nSIGINT recibido. Cerrando servidor...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

// Exportar app para testing
export default app;
