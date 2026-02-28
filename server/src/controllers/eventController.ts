// server/src/controllers/eventController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { BadgeCategory, RegistrationStatus } from '@prisma/client';
import { checkAndUnlockBadges } from './badgeController';

const REGISTRATION_COOLDOWN_MS = 30000; // 30 segundos

/**
 * GET /api/events - Listar eventos con filtros
 */
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, participant, startDate, endDate, page = '1', limit = '10' } = req.query;
    const userId = req.user?.userId;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {
      status: {
        not: 'CANCELLED'
      }
    };

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

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate && typeof startDate === 'string') {
      const parsedStart = new Date(startDate);
      if (Number.isNaN(parsedStart.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Fecha de inicio invalida'
        });
        return;
      }
      dateFilter.gte = parsedStart;
    }
    if (endDate && typeof endDate === 'string') {
      const parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Fecha de fin invalida'
        });
        return;
      }
      dateFilter.lte = parsedEnd;
    }
    if (dateFilter.gte || dateFilter.lte) {
      where.date = dateFilter;
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
                  name: true,
                  membership: {
                    select: {
                      type: true
                    }
                  }
                }
              }
            }
          },
          eventGuests: {
            select: {
              id: true,
              guestFirstName: true,
              guestLastName: true,
              invitation: {
                select: {
                  status: true
                }
              }
            }
          },
          invitations: {
            select: {
              id: true,
              status: true
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
            guest.invitation?.status !== 'CANCELLED' &&
            guest.invitation?.status !== 'EXPIRED' &&
            (guest.guestFirstName.toLowerCase().includes(searchTerm) ||
              guest.guestLastName.toLowerCase().includes(searchTerm) ||
              `${guest.guestFirstName} ${guest.guestLastName}`.toLowerCase().includes(searchTerm))
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
        const activeGuestCount = event.invitations.filter(inv =>
          inv.status === 'PENDING' || inv.status === 'USED'
        ).length;
        const registeredCount = event.registrations.filter(r => r.status === 'CONFIRMED').length + activeGuestCount;
        const waitlistCount = event.registrations.filter(r => r.status === 'WAITLIST').length;
        const userRegistration = event.registrations.find(r => r.userId === userId);
        const confirmedRegistrations = event.registrations.filter(r => r.status === 'CONFIRMED');
        const hasSocioRegistered = confirmedRegistrations.some(
          r => r.user?.membership?.type === 'SOCIO'
        );
        const hasColaboradorRegistered = confirmedRegistrations.some(
          r => r.user?.membership?.type === 'COLABORADOR'
        );

        return {
          ...event,
          registrations: undefined, // No exponer lista completa en el listado
          eventGuests: undefined,
          invitations: undefined,
          guestCount: activeGuestCount,
          registeredCount,
          waitlistCount,
          isUserRegistered: !!userRegistration && userRegistration.status !== 'CANCELLED',
          userRegistrationStatus: userRegistration?.status,
          hasSocioRegistered,
          hasColaboradorRegistered
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
                },
                profile: {
                  select: {
                    avatar: true
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
              guestLastName: true,
              invitationId: true,
              invitation: {
                select: {
                  status: true,
                  memberId: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          invitations: {
            select: {
              id: true,
              status: true,
              guestFirstName: true,
              guestLastName: true,
              memberId: true
            },
            orderBy: { createdAt: 'asc' }
          },
          game: {
            select: {
              thumbnail: true,
              image: true,
              description: true,
              averageRating: true,
              bayesAverage: true,
              rank: true,
              complexityRating: true,
              minPlayers: true,
              maxPlayers: true,
              playingTime: true,
              minPlaytime: true,
              maxPlaytime: true,
              minAge: true,
              yearPublished: true,
              designers: true,
              publishers: true,
              categories: true,
              mechanics: true
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

      const activeInvitationsCount = event.invitations.filter(inv =>
        inv.status === 'PENDING' || inv.status === 'USED'
      ).length;
      const guestCount = activeInvitationsCount;
      const registeredCount =
        event.registrations.filter(r => r.status === 'CONFIRMED').length + activeInvitationsCount;
    const waitlistCount = event.registrations.filter(r => r.status === 'WAITLIST').length;
    const userRegistration = event.registrations.find(r => r.userId === userId);

    res.status(200).json({
      success: true,
      data: {
          event: {
            ...event,
            eventGuests: undefined,
            invitations: event.invitations.map(invitation => ({
              id: invitation.id,
              guestFirstName: invitation.guestFirstName,
              guestLastName: invitation.guestLastName,
              status: invitation.status,
              inviterId: invitation.memberId
            })),
            guestCount,
            registeredCount,
            waitlistCount,
            isUserRegistered: !!userRegistration && userRegistration.status !== 'CANCELLED',
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
      gameCategory,
      startHour,
      startMinute,
      durationHours,
      durationMinutes,
      attend
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
        gameCategory: gameCategory || null,
        startHour: startHour !== undefined ? parseInt(startHour) : null,
        startMinute: startMinute !== undefined ? parseInt(startMinute) : null,
        durationHours: durationHours !== undefined ? parseInt(durationHours) : null,
        durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : null,
        requiresApproval: req.body.requiresApproval !== undefined ? req.body.requiresApproval === true || req.body.requiresApproval === 'true' : true,
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

    const shouldAttend =
      attend === undefined ? true : attend === true || attend === 'true' || attend === 'on';
    if (shouldAttend) {
      await prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          userId,
          status: 'CONFIRMED'
        }
      });

      // Tracking automático si el evento tiene nombre de juego y categoría
      if (gameName && gameCategory) {
        const { checkAndUnlockBadges } = await import('./badgeController');

        // Registrar el juego jugado
        await prisma.gamePlayHistory.create({
          data: {
            userId,
            eventId: event.id,
            gameName,
            gameCategory
          }
        });

        // Verificar y desbloquear badges
        await checkAndUnlockBadges(userId, gameCategory);
      }
    }

    // Notificar a usuarios con preferencia activada
    const { notifyNewEvent } = await import('../services/notificationService');
    await notifyNewEvent(event.id, event.title, event.date, userId);

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
    const {
      title, description, date, location, address, maxAttendees, status,
      gameName, gameImage, bggId, gameCategory,
      startHour, startMinute, durationHours, durationMinutes,
      requiresApproval
    } = req.body;

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

    let newMaxAttendees: number | null = null;
    if (maxAttendees !== undefined) {
      newMaxAttendees = parseInt(maxAttendees);
      if (Number.isNaN(newMaxAttendees) || newMaxAttendees < 1) {
        res.status(400).json({
          success: false,
          message: 'Capacidad inválida'
        });
        return;
      }

      const [confirmedCount, activeInvitations] = await Promise.all([
        prisma.eventRegistration.count({
          where: {
            eventId: id,
            status: 'CONFIRMED'
          }
        }),
        prisma.invitation.count({
          where: {
            eventId: id,
            status: { in: ['PENDING', 'USED'] }
          }
        })
      ]);

      const currentCount = confirmedCount + activeInvitations;
      if (newMaxAttendees < currentCount) {
        res.status(400).json({
          success: false,
          message: 'La capacidad no puede ser menor que los asistentes actuales'
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {
      ...(title && { title }),
      ...(description && { description }),
      ...(date && { date: new Date(date) }),
      ...(address !== undefined && { address }),
      ...(newMaxAttendees !== null && { maxAttendees: newMaxAttendees }),
      ...(status && { status }),
      ...(gameName !== undefined && { gameName: gameName || null }),
      ...(gameImage !== undefined && { gameImage: gameImage || null }),
      ...(bggId !== undefined && { bggId: bggId || null }),
      ...(gameCategory !== undefined && { gameCategory: gameCategory || null }),
      ...(startHour !== undefined && { startHour: startHour !== null ? parseInt(startHour) : null }),
      ...(startMinute !== undefined && { startMinute: startMinute !== null ? parseInt(startMinute) : null }),
      ...(durationHours !== undefined && { durationHours: durationHours !== null ? parseInt(durationHours) : null }),
      ...(durationMinutes !== undefined && { durationMinutes: durationMinutes !== null ? parseInt(durationMinutes) : null }),
      ...(requiresApproval !== undefined && { requiresApproval: requiresApproval === true || requiresApproval === 'true' })
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

    if (newMaxAttendees !== null && newMaxAttendees < existingEvent.maxAttendees) {
      await prisma.eventAuditLog.create({
        data: {
          eventId: id!,
          actorId: userId!,
          action: 'CLOSE_CAPACITY',
          details: JSON.stringify({
            from: existingEvent.maxAttendees,
            to: newMaxAttendees
          })
        }
      });
    }

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

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Datos invalidos'
        });
        return;
      }

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

      // Notificar a los usuarios inscritos
      const { notifyEventCancelled } = await import('../services/notificationService');
      await notifyEventCancelled(id, event.title);

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
          invitations: {
            where: { status: { in: ['PENDING', 'USED'] } },
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

          const confirmedCount = event.registrations.length + (event.invitations?.length || 0);
          if (confirmedCount >= event.maxAttendees) {
            res.status(400).json({
              success: false,
              message: 'Evento completo'
            });
            return;
          }

          const registration = await prisma.eventRegistration.update({
            where: { id: existingRegistration.id },
            data: {
            status: 'CONFIRMED',
            cancelledAt: null
            }
          });

          await prisma.eventAuditLog.create({
            data: {
              eventId: id,
              actorId: userId,
              action: 'REGISTER',
              targetUserId: userId
            }
          });

          // Tracking automático de juego si el evento tiene categoría
          if (event.gameName && event.gameCategory) {
            const { checkAndUnlockBadges } = await import('./badgeController');

            // Registrar el juego jugado
            await prisma.gamePlayHistory.create({
              data: {
                userId,
                eventId: id,
                gameName: event.gameName,
                gameCategory: event.gameCategory
              }
            });

            // Verificar y desbloquear badges
            await checkAndUnlockBadges(userId, event.gameCategory);
          }

          res.status(200).json({
            success: true,
            data: { registration },
          message: 'Te has registrado correctamente al evento'
          });
          return;
        }

      res.status(400).json({
        success: false,
        message: 'Ya est?s registrado a este evento'
      });
      return;
      }

      const confirmedCount = event.registrations.length + (event.invitations?.length || 0);
      if (confirmedCount >= event.maxAttendees) {
        res.status(400).json({
          success: false,
          message: 'Evento completo'
        });
        return;
      }

      // Determinar status: PENDING_APPROVAL si requiere aprobación, sino CONFIRMED
      const registrationStatus = event.requiresApproval ? 'PENDING_APPROVAL' : 'CONFIRMED';

      const registration = await prisma.eventRegistration.create({
        data: {
          eventId: id,
          userId,
          status: registrationStatus
        }
      });

      await prisma.eventAuditLog.create({
        data: {
          eventId: id,
          actorId: userId,
          action: 'REGISTER',
          targetUserId: userId
        }
      });

      // Si requiere aprobación, notificar al organizador
      if (event.requiresApproval) {
        const { notifyRegistrationPending } = await import('../services/notificationService');
        const { sendRegistrationPendingEmail } = await import('../services/emailService');

        const organizer = await prisma.user.findUnique({
          where: { id: event.createdBy },
          select: { name: true, email: true }
        });

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        });

        if (organizer && user) {
          await notifyRegistrationPending(id, event.title, event.createdBy, user.name);
          await sendRegistrationPendingEmail(organizer.email, organizer.name, event.title, user.name, id);
        }

        res.status(201).json({
          success: true,
          data: { registration },
          message: 'Tu solicitud está pendiente de aprobación del organizador'
        });
        return;
      }

      // Solo hacer tracking de badges si está CONFIRMED
      if (event.gameName && event.gameCategory) {
        const { checkAndUnlockBadges } = await import('./badgeController');

        // Registrar el juego jugado
        await prisma.gamePlayHistory.create({
          data: {
            userId,
            eventId: id,
            gameName: event.gameName,
            gameCategory: event.gameCategory
          }
        });

        // Verificar y desbloquear badges
        await checkAndUnlockBadges(userId, event.gameCategory);
      }

      res.status(201).json({
        success: true,
        data: { registration },
        message: 'Te has registrado correctamente al evento'
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
      },
      include: {
        event: {
          select: {
            date: true
          }
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

    // Validar que el evento no haya comenzado
    const eventDate = new Date(registration.event.date);
    const now = new Date();
    if (eventDate <= now) {
      res.status(400).json({
        success: false,
        message: 'No puedes cancelar tu registro en un evento que ya ha comenzado o pasado'
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

    await prisma.eventAuditLog.create({
      data: {
        eventId: id,
        actorId: userId,
        action: 'UNREGISTER',
        targetUserId: userId
      }
    });

    // Si era CONFIRMED, promover el primero de la waitlist
    if (wasConfirmed) {
      const [eventInfo, confirmedCount] = await Promise.all([
          prisma.event.findUnique({
            where: { id },
            select: {
              maxAttendees: true,
              invitations: {
                where: { status: { in: ['PENDING', 'USED'] } },
                select: { id: true }
              }
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
          const totalConfirmed = confirmedCount + (eventInfo.invitations?.length || 0);
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
 * DELETE /api/events/:id/registrations/:registrationId - Eliminar participante (organizador o admin)
 */
export const removeParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, registrationId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!id || !registrationId || !userId) {
      res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
      return;
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            date: true,
            createdBy: true,
            maxAttendees: true,
            eventGuests: { select: { id: true } }
          }
        }
      }
    });

    if (!registration || registration.eventId !== id) {
      res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
      return;
    }

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isOrganizer = registration.event?.createdBy === userId;

    if (!isAdmin && !isOrganizer) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar participantes'
      });
      return;
    }

    // Validar que el evento no haya comenzado
    const eventDate = new Date(registration.event.date);
    const now = new Date();
    if (eventDate <= now) {
      res.status(400).json({
        success: false,
        message: 'No se pueden eliminar participantes de un evento que ya ha comenzado o pasado'
      });
      return;
    }

    if (registration.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        message: 'El participante ya está cancelado'
      });
      return;
    }

    const wasConfirmed = registration.status === 'CONFIRMED';

    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    });

    await prisma.eventAuditLog.create({
      data: {
        eventId: id,
        actorId: userId,
        action: 'REMOVE_PARTICIPANT',
        targetUserId: registration.userId
      }
    });

    if (wasConfirmed) {
      const [eventInfo, confirmedCount] = await Promise.all([
        prisma.event.findUnique({
          where: { id },
          select: {
            maxAttendees: true,
            invitations: {
              where: { status: { in: ['PENDING', 'USED'] } },
              select: { id: true }
            }
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
        const totalConfirmed = confirmedCount + (eventInfo.invitations?.length || 0);
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
      message: 'Participante eliminado'
    });
  } catch (error) {
    console.error('Error al eliminar participante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar participante'
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
 * Buscar miembros del club para apuntarlos a un evento
 * GET /api/events/members/search?q=nombre
 */
export const searchMembersForEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Escribe al menos 2 caracteres para buscar' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        name: { contains: q.trim(), mode: 'insensitive' },
        status: 'APPROVED',
        membership: {
          type: { in: ['SOCIO', 'COLABORADOR', 'EN_PRUEBAS'] },
          isActive: true
        },
        profile: {
          allowEventInvitations: true
        }
      },
      select: {
        id: true,
        name: true,
        membership: { select: { type: true } },
        profile: { select: { avatar: true } }
      },
      take: 10
    });

    res.status(200).json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.profile?.avatar ?? null,
        membershipType: u.membership?.type ?? null
      }))
    });
  } catch (error) {
    console.error('Error buscando miembros:', error);
    res.status(500).json({ success: false, message: 'Error al buscar miembros' });
  }
};

/**
 * Apuntar a un miembro del club a un evento (solo organizador o admin)
 * POST /api/events/:id/add-member
 */
export const addMemberToEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const { userId: targetUserId } = req.body;

    if (!actorId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    if (!id) {
      res.status(400).json({ success: false, message: 'ID de evento requerido' });
      return;
    }
    if (!targetUserId) {
      res.status(400).json({ success: false, message: 'userId requerido' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    const isAdmin = actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN';
    if (!isAdmin && event.createdBy !== actorId) {
      res.status(403).json({ success: false, message: 'Sin permiso para añadir miembros' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true }
    });

    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    if (targetUser.profile?.allowEventInvitations === false) {
      res.status(400).json({ success: false, message: 'Este usuario no permite ser apuntado a eventos' });
      return;
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: id, userId: targetUserId } }
    });

    if (existing && existing.status !== 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Este usuario ya está registrado en el evento' });
      return;
    }

    const [confirmedCount, activeInvitations] = await Promise.all([
      prisma.eventRegistration.count({ where: { eventId: id, status: 'CONFIRMED' } }),
      prisma.invitation.count({ where: { eventId: id, status: { in: ['PENDING', 'USED'] } } })
    ]);

    if (confirmedCount + activeInvitations >= event.maxAttendees) {
      res.status(400).json({ success: false, message: 'El evento está completo' });
      return;
    }

    if (existing && existing.status === 'CANCELLED') {
      await prisma.eventRegistration.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED' }
      });
    } else {
      await prisma.eventRegistration.create({
        data: { eventId: id, userId: targetUserId, status: 'CONFIRMED' }
      });
    }

    const { createNotification } = await import('../services/notificationService');
    await createNotification({
      userId: targetUserId,
      type: 'EVENT_MODIFIED',
      title: 'Te han apuntado a una partida',
      message: `Te han apuntado a la partida "${event.title}".`,
      metadata: { eventId: id, eventTitle: event.title }
    });

    res.status(200).json({
      success: true,
      message: `${targetUser.name} ha sido apuntado a la partida`
    });
  } catch (error) {
    console.error('Error añadiendo miembro:', error);
    res.status(500).json({ success: false, message: 'Error al apuntar miembro' });
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

/**
 * GET /api/events/:id/pending-registrations - Obtener registros pendientes de aprobación
 */
export const getPendingRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const event = await prisma.event.findUnique({
      where: { id },
      select: { createdBy: true }
    });

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
      return;
    }

    // Solo organizador o admin pueden ver registros pendientes
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isAdmin && event.createdBy !== userId) {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver las solicitudes pendientes'
      });
      return;
    }

    const pendingRegistrations = await prisma.eventRegistration.findMany({
      where: {
        eventId: id,
        status: 'PENDING_APPROVAL'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Primero en llegar, primero en ser aprobado
    });

    res.status(200).json({
      success: true,
      data: { registrations: pendingRegistrations }
    });
  } catch (error) {
    console.error('Error al obtener registros pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros pendientes'
    });
  }
};

/**
 * POST /api/events/:id/registrations/:registrationId/approve - Aprobar registro
 */
export const approveRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, registrationId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            createdBy: true,
            maxAttendees: true,
            gameName: true,
            gameCategory: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!registration || registration.eventId !== id) {
      res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
      return;
    }

    // Solo organizador o admin pueden aprobar
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isAdmin && registration.event.createdBy !== userId) {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para aprobar registros'
      });
      return;
    }

    if (registration.status !== 'PENDING_APPROVAL') {
      res.status(400).json({
        success: false,
        message: 'Este registro ya fue procesado'
      });
      return;
    }

    // Verificar capacidad
    const [confirmedCount, activeInvitations] = await Promise.all([
      prisma.eventRegistration.count({
        where: {
          eventId: id,
          status: 'CONFIRMED'
        }
      }),
      prisma.invitation.count({
        where: {
          eventId: id,
          status: { in: ['PENDING', 'USED'] }
        }
      })
    ]);

    const totalConfirmed = confirmedCount + activeInvitations;
    if (totalConfirmed >= registration.event.maxAttendees) {
      res.status(400).json({
        success: false,
        message: 'El evento está completo'
      });
      return;
    }

    // Aprobar registro
    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: 'CONFIRMED' }
    });

    // Badge tracking si aplica
    if (registration.event.gameName && registration.event.gameCategory) {
      const { checkAndUnlockBadges } = await import('./badgeController');

      await prisma.gamePlayHistory.create({
        data: {
          userId: registration.userId,
          eventId: id,
          gameName: registration.event.gameName,
          gameCategory: registration.event.gameCategory
        }
      });

      await checkAndUnlockBadges(registration.userId, registration.event.gameCategory);
    }

    // Notificar usuario
    const { notifyRegistrationApproved } = await import('../services/notificationService');
    const { sendRegistrationApprovedEmail } = await import('../services/emailService');

    await notifyRegistrationApproved(registration.userId, id, registration.event.title);
    await sendRegistrationApprovedEmail(
      registration.user.email,
      registration.user.name,
      registration.event.title,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Registro aprobado'
    });
  } catch (error) {
    console.error('Error al aprobar registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar registro'
    });
  }
};

/**
 * POST /api/events/:id/registrations/:registrationId/reject - Rechazar registro
 */
export const rejectRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, registrationId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            createdBy: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!registration || registration.eventId !== id) {
      res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
      return;
    }

    // Solo organizador o admin pueden rechazar
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isAdmin && registration.event.createdBy !== userId) {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para rechazar registros'
      });
      return;
    }

    if (registration.status !== 'PENDING_APPROVAL') {
      res.status(400).json({
        success: false,
        message: 'Este registro ya fue procesado'
      });
      return;
    }

    // Rechazar registro (marcar como CANCELLED)
    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    // Notificar usuario
    const { notifyRegistrationRejected } = await import('../services/notificationService');

    await notifyRegistrationRejected(registration.userId, id, registration.event.title);

    res.status(200).json({
      success: true,
      message: 'Registro rechazado'
    });
  } catch (error) {
    console.error('Error al rechazar registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar registro'
    });
  }
};

/**
 * Marcar evento como completado manualmente (solo admins)
 * POST /api/events/:id/complete
 */
export const completeEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          where: { status: RegistrationStatus.CONFIRMED },
          select: { userId: true }
        }
      }
    });

    if (!event) {
      res.status(404).json({ success: false, message: 'Evento no encontrado' });
      return;
    }

    if (event.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'El evento ya está marcado como completado' });
      return;
    }

    if (event.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'No se puede completar un evento cancelado' });
      return;
    }

    await prisma.event.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    // Registrar en GamePlayHistory y desbloquear badges para partidas con juego y categoría
    if (event.type === 'PARTIDA' && event.gameName && event.gameCategory) {
      const gameName = event.gameName;
      const gameCategory = event.gameCategory as BadgeCategory;

      for (const { userId } of event.registrations) {
        const alreadyTracked = await prisma.gamePlayHistory.findFirst({
          where: { userId, eventId: id }
        });

        if (!alreadyTracked) {
          await prisma.gamePlayHistory.create({
            data: { userId, eventId: id, gameName, gameCategory }
          });
          await checkAndUnlockBadges(userId, gameCategory);
        }
      }
    }

    res.status(200).json({ success: true, message: 'Evento marcado como completado' });
  } catch (error) {
    console.error('Error al completar evento:', error);
    res.status(500).json({ success: false, message: 'Error al completar el evento' });
  }
};
