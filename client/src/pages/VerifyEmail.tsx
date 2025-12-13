// client/src/pages/VerifyEmail.tsx
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/axios';
import type { ApiResponse } from '../types/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      // Evitar múltiples ejecuciones (React StrictMode hace double-render)
      if (hasVerified.current) {
        return;
      }

      if (!token) {
        setStatus('error');
        setMessage('Token de verificación no proporcionado');
        return;
      }

      // Marcar como verificado antes de hacer la petición
      hasVerified.current = true;

      try {
        const response = await api.get<ApiResponse<never>>(
          `/api/auth/verify-email?token=${token}`
        );

        if (response.data.success) {
          setStatus('success');
          setMessage(
            response.data.message ||
              'Email verificado. Tu solicitud será revisada por un administrador.'
          );
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Error al verificar el email');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || 'Error al verificar el email'
        );
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Verificando email...
              </h2>
              <p className="text-gray-600">Por favor espera un momento</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ¡Email Verificado!
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Ir al inicio de sesión
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Error de Verificación
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/register"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Volver al registro
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
