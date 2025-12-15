// client/src/components/events/EventCard.tsx
import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';

interface EventCardProps {
  event: Event;
}

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ONGOING: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const statusLabels = {
  SCHEDULED: 'Programado',
  ONGOING: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado'
};

export default function EventCard({ event }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const availableSpots = event.maxAttendees - (event.registeredCount || 0);
  const isFull = availableSpots <= 0;
  const isPast = new Date(event.date) < new Date();

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex-1 pr-4">
            {event.title}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
            {statusLabels[event.status]}
          </span>
        </div>

        {/* Date & Location */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">{event.location}</span>
          </div>
        </div>

        {/* Description Preview */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {/* Attendees */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm text-gray-600">
              {event.registeredCount || 0} / {event.maxAttendees}
            </span>
            {isFull && !isPast && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Lleno
              </span>
            )}
            {event.waitlistCount && event.waitlistCount > 0 && (
              <span className="ml-2 text-xs text-gray-500">
                +{event.waitlistCount} en espera
              </span>
            )}
          </div>

          {/* Registration Status */}
          {event.isUserRegistered && (
            <div className="flex items-center gap-2">
              {event.userRegistrationStatus === 'CONFIRMED' && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Registrado
                </span>
              )}
              {event.userRegistrationStatus === 'WAITLIST' && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Lista de espera
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
