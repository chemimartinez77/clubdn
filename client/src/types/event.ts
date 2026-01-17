// client/src/types/event.ts
export type EventType = 'PARTIDA' | 'TORNEO' | 'OTROS';
export type EventStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED' | 'WAITLIST';

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;

  // Datos del juego (opcional, para partidas)
  gameName?: string | null;
  gameImage?: string | null;
  bggId?: string | null;
  game?: {
    thumbnail: string | null;
    image: string | null;
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

  // Registros completos (solo en detalle)
  registrations?: EventRegistration[];
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
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  type?: EventType;
  gameName?: string;
  gameImage?: string;
  bggId?: string;
  date?: string;
  startHour?: number;
  startMinute?: number;
  durationHours?: number;
  durationMinutes?: number;
  location?: string;
  address?: string;
  maxAttendees?: number;
  status?: EventStatus;
}

// BGG Types
export interface BGGGame {
  id: string;
  name: string;
  yearPublished: string;
  image: string;
  thumbnail: string;
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
