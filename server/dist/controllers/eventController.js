"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventAttendees = exports.unregisterFromEvent = exports.registerToEvent = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvent = exports.getEvents = void 0;
const database_1 = require("../config/database");
/**
 * GET /api/events - Listar eventos con filtros
 */
const getEvents = async (req, res) => {
    try {
        const { status, search, page = '1', limit = '10' } = req.query;
        const userId = req.user?.userId;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [events, total] = await Promise.all([
            database_1.prisma.event.findMany({
                where,
                include: {
                    organizer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    registrations: {
                        select: {
                            id: true,
                            userId: true,
                            status: true
                        }
                    }
                },
                orderBy: { date: 'asc' },
                skip,
                take: limitNum
            }),
            database_1.prisma.event.count({ where })
        ]);
        // Calcular datos adicionales para cada evento
        const eventsWithStats = events.map(event => {
            const registeredCount = event.registrations.filter(r => r.status === 'CONFIRMED').length;
            const waitlistCount = event.registrations.filter(r => r.status === 'WAITLIST').length;
            const userRegistration = event.registrations.find(r => r.userId === userId);
            return {
                ...event,
                registrations: undefined, // No exponer lista completa en el listado
                registeredCount,
                waitlistCount,
                isUserRegistered: !!userRegistration,
                userRegistrationStatus: userRegistration?.status
            };
        });
        res.status(200).json({
            success: true,
            data: {
                events: eventsWithStats,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });
    }
    catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener eventos'
        });
    }
};
exports.getEvents = getEvents;
/**
 * GET /api/events/:id - Obtener detalle de evento
 */
const getEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const event = await database_1.prisma.event.findUnique({
            where: { id },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                registrations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
            return;
        }
        const registeredCount = event.registrations.filter(r => r.status === 'CONFIRMED').length;
        const waitlistCount = event.registrations.filter(r => r.status === 'WAITLIST').length;
        const userRegistration = event.registrations.find(r => r.userId === userId);
        res.status(200).json({
            success: true,
            data: {
                event: {
                    ...event,
                    registeredCount,
                    waitlistCount,
                    isUserRegistered: !!userRegistration,
                    userRegistrationStatus: userRegistration?.status
                }
            }
        });
    }
    catch (error) {
        console.error('Error al obtener evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener evento'
        });
    }
};
exports.getEvent = getEvent;
/**
 * POST /api/events - Crear evento
 * Admins pueden crear cualquier tipo
 * Usuarios normales solo pueden crear PARTIDA
 */
const createEvent = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { title, description, date, location, address, maxAttendees, type, gameName, gameImage, bggId, startHour, startMinute, durationHours, durationMinutes } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
            return;
        }
        // Validar permisos según tipo de evento
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
        const eventType = type || 'OTROS';
        if (!isAdmin && eventType !== 'PARTIDA') {
            res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden crear eventos de tipo TORNEO u OTROS'
            });
            return;
        }
        // Validar fecha futura
        const eventDate = new Date(date);
        if (eventDate <= new Date()) {
            res.status(400).json({
                success: false,
                message: 'La fecha del evento debe ser futura'
            });
            return;
        }
        const event = await database_1.prisma.event.create({
            data: {
                title,
                description,
                date: eventDate,
                location,
                address,
                maxAttendees: parseInt(maxAttendees),
                type: eventType,
                gameName,
                gameImage,
                bggId,
                startHour: startHour !== undefined ? parseInt(startHour) : null,
                startMinute: startMinute !== undefined ? parseInt(startMinute) : null,
                durationHours: durationHours !== undefined ? parseInt(durationHours) : null,
                durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : null,
                createdBy: userId
            },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: { event },
            message: 'Evento creado correctamente'
        });
    }
    catch (error) {
        console.error('Error al crear evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear evento'
        });
    }
};
exports.createEvent = createEvent;
/**
 * PUT /api/events/:id - Actualizar evento (solo admins u organizador)
 */
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { title, description, date, location, address, maxAttendees, status } = req.body;
        const existingEvent = await database_1.prisma.event.findUnique({
            where: { id }
        });
        if (!existingEvent) {
            res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
            return;
        }
        // Verificar permisos (admin o organizador)
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && existingEvent.createdBy !== userId) {
            res.status(403).json({
                success: false,
                message: 'No tienes permiso para editar este evento'
            });
            return;
        }
        // Validar fecha si se proporciona
        if (date) {
            const eventDate = new Date(date);
            if (eventDate <= new Date()) {
                res.status(400).json({
                    success: false,
                    message: 'La fecha del evento debe ser futura'
                });
                return;
            }
        }
        const event = await database_1.prisma.event.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                ...(date && { date: new Date(date) }),
                ...(location && { location }),
                ...(address !== undefined && { address }),
                ...(maxAttendees && { maxAttendees: parseInt(maxAttendees) }),
                ...(status && { status })
            },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(200).json({
            success: true,
            data: { event },
            message: 'Evento actualizado correctamente'
        });
    }
    catch (error) {
        console.error('Error al actualizar evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar evento'
        });
    }
};
exports.updateEvent = updateEvent;
/**
 * DELETE /api/events/:id - Cancelar evento (solo admins)
 */
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await database_1.prisma.event.findUnique({
            where: { id }
        });
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
            return;
        }
        // Marcar como cancelado en lugar de eliminar
        await database_1.prisma.event.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        res.status(200).json({
            success: true,
            message: 'Evento cancelado correctamente'
        });
    }
    catch (error) {
        console.error('Error al cancelar evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar evento'
        });
    }
};
exports.deleteEvent = deleteEvent;
/**
 * POST /api/events/:id/register - Registrarse a evento
 */
const registerToEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!id || !userId) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos'
            });
            return;
        }
        const event = await database_1.prisma.event.findUnique({
            where: { id },
            include: {
                registrations: {
                    where: { status: 'CONFIRMED' }
                }
            }
        });
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
            return;
        }
        // Validar que el evento no esté cancelado o completado
        if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
            res.status(400).json({
                success: false,
                message: 'No puedes registrarte a un evento cancelado o completado'
            });
            return;
        }
        // Validar que el evento sea futuro
        if (new Date(event.date) <= new Date()) {
            res.status(400).json({
                success: false,
                message: 'No puedes registrarte a un evento pasado'
            });
            return;
        }
        // Verificar si ya está registrado
        const existingRegistration = await database_1.prisma.eventRegistration.findUnique({
            where: {
                eventId_userId: {
                    eventId: id,
                    userId
                }
            }
        });
        if (existingRegistration) {
            res.status(400).json({
                success: false,
                message: existingRegistration.status === 'CANCELLED'
                    ? 'Ya cancelaste tu registro a este evento'
                    : 'Ya estás registrado a este evento'
            });
            return;
        }
        // Determinar estado: CONFIRMED o WAITLIST
        const confirmedCount = event.registrations.length;
        const registrationStatus = confirmedCount >= event.maxAttendees ? 'WAITLIST' : 'CONFIRMED';
        const registration = await database_1.prisma.eventRegistration.create({
            data: {
                eventId: id,
                userId,
                status: registrationStatus
            }
        });
        res.status(201).json({
            success: true,
            data: { registration },
            message: registrationStatus === 'WAITLIST'
                ? 'Te has registrado en lista de espera'
                : 'Te has registrado correctamente al evento'
        });
    }
    catch (error) {
        console.error('Error al registrarse a evento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrarse a evento'
        });
    }
};
exports.registerToEvent = registerToEvent;
/**
 * DELETE /api/events/:id/register - Cancelar registro a evento
 */
const unregisterFromEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!id || !userId) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos'
            });
            return;
        }
        const registration = await database_1.prisma.eventRegistration.findUnique({
            where: {
                eventId_userId: {
                    eventId: id,
                    userId
                }
            }
        });
        if (!registration) {
            res.status(404).json({
                success: false,
                message: 'No estás registrado a este evento'
            });
            return;
        }
        if (registration.status === 'CANCELLED') {
            res.status(400).json({
                success: false,
                message: 'Ya cancelaste tu registro'
            });
            return;
        }
        const wasConfirmed = registration.status === 'CONFIRMED';
        // Marcar como cancelado
        await database_1.prisma.eventRegistration.update({
            where: { id: registration.id },
            data: { status: 'CANCELLED' }
        });
        // Si era CONFIRMED, promover el primero de la waitlist
        if (wasConfirmed) {
            const firstWaitlisted = await database_1.prisma.eventRegistration.findFirst({
                where: {
                    eventId: id,
                    status: 'WAITLIST'
                },
                orderBy: { createdAt: 'asc' }
            });
            if (firstWaitlisted) {
                await database_1.prisma.eventRegistration.update({
                    where: { id: firstWaitlisted.id },
                    data: { status: 'CONFIRMED' }
                });
            }
        }
        res.status(200).json({
            success: true,
            message: 'Registro cancelado correctamente'
        });
    }
    catch (error) {
        console.error('Error al cancelar registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar registro'
        });
    }
};
exports.unregisterFromEvent = unregisterFromEvent;
/**
 * GET /api/events/:id/attendees - Obtener lista de asistentes
 */
const getEventAttendees = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await database_1.prisma.event.findUnique({
            where: { id }
        });
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Evento no encontrado'
            });
            return;
        }
        const attendees = await database_1.prisma.eventRegistration.findMany({
            where: {
                eventId: id,
                status: { in: ['CONFIRMED', 'WAITLIST'] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        const confirmed = attendees.filter(a => a.status === 'CONFIRMED');
        const waitlist = attendees.filter(a => a.status === 'WAITLIST');
        res.status(200).json({
            success: true,
            data: {
                confirmed,
                waitlist
            }
        });
    }
    catch (error) {
        console.error('Error al obtener asistentes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistentes'
        });
    }
};
exports.getEventAttendees = getEventAttendees;
//# sourceMappingURL=eventController.js.map