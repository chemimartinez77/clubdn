// client/src/types/event.ts
import type { BadgeCategory } from './badge';

export type EventType = 'PARTIDA' | 'TORNEO' | 'OTROS';
export type EventStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED' | 'WAITLIST' | 'PENDING_APPROVAL';

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;

  // Datos del juego (opcional, para partidas)
  gameName?: string | null;
  gameImage?: string | null;
  bggId?: string | null;
  gameCategory?: BadgeCategory | null;
  game?: {
    thumbnail: string | null;
    image: string | null;
    description?: string | null;
    averageRating?: number | null;
    bayesAverage?: number | null;
    rank?: number | null;
    complexityRating?: number | null;
    minPlayers?: number | null;
    maxPlayers?: number | null;
    playingTime?: number | null;
    minPlaytime?: number | null;
    maxPlaytime?: number | null;
    minAge?: number | null;
    yearPublished?: number | null;
    designers?: string[] | null;
    publishers?: string[] | null;
    categories?: string[] | null;
    mechanics?: string[] | null;
  } | null;

  // Fecha y hora
  date: string;
  startHour?: number | null;
  startMinute?: number | null;
  durationHours?: number | null;
  durationMinutes?: number | null;

  // Ubicación
  location: string;
  address: string | null;

  // Capacidad
  maxAttendees: number;
  guestCount?: number;
  requiresApproval?: boolean;
  status: EventStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Organizador
  organizer?: {
    id: string;
    name: string;
    email: string;
  };

  // Datos calculados
  registeredCount?: number;
  waitlistCount?: number;
  isUserRegistered?: boolean;
  userRegistrationStatus?: RegistrationStatus;
  hasSocioRegistered?: boolean;
  hasColaboradorRegistered?: boolean;

  // Registros completos (solo en detalle)
  registrations?: EventRegistration[];

  // Invitaciones del evento (solo en detalle)
  invitations?: EventInvitation[];
  eventGuests?: EventGuest[];
}

export interface EventGuest {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  invitationId?: string | null;
  inviterId?: string | null;
}

export interface EventInvitation {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'CANCELLED';
  inviterId?: string | null;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    membership?: {
      type: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA';
    } | null;
    profile?: {
      avatar?: string | null;
    } | null;
  };
}

export interface CreateEventData {
  title: string;
  description: string;
  type: EventType;

  // Datos del juego (opcional)
  gameName?: string;
  gameImage?: string;
  bggId?: string;
  gameCategory?: string;

  // Fecha y hora
  date: string;
  startHour?: number;
  startMinute?: number;
  durationHours?: number;
  durationMinutes?: number;

  // Ubicación
  location: string;
  address?: string;

  // Capacidad
  maxAttendees: number;
  attend?: boolean;
  requiresApproval?: boolean;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  type?: EventType;
  gameName?: string | null;
  gameImage?: string | null;
  bggId?: string | null;
  date?: string;
  startHour?: number;
  startMinute?: number;
  durationHours?: number;
  durationMinutes?: number;
  location?: string;
  address?: string;
  maxAttendees?: number;
  status?: EventStatus;
  gameCategory?: string | null;
  requiresApproval?: boolean;
}

// BGG Types
export interface BGGGame {
  id: string;
  name: string;
  yearPublished: string;
  image: string;
  thumbnail: string;
  badgeCategory?: BadgeCategory | null;
}

export interface EventFilters {
  status?: EventStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
