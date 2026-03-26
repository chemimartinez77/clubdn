// client/src/pages/ValidateGame.tsx
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../api/axios';
import { useToast } from '../hooks/useToast';

export default function ValidateGame() {
  const { eventId, scannedUserId } = useParams<{ eventId: string; scannedUserId: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const called = useRef(false);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/events/${eventId}/validate-qr/${scannedUserId}`);
      return response.data;
    },
    onSuccess: () => {
      success('Partida validada correctamente');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Error al validar la partida';
      showError(msg);
    }
  });

  useEffect(() => {
    if (!called.current && eventId && scannedUserId) {
      called.current = true;
      validateMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, scannedUserId]);

  const isAlreadyValidated = (validateMutation.data as { alreadyValidated?: boolean })?.alreadyValidated;

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12 px-4">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Validación de partida</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {validateMutation.isPending && (
              <p className="text-sm text-[var(--color-textSecondary)]">Validando partida...</p>
            )}
            {validateMutation.isSuccess && (
              <p className="text-sm text-green-600 font-medium">
                {isAlreadyValidated
                  ? 'Esta partida ya estaba validada.'
                  : 'Partida validada correctamente. Ambos jugadores han recibido la recompensa.'}
              </p>
            )}
            {validateMutation.isError && (
              <p className="text-sm text-red-600">
                {(validateMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                  || 'No se pudo validar la partida.'}
              </p>
            )}
            <Button
              onClick={() => navigate(eventId ? `/events/${eventId}` : '/events')}
              className="w-full !bg-[var(--color-primary)] !text-white"
            >
              Volver a la partida
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
