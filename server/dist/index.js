"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const bggRoutes_1 = __importDefault(require("./routes/bggRoutes"));
const membershipRoutes_1 = __importDefault(require("./routes/membershipRoutes"));
const gameRoutes_1 = __importDefault(require("./routes/gameRoutes"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
// Cargar variables de entorno
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware CORS
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/stats', statsRoutes_1.default);
app.use('/api/profile', profileRoutes_1.default);
app.use('/api/events', eventRoutes_1.default);
app.use('/api/bgg', bggRoutes_1.default);
app.use('/api/membership', membershipRoutes_1.default);
app.use('/api/games', gameRoutes_1.default);
app.use('/api/config', configRoutes_1.default);
// Ruta 404
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});
// Manejo de errores global
app.use((err, _req, res, _next) => {
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
        await database_1.prisma.$disconnect();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('\nSIGINT recibido. Cerrando servidor...');
    server.close(async () => {
        await database_1.prisma.$disconnect();
        process.exit(0);
    });
});
// Exportar app para testing
exports.default = app;
//# sourceMappingURL=index.js.map