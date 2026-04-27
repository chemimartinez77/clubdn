// client/src/pages/InviteValidation.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../api/axios';
import { useToast } from '../hooks/useToast';
import type { ApiResponse } from '../types/auth';
import type { Invitation } from '../types/invitation';

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  USED: 'Usado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado'
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  USED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600'
};

function getCurrentUserId(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export default function InviteValidation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const [pendantModal, setPendantModal] = useState<{ guestName: string; pendant: number } | null>(null);

  const currentUserId = getCurrentUserId();
  const isLoggedIn = !!currentUserId;

  const { data: invitation, isLoading, isError, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null;
      // Endpoint público: no necesita auth
      const response = await api.get<ApiResponse<Invitation>>(`/api/invitations/${token}`);
      return response.data.data || null;
    },
    enabled: !!token
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<Invitation>>(`/api/invitations/${token}/validate`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitation', token] });
      const inv = data.data;
      if (inv?.pendant != null) {
        setPendantModal({
          guestName: `${inv.guestFirstName} ${inv.guestLastName}`,
          pendant: inv.pendant
        });
      } else {
        success(data.message || 'Asistencia confirmada');
      }
    },
    onError: (err: any) => {
      const serverMessage = err.response?.data?.message;
      showError(serverMessage || 'No se pudo confirmar la asistencia del invitado');
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </Layout>
    );
  }

  if (!token || isError || !invitation) {
    const errorMessage =
      (error as any)?.response?.data?.message || 'No se encontró la invitación o el token es inválido.';
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-red-700">Invitación no válida</h2>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--color-textSecondary)]">{errorMessage}</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const statusStyle = statusStyles[invitation.status] || statusStyles.PENDING;
  const statusLabel = statusLabels[invitation.status] || invitation.status;

  const toDateKey = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isValidToday = toDateKey(new Date()) === toDateKey(invitation.validDate);
  const isPending = invitation.status === 'PENDING' && isValidToday;

  // El socio invitador es quien puede validar
  const isInviter = isLoggedIn && invitation.inviter?.id === currentUserId;

  // URL de este QR (para mostrar al invitado)
  const qrUrl = `${window.location.origin}/invite/${token}`;

  const wrapper = (content: React.ReactNode) => (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {content}
      </div>
      {pendantModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          <div className="bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold text-[var(--color-text)]">Check-in OK</h2>
            <p className="text-sm text-[var(--color-textSecondary)]">
              <span className="font-semibold text-[var(--color-text)]">{pendantModal.guestName}</span>
              {' '}ha sido validado correctamente.
            </p>
            <p className="text-sm text-[var(--color-textSecondary)]">Debe coger el colgante:</p>
            <div
              className="w-28 h-28 rounded-2xl flex items-center justify-center text-6xl font-extrabold text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)' }}
            >
              {pendantModal.pendant}
            </div>
            <Button onClick={() => setPendantModal(null)} variant="primary" className="w-full mt-2">
              Entendido
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );

  // Vista sin sesión o para alguien que no es el invitador: mostrar QR e info
  if (!isLoggedIn || !isInviter) {
    return wrapper(
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Tu invitación</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Invitado</p>
              <p className="text-lg font-semibold text-[var(--color-text)]">
                {invitation.guestFirstName} {invitation.guestLastName}
              </p>
            </div>

            {invitation.inviter && (
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Invitado por</p>
                <p className="text-[var(--color-text)]">{invitation.inviter.name}</p>
              </div>
            )}

            {invitation.event && (
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Evento</p>
                <p className="text-[var(--color-text)]">{invitation.event.title}</p>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {new Date(invitation.event.date).toLocaleString('es-ES')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {isPending && (
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--color-textSecondary)] text-center">
                Muestra este código QR al entrar al club.
              </p>
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <QRCode value={qrUrl} size={220} level="M" />
              </div>
              <p className="text-xs text-center text-[var(--color-textSecondary)]">
                Guarda esta pantalla en tu móvil.
              </p>
            </CardContent>
          </Card>
        )}

        {!isPending && invitation.status !== 'USED' && (
          <Card>
            <CardContent>
              <p className="text-[var(--color-textSecondary)]">
                {invitation.status === 'EXPIRED'
                  ? 'Esta invitación ha expirado.'
                  : invitation.status === 'CANCELLED'
                  ? 'Esta invitación ha sido cancelada.'
                  : 'Esta invitación no es válida hoy.'}
              </p>
            </CardContent>
          </Card>
        )}

        {invitation.status === 'USED' && (
          <Card>
            <CardContent>
              <p className="text-green-700 font-medium">Asistencia ya confirmada.</p>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // Vista del socio invitador (logueado y es el dueño)
  return wrapper(
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Validar Invitación</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[var(--color-textSecondary)]">Invitado</p>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {invitation.guestFirstName} {invitation.guestLastName}
            </p>
          </div>

          {invitation.event && (
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Evento</p>
              <p className="text-[var(--color-text)]">{invitation.event.title}</p>
              <p className="text-sm text-[var(--color-textSecondary)]">
                {new Date(invitation.event.date).toLocaleString('es-ES')}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-[var(--color-textSecondary)]">Válido para</p>
            <p className="text-[var(--color-text)]">
              {new Date(invitation.validDate).toLocaleDateString('es-ES')}
            </p>
          </div>

          {invitation.validatedBy && (
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Validado por</p>
              <p className="text-[var(--color-text)]">{invitation.validatedBy.name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          {isPending ? (
            <>
              <p className="text-[var(--color-textSecondary)]">
                Confirma esta asistencia solo si el invitado ha acudido a la partida.
              </p>
              <Button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                variant="primary"
                className="w-full"
              >
                {validateMutation.isPending ? 'Confirmando...' : 'Confirmar asistencia del invitado'}
              </Button>
            </>
          ) : (
            <p className="text-[var(--color-textSecondary)]">
              {invitation.status !== 'PENDING'
                ? `Esta invitación no puede confirmarse porque está ${statusLabel.toLowerCase()}.`
                : 'Esta invitación no es válida hoy.'}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
