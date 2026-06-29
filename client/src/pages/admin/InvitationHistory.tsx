// client/src/pages/admin/InvitationHistory.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { api } from '../../api/axios';
import type { ApiResponse } from '../../types/auth';

type InvitationStatus = 'RESERVED' | 'PENDING' | 'PENDING_APPROVAL' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'NOT_ATTENDED';
type StatusFilter = 'ALL' | 'USED' | 'NOT_ATTENDED';

interface InvitationRecord {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestDni: string | null;
  guestPhone: string | null;
  status: InvitationStatus;
  validDate: string;
  createdAt: string;
  usedAt: string | null;
  member: {
    id: string;
    name: string;
    profile: { nick: string | null; avatar: string | null } | null;
    membership: { type: string } | null;
  };
  event: { id: string; title: string; date: string } | null;
  validatedBy: { id: string; name: string } | null;
}

interface HistoryResponse {
  data: InvitationRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_LABELS: Record<InvitationStatus, string> = {
  RESERVED: 'Reservada',
  PENDING: 'Pendiente',
  PENDING_APPROVAL: 'Pend. aprobación',
  USED: 'Usada',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
  NOT_ATTENDED: 'No asistió',
};

const STATUS_STYLES: Record<InvitationStatus, string> = {
  RESERVED: 'bg-purple-100 text-purple-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-800',
  USED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
  NOT_ATTENDED: 'bg-orange-100 text-orange-800',
};

const ALL_STATUSES: InvitationStatus[] = [
  'RESERVED', 'PENDING', 'PENDING_APPROVAL', 'USED', 'EXPIRED', 'CANCELLED', 'NOT_ATTENDED',
];

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[var(--color-modalBackground)] rounded-xl shadow-xl max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
          aria-label="Cerrar"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default function InvitationHistory() {
  const queryClient = useQueryClient();

  const [guestName, setGuestName] = useState('');
  const [guestDni, setGuestDni] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [memberName, setMemberName] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [debouncedGuestName, setDebouncedGuestName] = useState('');
  const [debouncedGuestDni, setDebouncedGuestDni] = useState('');
  const [debouncedGuestPhone, setDebouncedGuestPhone] = useState('');
  const [debouncedMemberName, setDebouncedMemberName] = useState('');

  const [pickerInv, setPickerInv] = useState<InvitationRecord | null>(null);
  const [pendingChange, setPendingChange] = useState<{ inv: InvitationRecord; newStatus: InvitationStatus } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const debounce = (setter: (v: string) => void, value: string) => {
    clearTimeout((window as any)._invDebounceTimer);
    (window as any)._invDebounceTimer = setTimeout(() => setter(value), 400);
  };

  const handleFilter = (
    field: 'guestName' | 'guestDni' | 'guestPhone' | 'memberName',
    value: string,
  ) => {
    setPage(1);
    if (field === 'guestName') { setGuestName(value); debounce(setDebouncedGuestName, value); }
    if (field === 'guestDni') { setGuestDni(value); debounce(setDebouncedGuestDni, value); }
    if (field === 'guestPhone') { setGuestPhone(value); debounce(setDebouncedGuestPhone, value); }
    if (field === 'memberName') { setMemberName(value); debounce(setDebouncedMemberName, value); }
  };

  const hasFilters = !!(debouncedGuestName || debouncedGuestDni || debouncedGuestPhone || debouncedMemberName || statusFilter !== 'ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['invitationHistory', page, debouncedGuestName, debouncedGuestDni, debouncedGuestPhone, debouncedMemberName, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (debouncedGuestName) params.set('guestName', debouncedGuestName);
      if (debouncedGuestDni) params.set('guestDni', debouncedGuestDni);
      if (debouncedGuestPhone) params.set('guestPhone', debouncedGuestPhone);
      if (debouncedMemberName) params.set('memberName', debouncedMemberName);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const response = await api.get<ApiResponse<HistoryResponse>>(`/api/invitations/admin/history?${params}`);
      const payload = response.data.data as any;
      if (payload?.data && payload?.pagination) return payload as HistoryResponse;
      return {
        data: Array.isArray(payload) ? payload : [],
        pagination: (response.data as any).pagination ?? null,
      } as HistoryResponse;
    },
  });

  const { mutate: changeStatus, isPending: isChanging } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvitationStatus }) => {
      await api.patch(`/api/invitations/admin/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitationHistory'] });
      setPendingChange(null);
      setMutationError(null);
    },
    onError: (err: any) => {
      setMutationError(err?.response?.data?.message ?? 'Error al actualizar el estado');
    },
  });

  const invitations = data?.data ?? [];
  const pagination = data?.pagination;

  const clearFilters = () => {
    setGuestName(''); setGuestDni(''); setGuestPhone(''); setMemberName('');
    setDebouncedGuestName(''); setDebouncedGuestDni(''); setDebouncedGuestPhone(''); setDebouncedMemberName('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const handleStatusClick = (inv: InvitationRecord) => {
    setPickerInv(inv);
  };

  const handlePickStatus = (newStatus: InvitationStatus) => {
    if (!pickerInv) return;
    if (newStatus === pickerInv.status) {
      setPickerInv(null);
      return;
    }
    setPendingChange({ inv: pickerInv, newStatus });
    setPickerInv(null);
  };

  const handleConfirm = () => {
    if (!pendingChange) return;
    changeStatus({ id: pendingChange.inv.id, status: pendingChange.newStatus });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Historial de Invitaciones</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">Registro completo de todas las invitaciones de socios</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <CardTitle>
                {pagination ? `${pagination.total} invitaciones` : 'Invitaciones'}
              </CardTitle>
              <div className="flex gap-3 flex-wrap items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm bg-[var(--color-card)] text-[var(--color-text)]"
                >
                  <option value="ALL">Todos</option>
                  <option value="USED">Asistió</option>
                  <option value="NOT_ATTENDED">No asistió</option>
                </select>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => handleFilter('guestName', e.target.value)}
                  placeholder="Nombre del invitado"
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent w-44 text-sm"
                />
                <input
                  type="text"
                  value={guestDni}
                  onChange={(e) => handleFilter('guestDni', e.target.value)}
                  placeholder="DNI del invitado"
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent w-36 text-sm"
                />
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => handleFilter('guestPhone', e.target.value)}
                  placeholder="Teléfono del invitado"
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent w-44 text-sm"
                />
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => handleFilter('memberName', e.target.value)}
                  placeholder="Nombre o nick del socio"
                  className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent w-44 text-sm"
                />
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-center py-12 text-[var(--color-textSecondary)]">No hay invitaciones registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-cardBorder)] text-[var(--color-textSecondary)]">
                      <th className="text-left py-3 px-3 font-semibold">Invitado</th>
                      <th className="text-left py-3 px-3 font-semibold">DNI</th>
                      <th className="text-left py-3 px-3 font-semibold">Teléfono</th>
                      <th className="text-left py-3 px-3 font-semibold">Socio</th>
                      <th className="text-left py-3 px-3 font-semibold">Evento</th>
                      <th className="text-left py-3 px-3 font-semibold">Válida para</th>
                      <th className="text-left py-3 px-3 font-semibold">Estado</th>
                      <th className="text-left py-3 px-3 font-semibold">Validado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv, idx) => (
                      <tr
                        key={inv.id}
                        className={`border-b border-[var(--color-cardBorder)] ${idx % 2 === 0 ? 'bg-[var(--color-tableRowHover)]' : ''}`}
                      >
                        <td className="py-3 px-3 font-medium text-[var(--color-text)]">
                          {inv.guestFirstName} {inv.guestLastName}
                        </td>
                        <td className="py-3 px-3 text-[var(--color-textSecondary)]">
                          {inv.guestDni || '-'}
                        </td>
                        <td className="py-3 px-3 text-[var(--color-textSecondary)]">
                          {inv.guestPhone || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[var(--color-text)]">{inv.member.name}</span>
                          {inv.member.profile?.nick && (
                            <span className="block text-xs text-[var(--color-textSecondary)]">@{inv.member.profile.nick}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[var(--color-textSecondary)]">
                          {inv.event?.title ?? '-'}
                        </td>
                        <td className="py-3 px-3 text-[var(--color-textSecondary)]">
                          {new Date(inv.validDate).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleStatusClick(inv)}
                            className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {STATUS_LABELS[inv.status] ?? inv.status}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-[var(--color-textSecondary)]">
                          {inv.validatedBy?.name ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-cardBorder)]">
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Página {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-[var(--color-inputBorder)] rounded text-sm disabled:opacity-40 hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border border-[var(--color-inputBorder)] rounded text-sm disabled:opacity-40 hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {pickerInv && (
        <Modal onClose={() => setPickerInv(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 pr-8">Cambiar estado</h2>
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">
              {pickerInv.guestFirstName} {pickerInv.guestLastName}
            </p>
            <div className="flex flex-col gap-2">
              {ALL_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => handlePickStatus(status)}
                  className={`flex items-center justify-between px-4 py-2 rounded-lg border transition-colors text-left
                    ${status === pickerInv.status
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-cardBorder)] hover:bg-[var(--color-tableRowHover)]'
                    }`}
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  {status === pickerInv.status && (
                    <span className="text-xs text-[var(--color-textSecondary)]">actual</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {pendingChange && (
        <Modal onClose={() => { setPendingChange(null); setMutationError(null); }}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 pr-8">Confirmar cambio de estado</h2>
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">
              {pendingChange.inv.guestFirstName} {pendingChange.inv.guestLastName}
            </p>
            <p className="text-sm text-[var(--color-text)] mb-6">
              {'¿Cambiar estado de '}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[pendingChange.inv.status]}`}>
                {STATUS_LABELS[pendingChange.inv.status]}
              </span>
              {' a '}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[pendingChange.newStatus]}`}>
                {STATUS_LABELS[pendingChange.newStatus]}
              </span>
              {'?'}
            </p>
            {mutationError && (
              <p className="text-sm text-red-600 mb-4">{mutationError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setPendingChange(null); setMutationError(null); }}
                className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg text-sm hover:bg-[var(--color-tableRowHover)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isChanging}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isChanging ? 'Guardando...' : 'Aceptar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
