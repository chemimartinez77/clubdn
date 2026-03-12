// client/src/pages/JoinViaShareLink.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/axios';
import { useToast } from '../hooks/useToast';
import type { ApiResponse } from '../types/auth';

interface ShareLinkData {
  event: {
    id: string;
    title: string;
    date: string;
    startHour?: number | null;
    startMinute?: number | null;
    durationHours?: number | null;
    durationMinutes?: number | null;
    status: string;
    maxAttendees: number;
    registeredCount: number;
    gameName?: string | null;
    location?: string | null;
    requiresApproval: boolean;
    isFull: boolean;
    isActive: boolean;
  };
  invitedBy: { id: string; name: string };
}

const formatSchedule = (
  date: string,
  startHour?: number | null,
  startMinute?: number | null,
  durationHours?: number | null,
  durationMinutes?: number | null
): string => {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (startHour == null) return dateStr;
  const hh = String(startHour).padStart(2, '0');
  const mm = String(startMinute ?? 0).padStart(2, '0');
  let result = `${dateStr} · ${hh}:${mm}`;
  if (durationHours || durationMinutes) {
    const totalMin = (durationHours ?? 0) * 60 + (durationMinutes ?? 0);
    const endDate = new Date(d);
    endDate.setHours(startHour, startMinute ?? 0, 0, 0);
    endDate.setMinutes(endDate.getMinutes() + totalMin);
    const eh = String(endDate.getHours()).padStart(2, '0');
    const em = String(endDate.getMinutes()).padStart(2, '0');
    result += `-${eh}:${em}`;
  }
  return result;
};

export default function JoinViaShareLink() {
  const { token } = useParams<{ token: string }>();
  const { success, error: showError } = useToast();

  const [form, setForm] = useState({ firstName: '', lastName: '', dni: '' });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shareLink', token],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ShareLinkData>>(`/api/share/${token}`);
      return res.data.data!;
    },
    enabled: !!token,
    retry: false
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/share/${token}/request`, {
        guestFirstName: form.firstName.trim(),
        guestLastName: form.lastName.trim(),
        guestDni: form.dni.trim()
      });
      return res.data;
    },
    onSuccess: (res) => {
      success(res.message || 'Solicitud enviada');
      setSubmitted(true);
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message || 'Error al enviar la solicitud');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-textSecondary)]">Cargando...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center p-8">
          <p className="text-lg font-semibold text-[var(--color-text)] mb-2">Enlace no válido</p>
          <p className="text-[var(--color-textSecondary)]">Este enlace no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  const { event, invitedBy } = data;
  const spotsLeft = event.maxAttendees - event.registeredCount;

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Header Club */}
        <div className="text-center mb-2">
          <p className="text-sm text-[var(--color-textSecondary)]">Club Dreadnought</p>
        </div>

        {/* Banner padrino */}
        <div className="rounded-lg bg-[var(--color-primary)] bg-opacity-10 border border-[var(--color-primary)] px-4 py-3 text-center">
          <p className="text-sm text-[var(--color-text)]">
            <span className="font-semibold">{invitedBy.name}</span> te invita a esta partida
          </p>
        </div>

        {/* Info evento */}
        <div className="rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-card)] p-5 space-y-3">
          <h1 className="text-xl font-bold text-[var(--color-text)]">{event.title}</h1>
          {event.gameName && (
            <p className="text-sm text-[var(--color-textSecondary)]">{event.gameName}</p>
          )}
          <p className="text-sm text-[var(--color-textSecondary)]">
            {formatSchedule(event.date, event.startHour, event.startMinute, event.durationHours, event.durationMinutes)}
          </p>
          {event.location && (
            <p className="text-sm text-[var(--color-textSecondary)]">{event.location}</p>
          )}
          <p className="text-sm text-[var(--color-textSecondary)]">
            {event.isFull
              ? `Completo (${event.registeredCount}/${event.maxAttendees})`
              : `${spotsLeft} plaza${spotsLeft !== 1 ? 's' : ''} disponible${spotsLeft !== 1 ? 's' : ''} de ${event.maxAttendees}`}
          </p>
        </div>

        {/* Estado no activo */}
        {!event.isActive && (
          <div className="rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-card)] p-4 text-center">
            <p className="text-[var(--color-textSecondary)] text-sm">
              {event.status === 'CANCELLED' ? 'Esta partida ha sido cancelada.' : 'Esta partida ya no está disponible.'}
            </p>
          </div>
        )}

        {/* Formulario solicitud */}
        {event.isActive && !event.isFull && !submitted && (
          <div className="rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-card)] p-5 space-y-4">
            <h2 className="font-semibold text-[var(--color-text)]">
              {event.requiresApproval ? 'Solicitar plaza' : 'Apuntarme como invitado'}
            </h2>
            {event.requiresApproval && (
              <p className="text-xs text-[var(--color-textSecondary)]">
                El organizador deberá aprobar tu solicitud.
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Apellidos *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Tus apellidos"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">DNI / NIE *</label>
                <input
                  type="text"
                  value={form.dni}
                  onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="12345678A"
                />
              </div>
              <button
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending || !form.firstName.trim() || !form.lastName.trim() || !form.dni.trim()}
                className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {requestMutation.isPending ? 'Enviando...' : event.requiresApproval ? 'Solicitar plaza' : 'Apuntarme'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmación */}
        {submitted && (
          <div className="rounded-lg border border-green-600 bg-green-900 bg-opacity-20 p-5 text-center">
            <p className="font-semibold text-green-400 mb-1">
              {event.requiresApproval ? 'Solicitud enviada' : 'Invitación creada'}
            </p>
            <p className="text-sm text-[var(--color-textSecondary)]">
              {event.requiresApproval
                ? 'El organizador revisará tu solicitud. Si es aprobada, recibirás la confirmación a través de la persona que te invitó.'
                : `Muestra tu DNI en la entrada. ${invitedBy.name} tiene los detalles de tu invitación.`}
            </p>
          </div>
        )}

        {/* Evento lleno */}
        {event.isActive && event.isFull && (
          <div className="rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-card)] p-4 text-center">
            <p className="text-[var(--color-textSecondary)] text-sm">Esta partida está completa.</p>
          </div>
        )}

      </div>
    </div>
  );
}
