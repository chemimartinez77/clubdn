// client/src/pages/ForgotPassword.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import { api } from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { success, error: showError } = useToast();
  const { themeMode } = useTheme();

  const requestResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('/api/auth/request-password-reset', { email });
      return response.data;
    },
    onSuccess: (data) => {
      success(data.message);
      setSubmitted(true);
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al enviar el correo de recuperación');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError('Por favor ingresa tu email');
      return;
    }
    requestResetMutation.mutate(email);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primaryDark)] px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Email Enviado</h2>
              <p className="text-[var(--color-textSecondary)] mb-6">
                Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p className="text-sm text-[var(--color-textSecondary)] mb-6">
                Por favor revisa tu bandeja de entrada y la carpeta de spam.
              </p>
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Volver al Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primaryDark)] px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <img
              src={themeMode === 'dark' ? '/logowhite.png' : '/logo.png'}
              alt="Club Dreadnought"
              className="h-20 w-auto mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-[var(--color-textSecondary)]">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                placeholder="tu@email.com"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={requestResetMutation.isPending}
            >
              {requestResetMutation.isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primaryDark)] font-medium"
              >
                ← Volver al login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
