// client/src/api/axios.ts
import axios from 'axios';

const normalizeBaseUrl = (url?: string) => {
  if (!url) return undefined;
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const defaultBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5000'
  : (typeof window !== 'undefined' ? window.location.origin : undefined);

const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL) ?? normalizeBaseUrl(defaultBaseUrl) ?? '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para a�adir el token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // No redirigir si es un intento de login fallido
      const isLoginAttempt = error.config?.url?.includes('/api/auth/login');

      if (!isLoginAttempt) {
        // Token inválido o expirado
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
