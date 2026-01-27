// client/src/pages/admin/MembershipManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { api } from '../../api/axios';
import type { UserWithMembership, TogglePaymentData, MarkFullYearData, MembershipType, PaymentStatus } from '../../types/membership';
import type { ApiResponse } from '../../types/auth';

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export default function MembershipManagement() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<'all' | MembershipType>('all');
  const [statusFilters, setStatusFilters] = useState({
    nuevo: true,
    pendiente: true,
    impagado: true,
    pagado: true,
    anoCompleto: true
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['users-membership', selectedYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ year: number; users: UserWithMembership[] }>>(`/api/membership/users?year=${selectedYear}`);
      return res.data.data;
    }
  });

  const togglePaymentMutation = useMutation({
    mutationFn: async (data: TogglePaymentData) => {
      const response = await api.post('/api/membership/payment/toggle', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-membership'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Error al marcar/desmarcar pago');
    }
  });

  const markFullYearMutation = useMutation({
    mutationFn: async (data: MarkFullYearData) => {
      const response = await api.post('/api/membership/payment/year', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-membership'] });
      success(data.message || 'A\u00f1o completo marcado');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Error al marcar año completo');
    }
  });

  const handleTogglePayment = (userId: string, month: number) => {
    togglePaymentMutation.mutate({
      userId,
      month,
      year: selectedYear
    });
  };

  const handleMarkFullYear = (userId: string) => {
    if (confirm('\u00bfMarcar todos los meses del ciclo en curso como pagados?')) {
      markFullYearMutation.mutate({
        userId,
        year: selectedYear
      });
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      NUEVO: 'bg-blue-100 text-blue-800',
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      IMPAGADO: 'bg-red-100 text-red-800',
      PAGADO: 'bg-green-100 text-green-800',
      ANO_COMPLETO: 'bg-[var(--color-primary-100)] text-[var(--color-primary-800)]'
    };
    const labels = {
      NUEVO: 'Nuevo',
      PENDIENTE: 'Pendiente',
      IMPAGADO: 'Impagado',
      PAGADO: 'Pagado',
      ANO_COMPLETO: 'Año completo'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[status] || 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getMembershipBadge = (type: MembershipType) => {
    const styles = {
      SOCIO: 'bg-[var(--color-primary-100)] text-[var(--color-primary-800)]',
      COLABORADOR: 'bg-blue-100 text-blue-800',
      FAMILIAR: 'bg-purple-100 text-purple-800',
      EN_PRUEBAS: 'bg-yellow-100 text-yellow-800',
      BAJA: 'bg-[var(--color-cardBorder)] text-[var(--color-textSecondary)]'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const toggleStatusFilter = (status: keyof typeof statusFilters) => {
    setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  // Filtrar usuarios
  const filteredUsers = (response?.users || []).filter(user => {
    // Filtro de búsqueda
    if (searchTerm && !user.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtro de tipo de membresía
    if (membershipFilter !== 'all' && user.membership?.type !== membershipFilter) {
      return false;
    }

    // Filtro de estado
    const statusMap = {
      NUEVO: statusFilters.nuevo,
      PENDIENTE: statusFilters.pendiente,
      IMPAGADO: statusFilters.impagado,
      PAGADO: statusFilters.pagado,
      ANO_COMPLETO: statusFilters.anoCompleto
    };

    return statusMap[user.status] !== false;
  });

  return (
    <Layout>
      <div className="max-w-full mx-auto space-y-6 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Pagos</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Control de pagos mensuales de membresías</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              {/* Selector de año */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-[var(--color-textSecondary)]">Año:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)]"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Búsqueda y filtros */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <select
                  value={membershipFilter}
                  onChange={(e) => setMembershipFilter(e.target.value as 'all' | MembershipType)}
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)]"
                >
                  <option value="all">Cualquier tipo de miembro</option>
                  <option value="COLABORADOR">COLABORADOR</option>
                  <option value="SOCIO">SOCIO</option>
                  <option value="FAMILIAR">FAMILIAR</option>
                  <option value="EN_PRUEBAS">EN PRUEBAS</option>
                  <option value="BAJA">BAJA</option>
                </select>

                {/* Checkboxes de estado */}
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters.nuevo}
                      onChange={() => toggleStatusFilter('nuevo')}
                      className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">Nuevo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters.pendiente}
                      onChange={() => toggleStatusFilter('pendiente')}
                      className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">Pendiente</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters.impagado}
                      onChange={() => toggleStatusFilter('impagado')}
                      className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">Impagado</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters.pagado}
                      onChange={() => toggleStatusFilter('pagado')}
                      className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">Pagado</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters.anoCompleto}
                      onChange={() => toggleStatusFilter('anoCompleto')}
                      className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">Año completo</span>
                  </label>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center text-[var(--color-textSecondary)]">
                Cargando usuarios...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[var(--color-tableRowHover)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Acciones
                      </th>
                      {MONTHS.map((month) => (
                        <th key={month} className="px-2 py-3 text-center text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                          {month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--color-cardBackground)] divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-[var(--color-tableRowHover)]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-[var(--color-text)]">{user.name}</div>
                            <div className="text-xs text-[var(--color-textSecondary)]">
                              {user.membership ? getMembershipBadge(user.membership.type) : '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkFullYear(user.id)}
                            disabled={markFullYearMutation.isPending || user.paidMonths === 12}
                            className="text-xs"
                          >
                            Año completo
                          </Button>
                        </td>
                        {MONTHS.map((_, monthIndex) => {
                          const month = monthIndex + 1;
                          const isPaid = user.paymentsByMonth[month];

                          return (
                            <td key={month} className="px-2 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isPaid}
                                onChange={() => handleTogglePayment(user.id, month)}
                                disabled={togglePaymentMutation.isPending}
                                className="w-5 h-5 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)] cursor-pointer disabled:opacity-50"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-[var(--color-textSecondary)]">
                    No se encontraron usuarios con los filtros seleccionados
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

