"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/eventRoutes.ts
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rutas públicas (requieren autenticación)
router.get('/', auth_1.authenticate, eventController_1.getEvents);
router.get('/:id', auth_1.authenticate, eventController_1.getEvent);
router.get('/:id/attendees', auth_1.authenticate, eventController_1.getEventAttendees);
// Registro/cancelación (usuarios autenticados)
router.post('/:id/register', auth_1.authenticate, eventController_1.registerToEvent);
router.delete('/:id/register', auth_1.authenticate, eventController_1.unregisterFromEvent);
// CRUD
router.post('/', auth_1.authenticate, eventController_1.createEvent); // Usuarios pueden crear PARTIDA, admins todo
router.put('/:id', auth_1.authenticate, eventController_1.updateEvent); // Validación de permisos en el controller
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, eventController_1.deleteEvent); // Solo admins pueden cancelar
exports.default = router;
//# sourceMappingURL=eventRoutes.js.map