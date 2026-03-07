// client/src/contexts/AuthContext.tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import type { User, LoginData, ApiResponse } from '../types/auth';

interface ImpersonatedUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  impersonating: ImpersonatedUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => void;
  impersonate: (memberId: string) => Promise<void>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [impersonating, setImpersonating] = useState<ImpersonatedUser | null>(() => {
    const stored = localStorage.getItem('impersonating');
    return stored ? JSON.parse(stored) : null;
  });

  // Query para obtener el usuario actual
  const {
    data: user = null,
    isLoading,
    refetch: refetchUser
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;

      try {
        const response = await api.get<ApiResponse<{ user: User }>>('/api/auth/me');
        return response.data.data?.user || null;
      } catch (error) {
        // Si falla la autenticación, limpiar el token
        localStorage.removeItem('token');
        return null;
      }
    },
    enabled: !!localStorage.getItem('token'),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false
  });

  const impersonate = async (memberId: string) => {
    const response = await api.post<ApiResponse<{ token: string; impersonatedUser: ImpersonatedUser }>>(
      `/api/admin/members/${memberId}/impersonate`
    );
    const data = response.data.data!;
    localStorage.setItem('adminToken', localStorage.getItem('token')!);
    localStorage.setItem('token', data.token);
    localStorage.setItem('impersonating', JSON.stringify(data.impersonatedUser));
    setImpersonating(data.impersonatedUser);
    queryClient.removeQueries({ queryKey: ['currentUser'] });
    navigate('/');
  };

  const stopImpersonating = () => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      localStorage.setItem('token', adminToken);
      localStorage.removeItem('adminToken');
    }
    localStorage.removeItem('impersonating');
    setImpersonating(null);
    queryClient.removeQueries({ queryKey: ['currentUser'] });
    navigate('/admin/members');
  };

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginData) => {
      const response = await api.post<ApiResponse<{ token: string; user: User }>>(
        '/api/auth/login',
        { email, password }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data) {
        localStorage.setItem('token', data.token);
        queryClient.setQueryData(['currentUser'], data.user);
      }
    }
  });

  // Mutation para logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('token');
      queryClient.clear();
    },
    onSuccess: () => {
      navigate('/login');
    }
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    impersonating,
    login,
    logout,
    refetchUser,
    impersonate,
    stopImpersonating
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
