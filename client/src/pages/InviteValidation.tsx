// client/src/pages/InviteValidation.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  EXPIRED: 'Expirado'
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  USED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800'
};

export default function InviteValidation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const { data: invitation, isLoading, isError, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null;
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
      success(data.message || 'Entrada confirmada');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'No se pudo validar la invitacion');
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
      (error as any)?.response?.data?.message || 'No se encontro la invitacion o el token es invalido.';
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-red-700">Invitacion no valida</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{errorMessage}</p>
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Validar Invitacion</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Invitado</p>
              <p className="text-lg font-semibold text-gray-900">{invitation.guestName}</p>
            </div>

            {invitation.inviter && (
              <div>
                <p className="text-sm text-gray-500">Socio invitador</p>
                <p className="text-gray-900">{invitation.inviter.name}</p>
              </div>
            )}

            {invitation.event && (
              <div>
                <p className="text-sm text-gray-500">Evento</p>
                <p className="text-gray-900">{invitation.event.title}</p>
                <p className="text-sm text-gray-600">{new Date(invitation.event.date).toLocaleString('es-ES')}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">Valido para</p>
              <p className="text-gray-900">{new Date(invitation.validDate).toLocaleDateString('es-ES')}</p>
            </div>

            {invitation.validatedBy && (
              <div>
                <p className="text-sm text-gray-500">Validado por</p>
                <p className="text-gray-900">{invitation.validatedBy.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            {isPending ? (
              <>
                <p className="text-gray-700">
                  Confirma la entrada solo cuando el invitado este en la puerta.
                </p>
                <Button
                  onClick={() => validateMutation.mutate()}
                  disabled={validateMutation.isPending}
                  variant="primary"
                  className="w-full"
                >
                  {validateMutation.isPending ? 'Validando...' : 'Confirmar entrada'}
                </Button>
              </>
            ) : (
              <p className="text-gray-700">
                {invitation.status !== 'PENDING'
                  ? `Esta invitacion no puede ser validada porque esta ${statusLabel.toLowerCase()}.`
                  : 'Esta invitacion no es valida hoy.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
