// client/src/pages/admin/Dashboard.tsx
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { api } from '../../api/axios';
import { useToast } from '../../hooks/useToast';

interface AdminStats {
  userStats: {
    total: number;
    byStatus: {
      pendingVerification: number;
      pendingApproval: number;
      approved: number;
      rejected: number;
      suspended: number;
    };
    byRole: Array<{ role: string; count: number }>;
    newUsers: {
      last7Days: number;
      last30Days: number;
    };
  };
  loginStats: {
    last24Hours: {
      total: number;
      successful: number;
      failed: number;
    };
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    createdAt: string;
    profile?: { avatar?: string | null } | null;
  }>;
}

interface Analytics {
  collectionStartedAt: string | null;
  totalViews: number;
  topPages: Array<{ path: string; count: number }>;
  activeUsersLast30Days: number;
  inactiveUsers: Array<{
    id: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
    avatar: string | null;
    nick: string | null;
    membershipType: string | null;
  }>;
  archives: Array<{
    id: string;
    archivedAt: string;
    fromDate: string;
    toDate: string;
    totalViews: number;
  }>;
}

interface UserPageViews {
  user: { id: string; name: string; email: string; profile?: { nick?: string | null; avatar?: string | null } | null } | null;
  pages: Array<{ path: string; visits: number; lastVisit: string | null }>;
}

export default function AdminDashboard() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUserId, setSearchedUserId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Push notifications
  const [pushMode, setPushMode] = useState<'all' | 'user'>('all');
  const [pushUserQuery, setPushUserQuery] = useState('');
  const [pushDebouncedQuery, setPushDebouncedQuery] = useState('');
  const [pushSelectedUser, setPushSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [showPushSuggestions, setShowPushSuggestions] = useState(false);
  const pushSearchRef = useRef<HTMLDivElement>(null);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushResult, setPushResult] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(userSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPushDebouncedQuery(pushUserQuery), 300);
    return () => clearTimeout(timer);
  }, [pushUserQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pushSearchRef.current && !pushSearchRef.current.contains(e.target as Node)) {
        setShowPushSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: AdminStats }>('/api/stats/admin');
      return response.data.data;
    }
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Analytics }>('/api/pageviews/analytics');
      return response.data.data;
    }
  });

  const { data: memberSuggestions } = useQuery({
    queryKey: ['memberSearch', debouncedQuery],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { members: Array<{ id: string; name: string; email: string; profile?: { nick?: string | null; avatar?: string | null } | null }> } }>(
        `/api/admin/members?search=${encodeURIComponent(debouncedQuery)}&pageSize=8`
      );
      return response.data.data.members;
    },
    enabled: debouncedQuery.length >= 2
  });

  const { data: pushUserSuggestions } = useQuery({
    queryKey: ['pushMemberSearch', pushDebouncedQuery],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { members: Array<{ id: string; name: string; email: string; profile?: { nick?: string | null } | null }> } }>(
        `/api/admin/members?search=${encodeURIComponent(pushDebouncedQuery)}&pageSize=8`
      );
      return response.data.data.members;
    },
    enabled: pushDebouncedQuery.length >= 2
  });

  const { data: userViews } = useQuery({
    queryKey: ['userPageViews', searchedUserId],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: UserPageViews }>(`/api/pageviews/users/${searchedUserId}`);
      return response.data.data;
    },
    enabled: !!searchedUserId
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (pushMode === 'all') {
        const res = await api.post<{ success: boolean; sent: number; failed: number }>('/api/push/send', { title: pushTitle, body: pushBody });
        return res.data;
      } else {
        await api.post('/api/push/send-to-user', { userId: pushSelectedUser!.id, title: pushTitle, body: pushBody });
        return null;
      }
    },
    onSuccess: (data) => {
      if (pushMode === 'all' && data) {
        setPushResult(`Enviada a ${data.sent} dispositivo(s). Fallidos: ${data.failed}.`);
        success(`Notificación enviada a ${data.sent} dispositivo(s)`);
      } else {
        setPushResult(`Enviada al usuario seleccionado.`);
        success('Notificación enviada');
      }
      setPushTitle('');
      setPushBody('');
      setPushSelectedUser(null);
      setPushUserQuery('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Error al enviar la notificación';
      setPushResult(null);
      error(msg);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.post('/api/pageviews/archive'),
    onSuccess: (res: any) => {
      success(res.data.message || 'Datos archivados y contadores reseteados');
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: () => error('Error al archivar los datos')
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateString));
  };

  const daysSince = (dateString: string | null) => {
    if (!dateString) return null;
    const diff = Date.now() - new Date(dateString).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const statusColors: Record<string, string> = {
    pendingVerification: 'bg-yellow-100 text-yellow-800',
    pendingApproval: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]',
  };

  const statusLabels: Record<string, string> = {
    pendingVerification: 'Pendiente verificación',
    pendingApproval: 'Pendiente aprobación',
    approved: 'Aprobados',
    rejected: 'Rechazados',
    suspended: 'Suspendidos',
  };

  if (statsLoading || analyticsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-[var(--color-textSecondary)]">Cargando estadísticas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Dashboard de Administración</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Visión general del sistema</p>
          </div>
        </div>

        {/* ── ANALYTICS DE NAVEGACIÓN ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Analytics de navegación</h2>
            <div className="flex items-center gap-3">
              {analytics?.collectionStartedAt && (
                <span className="text-sm text-[var(--color-textSecondary)]">
                  Datos desde {formatDate(analytics.collectionStartedAt)}
                </span>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('¿Archivar todos los datos actuales y resetear los contadores?')) {
                    archiveMutation.mutate();
                  }
                }}
                disabled={archiveMutation.isPending || !analytics?.totalViews}
              >
                Archivar y resetear
              </Button>
            </div>
          </div>

          {/* KPIs analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-[var(--color-textSecondary)]">Total visitas registradas</p>
                <p className="text-3xl font-bold text-[var(--color-text)] mt-2">{analytics?.totalViews ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-[var(--color-textSecondary)]">Usuarios activos (30 días)</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{analytics?.activeUsersLast30Days ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-[var(--color-textSecondary)]">Usuarios inactivos (30 días)</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{analytics?.inactiveUsers.length ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top páginas */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Páginas más visitadas</h3>
              </CardHeader>
              <CardContent>
                {!analytics?.topPages.length ? (
                  <p className="text-[var(--color-textSecondary)] text-sm">Sin datos todavía</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topPages.map((page, i) => (
                      <div key={page.path} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[var(--color-textSecondary)] w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[var(--color-text)] truncate">{page.path}</span>
                            <span className="text-sm text-[var(--color-textSecondary)] ml-2 shrink-0">{page.count}</span>
                          </div>
                          <div className="w-full bg-[var(--color-cardBorder)] rounded-full h-1.5">
                            <div
                              className="bg-[var(--color-primary)] h-1.5 rounded-full"
                              style={{ width: `${Math.round((page.count / analytics.topPages[0].count) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usuarios inactivos */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Sin actividad en 30+ días</h3>
              </CardHeader>
              <CardContent>
                {!analytics?.inactiveUsers.length ? (
                  <p className="text-[var(--color-textSecondary)] text-sm">Todos los socios han navegado recientemente</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {analytics.inactiveUsers.map(u => {
                      const days = daysSince(u.lastLoginAt);
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded border border-[var(--color-cardBorder)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center shrink-0 overflow-hidden">
                              {u.avatar
                                ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                : <span className="text-xs font-bold text-[var(--color-primary)]">{u.name.charAt(0)}</span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--color-text)] truncate">{u.nick ?? u.name}</p>
                              <p className="text-xs text-[var(--color-textSecondary)] truncate">{u.membershipType ?? '-'}</p>
                            </div>
                          </div>
                          <span className="text-xs text-amber-600 shrink-0 ml-2">
                            {days === null ? 'Sin login' : `${days}d sin actividad`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Búsqueda por usuario */}
          <Card style={{ overflow: 'visible' }}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Historial de un usuario</h3>
            </CardHeader>
            <CardContent>
              <div ref={searchRef} className="relative mb-4">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={userSearchQuery}
                  onChange={e => {
                    setUserSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value) setSearchedUserId(null);
                  }}
                  onFocus={() => userSearchQuery.length >= 2 && setShowSuggestions(true)}
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg text-sm bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                />
                {showSuggestions && debouncedQuery.length >= 2 && memberSuggestions && memberSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {memberSuggestions.map(m => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--color-tableRowHover)]"
                        onMouseDown={() => {
                          setSearchedUserId(m.id);
                          setUserSearchQuery(m.profile?.nick ?? m.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center shrink-0 overflow-hidden">
                          {m.profile?.avatar
                            ? <img src={m.profile.avatar} alt={m.name} className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold text-[var(--color-primary)]">{m.name.charAt(0)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">{m.profile?.nick ?? m.name}</p>
                          <p className="text-xs text-[var(--color-textSecondary)] truncate">{m.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {showSuggestions && debouncedQuery.length >= 2 && memberSuggestions?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-lg shadow-lg px-3 py-2 text-sm text-[var(--color-textSecondary)]">
                    Sin resultados
                  </div>
                )}
              </div>
              {userViews && (
                <div>
                  {userViews.user && (
                    <p className="text-sm font-medium text-[var(--color-text)] mb-3">
                      {userViews.user.profile?.nick ?? userViews.user.name} — {userViews.user.email}
                    </p>
                  )}
                  {!userViews.pages.length ? (
                    <p className="text-sm text-[var(--color-textSecondary)]">Sin visitas registradas</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {userViews.pages.map(p => (
                        <div key={p.path} className="flex items-center justify-between text-sm py-1 border-b border-[var(--color-cardBorder)]">
                          <span className="text-[var(--color-text)]">{p.path}</span>
                          <div className="flex items-center gap-3 text-[var(--color-textSecondary)]">
                            <span>{p.visits} visitas</span>
                            <span>{formatDate(p.lastVisit)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de archives */}
          {!!analytics?.archives.length && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Periodos archivados</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.archives.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded border border-[var(--color-cardBorder)]">
                      <span className="text-[var(--color-text)]">{formatDate(a.fromDate)} → {formatDate(a.toDate)}</span>
                      <span className="text-[var(--color-textSecondary)]">{a.totalViews} visitas archivadas</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── STATS DE USUARIOS (existentes) ── */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Estadísticas de usuarios</h2>

          {stats && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textSecondary)]">Total Usuarios</p>
                        <p className="text-3xl font-bold text-[var(--color-text)] mt-2">{stats.userStats.total}</p>
                      </div>
                      <div className="p-3 bg-[var(--color-primary-100)] rounded-lg">
                        <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textSecondary)]">Nuevos (7 días)</p>
                        <p className="text-3xl font-bold text-[var(--color-text)] mt-2">{stats.userStats.newUsers.last7Days}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textSecondary)]">Pendiente Aprobación</p>
                        <p className="text-3xl font-bold text-[var(--color-text)] mt-2">{stats.userStats.byStatus.pendingApproval}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textSecondary)]">Logins (24h)</p>
                        <p className="text-3xl font-bold text-[var(--color-text)] mt-2">{stats.loginStats.last24Hours.successful}</p>
                        <p className="text-xs text-[var(--color-textSecondary)] mt-1">{stats.loginStats.last24Hours.failed} fallidos</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Usuarios por Estado</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.userStats.byStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-cardBorder)]">
                          <span className="text-sm font-medium text-[var(--color-textSecondary)]">
                            {statusLabels[status] || status}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-[var(--color-text)]">{count}</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                              {Math.round((count / stats.userStats.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Usuarios Recientes</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-cardBorder)]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center overflow-hidden">
                              {user.profile?.avatar ? (
                                <img src={user.profile.avatar} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[var(--color-primary)] font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-text)]">{user.name}</p>
                              <p className="text-sm text-[var(--color-textSecondary)]">{user.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status] || 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]'}`}>
                              {user.status}
                            </span>
                            <p className="text-xs text-[var(--color-textSecondary)] mt-1">{formatDate(user.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">Crecimiento de Usuarios</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)] rounded-lg">
                      <p className="text-sm font-medium text-[var(--color-primaryDark)] mb-2">Últimos 7 días</p>
                      <p className="text-4xl font-bold text-[var(--color-primary-900)]">{stats.userStats.newUsers.last7Days}</p>
                      <p className="text-xs text-[var(--color-primary)] mt-2">nuevos registros</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-2">Últimos 30 días</p>
                      <p className="text-4xl font-bold text-blue-900">{stats.userStats.newUsers.last30Days}</p>
                      <p className="text-xs text-blue-600 mt-2">nuevos registros</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <p className="text-sm font-medium text-green-700 mb-2">Usuarios Activos</p>
                      <p className="text-4xl font-bold text-green-900">{stats.userStats.byStatus.approved}</p>
                      <p className="text-xs text-green-600 mt-2">aprobados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── ENVIAR NOTIFICACIÓN PUSH ── */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Enviar notificación push</h2>
          <Card>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                {/* Selector destinatario */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pushMode"
                      value="all"
                      checked={pushMode === 'all'}
                      onChange={() => { setPushMode('all'); setPushSelectedUser(null); setPushUserQuery(''); setPushResult(null); }}
                      className="accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">Todos los usuarios</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pushMode"
                      value="user"
                      checked={pushMode === 'user'}
                      onChange={() => { setPushMode('user'); setPushResult(null); }}
                      className="accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">Usuario concreto</span>
                  </label>
                </div>

                {/* Autocompletado de usuario */}
                {pushMode === 'user' && (
                  <div className="relative" ref={pushSearchRef}>
                    <input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={pushSelectedUser ? pushSelectedUser.name : pushUserQuery}
                      onChange={(e) => { setPushUserQuery(e.target.value); setPushSelectedUser(null); setShowPushSuggestions(true); setPushResult(null); }}
                      onFocus={() => setShowPushSuggestions(true)}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-inputBg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    {showPushSuggestions && pushUserSuggestions && pushUserSuggestions.length > 0 && !pushSelectedUser && (
                      <div className="absolute z-10 w-full mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {pushUserSuggestions.map(member => (
                          <button
                            key={member.id}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--color-tableRowHover)] text-sm"
                            onClick={() => { setPushSelectedUser({ id: member.id, name: member.name }); setPushUserQuery(''); setShowPushSuggestions(false); }}
                          >
                            <span className="font-medium text-[var(--color-text)]">{member.name}</span>
                            {member.profile?.nick && <span className="text-[var(--color-textSecondary)] ml-1">({member.profile.nick})</span>}
                            <span className="text-[var(--color-textSecondary)] ml-2 text-xs">{member.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {pushSelectedUser && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-[var(--color-primary)] font-medium">{pushSelectedUser.name}</span>
                        <button onClick={() => { setPushSelectedUser(null); setPushUserQuery(''); }} className="text-xs text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">cambiar</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Título */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-[var(--color-text)]">Título</label>
                    <span className="text-xs text-[var(--color-textSecondary)]">{pushTitle.length}/50</span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Título de la notificación"
                    value={pushTitle}
                    onChange={(e) => { setPushTitle(e.target.value); setPushResult(null); }}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-inputBg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-[var(--color-text)]">Mensaje</label>
                    <span className="text-xs text-[var(--color-textSecondary)]">{pushBody.length}/100</span>
                  </div>
                  <textarea
                    maxLength={100}
                    rows={3}
                    placeholder="Texto de la notificación"
                    value={pushBody}
                    onChange={(e) => { setPushBody(e.target.value); setPushResult(null); }}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-inputBg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                  />
                </div>

                {/* Botón y resultado */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => pushMutation.mutate()}
                    disabled={
                      !pushTitle.trim() ||
                      !pushBody.trim() ||
                      pushMutation.isPending ||
                      (pushMode === 'user' && !pushSelectedUser)
                    }
                  >
                    {pushMutation.isPending ? 'Enviando...' : 'Enviar notificación'}
                  </Button>
                  {pushResult && (
                    <span className="text-sm text-green-600">{pushResult}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
