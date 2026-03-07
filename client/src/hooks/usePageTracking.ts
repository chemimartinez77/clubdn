// client/src/hooks/usePageTracking.ts
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

const IGNORED_PREFIXES = ['/admin'];

export const usePageTracking = () => {
  const location = useLocation();
  const { isAuthenticated, impersonating } = useAuth();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (impersonating) return;

    const path = location.pathname;

    if (IGNORED_PREFIXES.some(prefix => path.startsWith(prefix))) return;
    if (path === lastTrackedPath.current) return;

    lastTrackedPath.current = path;

    // Fire-and-forget: no bloqueamos ni propagamos errores
    api.post('/api/pageviews', { path }).catch(() => {});
  }, [location.pathname, isAuthenticated, impersonating]);
};
