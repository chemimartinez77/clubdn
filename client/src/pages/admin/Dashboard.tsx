// client/src/pages/admin/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { api } from '../../api/axios';

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
    profile?: {
      avatar?: string | null;
    } | null;
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: AdminStats }>('/api/stats/admin');
      return response.data.data;
    }
  });

  if (isLoading) {
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

  if (error || !stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Error al cargar las estadísticas</p>
        </div>
      </Layout>
    );
  }

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
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

          {/* New Users (7 days) */}
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

          {/* Pending Approval */}
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

          {/* Login Success Rate */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-textSecondary)]">Logins (24h)</p>
                  <p className="text-3xl font-bold text-[var(--color-text)] mt-2">{stats.loginStats.last24Hours.successful}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    {stats.loginStats.last24Hours.failed} fallidos
                  </p>
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
          {/* User Status Breakdown */}
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

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Usuarios Recientes</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-cardBorder)] hover:border-[var(--color-cardBorder)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center overflow-hidden">
                        {user.profile?.avatar ? (
                          <img
                            src={user.profile.avatar}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[var(--color-primary)] font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
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

        {/* Growth Stats */}
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
      </div>
    </Layout>
  );
}


