// server/src/controllers/eventController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const REGISTRATION_COOLDOWN_MS = 3000;

/**
 * GET /api/events - Listar eventos con filtros
 */
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, participant, page = '1', limit = '10' } = req.query;
    const userId = req.user?.userId;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Obtener eventos con relaciones necesarias para filtro de participante
    let events = await prisma.event.findMany({
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
            status: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        eventGuests: {
          select: {
            id: true,
            guestFirstName: true,
            guestLastName: true
          }
        },
        game: {
          select: {
            thumbnail: true,
            image: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Filtrar por participante si se especifica
    if (participant && typeof participant === 'string' && participant.trim()) {
      const searchTerm = participant.trim().toLowerCase();
      events = events.filter(event => {
        // Buscar en registrations (usuarios registrados)
        const hasMatchingUser = event.registrations.some(reg =>
          reg.user?.name?.toLowerCase().includes(searchTerm)
        );
        // Buscar en eventGuests (invitados)
        const hasMatchingGuest = event.eventGuests.some(guest =>
          guest.guestFirstName.toLowerCase().includes(searchTerm) ||
          guest.guestLastName.toLowerCase().includes(searchTerm) ||
          `${guest.guestFirstName} ${guest.guestLastName}`.toLowerCase().includes(searchTerm)
        );
        return hasMatchingUser || hasMatchingGuest;
      });
    }

    // Paginación después del filtro de participante
    const total = events.length;
    const skip = (pageNum - 1) * limitNum;
    events = events.slice(skip, skip + limitNum);

    // Calcular datos adicionales para cada evento
    const eventsWithStats = events.map(event => {
      const guestCount = event.eventGuests?.length || 0;
      const registeredCount = event.registrations.filter(r => r.status === 'CONFIRMED').length + guestCount;
      const waitlistCount = event.registrations.filter(r => r.status === 'WAITLIST').length;
      const userRegistration = event.registrations.find(r => r.userId === userId);

      return {
        ...event,
        registrations: undefined, // No exponer lista completa en el listado
        eventGuests: undefined,
        guestCount,
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
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener eventos'
    });
  }
};

/**
 * GET /api/events/:id - Obtener detalle de evento
 */
export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const event = await prisma.event.findUnique({
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
                email: true,
                membership: {
                  select: {
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        eventGuests: {
          select: {
            id: true,
            guestFirstName: true,
            guestLastName: true
          },
          orderBy: { createdAt: 'asc' }
        },
        game: {
          select: {
            thumbnail: true,
            image: true
          }
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

    const guestCount = event.eventGuests?.length || 0;
    const registeredCount = event.registrations.filter(r => r.status === 'CONFIRMED').length + guestCount;
    const waitlistCount = event.registrations.filter(r => r.status === 'WAITLIST').length;
    const userRegistration = event.registrations.find(r => r.userId === userId);

    res.status(200).json({
      success: true,
      data: {
        event: {
          ...event,
          guestCount,
          registeredCount,
          waitlistCount,
          isUserRegistered: !!userRegistration,
          userRegistrationStatus: userRegistration?.status
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener evento'
    });
  }
};

/**
 * POST /api/events - Crear evento
 * Admins pueden crear cualquier tipo
 * Usuarios normales solo pueden crear PARTIDA
 */
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const {
      title,
      description,
      date,
      location,
      address,
      maxAttendees,
      type,
      gameName,
      gameImage,
      bggId,
      startHour,
      startMinute,
      durationHours,
      durationMinutes
    } = req.body;

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

    const normalizedLocation =
      typeof location === 'string' && location.trim().length > 0 ? location.trim() : 'Club DN';

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: eventDate,
        location: normalizedLocation,
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
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear evento'
    });
  }
};

/**
 * PUT /api/events/:id - Actualizar evento (solo admins u organizador)
 */
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { title, description, date, location, address, maxAttendees, status } = req.body;

    const existingEvent = await prisma.event.findUnique({
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

    const updateData: Record<string, unknown> = {
      ...(title && { title }),
      ...(description && { description }),
      ...(date && { date: new Date(date) }),
      ...(address !== undefined && { address }),
      ...(maxAttendees && { maxAttendees: parseInt(maxAttendees) }),
      ...(status && { status })
    };

    if (location !== undefined) {
      updateData.location =
        typeof location === 'string' && location.trim().length > 0 ? location.trim() : 'Club DN';
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
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
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar evento'
    });
  }
};

/**
 * DELETE /api/events/:id - Cancelar evento (solo admins)
 */
  export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const event = await prisma.event.findUnique({
        where: { id }
      });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (event.type !== 'PARTIDA') {
        res.status(400).json({
          success: false,
          message: 'Solo se pueden eliminar partidas'
        });
        return;
      }

      if (new Date(event.date) <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'Solo se pueden eliminar partidas futuras'
        });
        return;
      }

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      if (!isAdmin && event.createdBy !== userId) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta partida'
        });
        return;
      }

      if (event.status === 'CANCELLED') {
        res.status(400).json({
          success: false,
          message: 'La partida ya est\u00e1 cancelada'
        });
        return;
      }

      // Marcar como cancelado en lugar de eliminar
      await prisma.event.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: userId
        }
      });

    res.status(200).json({
      success: true,
      message: 'Evento cancelado correctamente'
    });
  } catch (error) {
    console.error('Error al cancelar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar evento'
    });
  }
};

/**
 * POST /api/events/:id/register - Registrarse a evento
 */
export const registerToEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const now = new Date();

    if (!id || !userId) {
      res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          where: { status: 'CONFIRMED' }
        },
        eventGuests: {
          select: { id: true }
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
    if (new Date(event.date) <= now) {
      res.status(400).json({
        success: false,
        message: 'No puedes registrarte a un evento pasado'
      });
      return;
    }

    // Verificar si ya está registrado
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId
        }
      }
    });

    if (existingRegistration) {
      if (existingRegistration.status === 'CANCELLED') {
        if (existingRegistration.cancelledAt) {
          const elapsedMs = now.getTime() - existingRegistration.cancelledAt.getTime();
          if (elapsedMs < REGISTRATION_COOLDOWN_MS) {
            const remainingSeconds = Math.ceil((REGISTRATION_COOLDOWN_MS - elapsedMs) / 1000);
            res.status(400).json({
              success: false,
              message: `Debes esperar ${remainingSeconds} segundo${remainingSeconds !== 1 ? 's' : ''} para volver a registrarte`
            });
            return;
          }
        }

        const confirmedCount = event.registrations.length + (event.eventGuests?.length || 0);
        const registrationStatus = confirmedCount >= event.maxAttendees ? 'WAITLIST' : 'CONFIRMED';

        const registration = await prisma.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: {
            status: registrationStatus,
            cancelledAt: null
          }
        });

        res.status(200).json({
          success: true,
          data: { registration },
          message: registrationStatus === 'WAITLIST'
            ? 'Te has registrado en lista de espera'
            : 'Te has registrado correctamente al evento'
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Ya est?s registrado a este evento'
      });
      return;
    }

    // Determinar estado: CONFIRMED o WAITLIST
    const confirmedCount = event.registrations.length + (event.eventGuests?.length || 0);
    const registrationStatus = confirmedCount >= event.maxAttendees ? 'WAITLIST' : 'CONFIRMED';

    const registration = await prisma.eventRegistration.create({
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
  } catch (error) {
    console.error('Error al registrarse a evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrarse a evento'
    });
  }
};

/**
 * DELETE /api/events/:id/register - Cancelar registro a evento
 */
export const unregisterFromEvent = async (req: Request, res: Response): Promise<void> => {
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

    const registration = await prisma.eventRegistration.findUnique({
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
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    });

    // Si era CONFIRMED, promover el primero de la waitlist
    if (wasConfirmed) {
      const [eventInfo, confirmedCount] = await Promise.all([
        prisma.event.findUnique({
          where: { id },
          select: {
            maxAttendees: true,
            eventGuests: { select: { id: true } }
          }
        }),
        prisma.eventRegistration.count({
          where: {
            eventId: id,
            status: 'CONFIRMED'
          }
        })
      ]);

      if (eventInfo) {
        const totalConfirmed = confirmedCount + (eventInfo.eventGuests?.length || 0);
        if (totalConfirmed < eventInfo.maxAttendees) {
          const firstWaitlisted = await prisma.eventRegistration.findFirst({
            where: {
              eventId: id,
              status: 'WAITLIST'
            },
            orderBy: { createdAt: 'asc' }
          });

          if (firstWaitlisted) {
            await prisma.eventRegistration.update({
              where: { id: firstWaitlisted.id },
              data: { status: 'CONFIRMED' }
            });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Registro cancelado correctamente'
    });
  } catch (error) {
    console.error('Error al cancelar registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar registro'
    });
  }
};

/**
 * GET /api/events/:id/attendees - Obtener lista de asistentes
 */
export const getEventAttendees = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
      return;
    }

    const attendees = await prisma.eventRegistration.findMany({
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
  } catch (error) {
    console.error('Error al obtener asistentes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asistentes'
    });
  }
};

/**
 * Sincronizar bggId de eventos existentes con la tabla Game (Admin)
 * Busca eventos que tienen gameName pero no bggId y los vincula con juegos existentes
 */
export const syncEventBggIds = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Buscar eventos con gameName pero sin bggId
    const eventsWithoutBggId = await prisma.event.findMany({
      where: {
        gameName: { not: null },
        bggId: null,
        type: 'PARTIDA'
      },
      select: {
        id: true,
        gameName: true,
        gameImage: true
      }
    });

    console.log(`[SYNC] Encontrados ${eventsWithoutBggId.length} eventos sin bggId`);

    const results = {
      updated: 0,
      notFound: 0,
      errors: 0,
      details: [] as { eventId: string; gameName: string; status: string; bggId?: string }[]
    };

    for (const event of eventsWithoutBggId) {
      try {
        // Buscar el juego en la tabla Game por nombre (case insensitive)
        const game = await prisma.game.findFirst({
          where: {
            name: {
              equals: event.gameName!,
              mode: 'insensitive'
            }
          },
          select: {
            id: true,
            name: true,
            image: true,
            thumbnail: true
          }
        });

        if (game) {
          // Actualizar el evento con el bggId
          await prisma.event.update({
            where: { id: event.id },
            data: { bggId: game.id }
          });

          results.updated++;
          results.details.push({
            eventId: event.id,
            gameName: event.gameName!,
            status: 'updated',
            bggId: game.id
          });
          console.log(`[SYNC] Evento ${event.id} actualizado con bggId ${game.id}`);
        } else {
          results.notFound++;
          results.details.push({
            eventId: event.id,
            gameName: event.gameName!,
            status: 'game_not_found'
          });
          console.log(`[SYNC] Juego no encontrado para evento ${event.id}: ${event.gameName}`);
        }
      } catch (err) {
        results.errors++;
        results.details.push({
          eventId: event.id,
          gameName: event.gameName!,
          status: 'error'
        });
        console.error(`[SYNC] Error procesando evento ${event.id}:`, err);
      }
    }

    res.status(200).json({
      success: true,
      message: `Sincronización completada: ${results.updated} actualizados, ${results.notFound} juegos no encontrados, ${results.errors} errores`,
      data: results
    });
  } catch (error) {
    console.error('Error al sincronizar bggIds:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar bggIds'
    });
  }
};
