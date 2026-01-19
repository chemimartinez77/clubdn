// server/src/index.ts
import express from 'express';
import cors from 'cors';
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
import eventPhotoRoutes from './routes/eventPhotoRoutes';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

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
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bgg', bggRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ludoteca', ludotecaRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/events', eventPhotoRoutes);

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

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
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

// Exportar app para testing
export default app;
