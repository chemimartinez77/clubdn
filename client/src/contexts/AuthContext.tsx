// client/src/contexts/AuthContext.tsx
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import type { User, LoginData, ApiResponse } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    login,
    logout,
    refetchUser
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
