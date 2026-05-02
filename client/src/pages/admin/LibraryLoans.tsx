import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardContent } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../api/axios';
import type {
  AdminInventoryItem,
  DonationRequestAdminItem,
  GameCondition,
  ItemSearchResult,
  LibraryItemLoanStatus,
  LibraryLoan,
  LibraryLoanPolicy,
  MemberSearchResult,
} from '../../types/libraryLoans';

type LibraryGameType = 'WARGAME' | 'MESA' | 'CARTAS' | 'MINI' | 'ROL';

const conditionLabels: Record<GameCondition, string> = { NUEVO: 'Nuevo', BUENO: 'Bueno', REGULAR: 'Regular', MALO: 'Malo' };
const conditionOptions: GameCondition[] = ['NUEVO', 'BUENO', 'REGULAR', 'MALO'];
const gameTypeOptions: LibraryGameType[] = ['WARGAME', 'MESA', 'CARTAS', 'MINI', 'ROL'];
const gameTypeLabels: Record<LibraryGameType, string> = {
  WARGAME: 'Wargame',
  MESA: 'Juego de mesa',
  CARTAS: 'Juego de cartas',
  MINI: 'Miniaturas',
  ROL: 'Rol',
};
const loanPolicyLabels: Record<LibraryLoanPolicy, string> = {
  LOANABLE: 'Prestable',
  CONSULT: 'Consultar',
  NOT_LOANABLE: 'No prestable'
};
const loanStatusLabels: Record<LibraryItemLoanStatus, string> = {
  AVAILABLE: 'Disponible',
  REQUESTED: 'Solicitado',
  ON_LOAN: 'Prestado',
  BLOCKED: 'Bloqueado',
  MAINTENANCE: 'Mantenimiento'
};
const loanStatusColors: Record<LibraryItemLoanStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  ON_LOAN: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-slate-100 text-slate-700',
  MAINTENANCE: 'bg-orange-100 text-orange-800'
};

function isOverdue(loan: LibraryLoan): boolean {
  return loan.status === 'ACTIVE' && !!loan.dueAt && new Date(loan.dueAt) < new Date();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-ES');
}

function getOwnerLabel(ownerEmail: string | null, ownerDisplayName?: string | null): string {
  if (ownerDisplayName?.trim()) return ownerDisplayName;
  if (!ownerEmail || ownerEmail === 'clubdreadnought.vlc@gmail.com') {
    return 'Club Dreadnought';
  }
  return ownerEmail;
}

function getDonationStatusLabel(status: DonationRequestAdminItem['status']): string {
  if (status === 'PENDING') return 'Pendiente';
  if (status === 'APPROVED') return 'Aprobada';
  return 'Rechazada';
}

function getDonationStatusClasses(status: DonationRequestAdminItem['status']): string {
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
  if (status === 'APPROVED') return 'bg-green-100 text-green-800';
  return 'bg-red-100 text-red-800';
}

function ModalShell({
  children,
  maxWidth = 'max-w-lg',
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className={`my-6 w-full ${maxWidth} max-h-[calc(100vh-3rem)] overflow-y-auto rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-xl`}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface PolicyModalProps {
  item: ItemSearchResult | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (loanPolicy: LibraryLoanPolicy) => void;
}

function PolicyModal({ item, isSaving, onClose, onConfirm }: PolicyModalProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<LibraryLoanPolicy | null>(item?.loanPolicy ?? null);

  useEffect(() => {
    setSelectedPolicy(item?.loanPolicy ?? null);
  }, [item]);

  if (!item) return null;

  return (
    <ModalShell maxWidth="max-w-md">
      <div className="border-b border-[var(--color-cardBorder)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Cambiar política de préstamo</h3>
        <p className="mt-1 text-sm text-[var(--color-textSecondary)]">{item.name}</p>
      </div>
      <div className="space-y-3 p-5">
        {(['LOANABLE', 'CONSULT', 'NOT_LOANABLE'] as LibraryLoanPolicy[]).map((policy) => (
          <button
            key={policy}
            type="button"
            onClick={() => setSelectedPolicy(policy)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
              selectedPolicy === policy
                ? 'border-[var(--color-primary)] bg-[var(--color-tableRowHover)]'
                : 'border-[var(--color-cardBorder)] hover:bg-[var(--color-tableRowHover)]'
            }`}
          >
            <span className="font-medium text-[var(--color-text)]">{loanPolicyLabels[policy]}</span>
            {selectedPolicy === policy && (
              <span className="text-sm font-semibold text-[var(--color-primary)]">Seleccionada</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--color-cardBorder)] p-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--color-cardBorder)] px-4 py-2 text-[var(--color-textSecondary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => selectedPolicy && onConfirm(selectedPolicy)}
          disabled={!selectedPolicy || isSaving}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </ModalShell>
  );
}

function MemberAutocomplete({
  selectedMember,
  onSelect,
  label,
  placeholder,
}: {
  selectedMember: MemberSearchResult | null;
  onSelect: (member: MemberSearchResult | null) => void;
  label: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState(selectedMember?.displayName ?? '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedMember?.displayName ?? '');
  }, [selectedMember]);

  const { data = [], isFetching } = useQuery({
    queryKey: ['library-members-search', query],
    queryFn: async () => {
      const res = await api.get(`/api/ludoteca/admin/members/search?q=${encodeURIComponent(query)}`);
      return res.data.data as MemberSearchResult[];
    },
    enabled: isOpen && query.trim().length >= 2,
    staleTime: 30000,
  });

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">{label}</label>
      <input
        type="text"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (selectedMember && value !== selectedMember.displayName) {
            onSelect(null);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-lg">
          {query.trim().length < 2 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-textSecondary)]">Escribe al menos 2 caracteres.</p>
          ) : isFetching ? (
            <p className="px-3 py-2 text-xs text-[var(--color-textSecondary)]">Buscando...</p>
          ) : data.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-textSecondary)]">No se han encontrado miembros.</p>
          ) : (
            data.map((member) => (
              <button
                key={member.id}
                type="button"
                onMouseDown={() => {
                  onSelect(member);
                  setQuery(member.displayName);
                  setIsOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-[var(--color-tableRowHover)]"
              >
                <span className="block text-sm font-medium text-[var(--color-text)]">{member.displayName}</span>
                <span className="block text-xs text-[var(--color-textSecondary)]">{member.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SearchPanel() {
  const [internalIdQuery, setInternalIdQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [searchParams, setSearchParams] = useState<{ internalId: string; name: string }>({ internalId: '', name: '' });
  const [returnForm, setReturnForm] = useState<{ loanId: string; conditionIn: GameCondition; notesIn: string; nextLoanStatus: LibraryItemLoanStatus } | null>(null);
  const [policyItem, setPolicyItem] = useState<ItemSearchResult | null>(null);
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();

  const searchKey = useMemo(
    () => ['library-item-search', searchParams.internalId, searchParams.name],
    [searchParams.internalId, searchParams.name]
  );

  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: searchKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams.internalId) params.set('internalId', searchParams.internalId);
      if (searchParams.name) params.set('name', searchParams.name);
      const res = await api.get(`/api/library-loans/search-item?${params.toString()}`);
      return res.data.data as ItemSearchResult[];
    },
    enabled: !!searchParams.internalId || !!searchParams.name,
    retry: false,
  });

  const refreshSearch = () => {
    queryClient.invalidateQueries({ queryKey: searchKey });
    queryClient.invalidateQueries({ queryKey: ['library-loans-active'] });
    queryClient.invalidateQueries({ queryKey: ['library-admin-inventory'] });
  };

  const confirmMutation = useMutation({
    mutationFn: (loanId: string) => api.patch(`/api/library-loans/${loanId}/confirm-delivery`),
    onSuccess: () => { showSuccess('Entrega confirmada'); refreshSearch(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al confirmar la entrega');
    }
  });

  const policyMutation = useMutation({
    mutationFn: ({ itemId, loanPolicy }: { itemId: string; loanPolicy: LibraryLoanPolicy }) =>
      api.patch(`/api/library-loans/items/${itemId}/loan-policy`, { loanPolicy }),
    onSuccess: () => {
      showSuccess('Ítem actualizado');
      setPolicyItem(null);
      refreshSearch();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al actualizar');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (loanId: string) => api.post(`/api/library-loans/${loanId}/cancel`),
    onSuccess: () => { showSuccess('Solicitud cancelada'); refreshSearch(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al cancelar la solicitud');
    }
  });

  const returnMutation = useMutation({
    mutationFn: (form: { loanId: string; conditionIn: GameCondition; notesIn: string; nextLoanStatus: LibraryItemLoanStatus }) =>
      api.post(`/api/library-loans/${form.loanId}/return`, {
        conditionIn: form.conditionIn,
        notesIn: form.notesIn || undefined,
        nextLoanStatus: form.nextLoanStatus
      }),
    onSuccess: () => { showSuccess('Devolución registrada'); setReturnForm(null); refreshSearch(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al registrar la devolución');
    }
  });

  const handleSearch = () => {
    setReturnForm(null);
    setPolicyItem(null);
    setSearchParams({
      internalId: internalIdQuery.trim(),
      name: nameQuery.trim()
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          <input
            type="text"
            value={internalIdQuery}
            onChange={e => setInternalIdQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="ID interno"
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-4 py-2 text-[var(--color-inputText)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <input
            type="text"
            value={nameQuery}
            onChange={e => setNameQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Nombre del juego"
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-4 py-2 text-[var(--color-inputText)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <button
            onClick={handleSearch}
            disabled={!internalIdQuery.trim() && !nameQuery.trim()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-50"
          >
            Buscar
          </button>
        </div>

        {(isLoading || isFetching) && <p className="text-sm text-[var(--color-textSecondary)]">Buscando...</p>}

        {(searchParams.internalId || searchParams.name) && !isLoading && data.length === 0 && (
          <p className="text-sm text-red-500">No se han encontrado juegos con esos criterios.</p>
        )}

        {data.length > 0 && (
          <div className="space-y-4">
            {data.map((item) => {
              const activeLoan = item.loans[0];
              const isReturnFormOpen = returnForm?.loanId === activeLoan?.id;

              return (
                <Card key={item.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex items-start gap-3 md:min-w-0 md:flex-1">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.name} className="h-20 w-20 rounded-md object-contain" />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] text-xs text-[var(--color-textSecondary)]">
                            Sin imagen
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="text-lg font-semibold text-[var(--color-text)]">{item.name}</p>
                          <p className="text-sm text-[var(--color-textSecondary)]">ID: {item.internalId}</p>
                          <p className="text-sm text-[var(--color-textSecondary)]">Tipo: {item.gameType}</p>
                          <p className="text-sm text-[var(--color-textSecondary)]">Estado físico: {conditionLabels[item.condition]}</p>
                          <p className="text-sm text-[var(--color-textSecondary)]">Propietario: {getOwnerLabel(item.ownerEmail)}</p>
                          {item.notes && <p className="text-sm text-yellow-600">{item.notes}</p>}
                        </div>
                      </div>

                      <div className="flex min-w-[220px] flex-col gap-3 rounded-lg border border-[var(--color-cardBorder)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-[var(--color-textSecondary)]">Estado</span>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${loanStatusColors[item.loanStatus]}`}>
                            {loanStatusLabels[item.loanStatus]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-[var(--color-textSecondary)]">Política</span>
                          <span className="text-sm font-medium text-[var(--color-text)]">{loanPolicyLabels[item.loanPolicy]}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPolicyItem(item)}
                          className="rounded-lg border border-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>

                    {activeLoan && (
                      <div className="space-y-2 rounded-lg border border-[var(--color-cardBorder)] p-3">
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {activeLoan.status === 'REQUESTED' ? 'Solicitud pendiente de entrega' : 'Préstamo activo'}
                        </p>
                        <p className="text-sm text-[var(--color-textSecondary)]">Socio: <strong>{activeLoan.user.name}</strong></p>
                        {activeLoan.loanedAt && <p className="text-sm text-[var(--color-textSecondary)]">Prestado: {formatDate(activeLoan.loanedAt)}</p>}
                        {activeLoan.dueAt && (
                          <p className={`text-sm font-medium ${isOverdue(activeLoan) ? 'text-red-600' : 'text-[var(--color-textSecondary)]'}`}>
                            Vence: {formatDate(activeLoan.dueAt)} {isOverdue(activeLoan) && '· VENCIDO'}
                          </p>
                        )}
                        {activeLoan.renewalCount > 0 && <p className="text-xs text-[var(--color-textSecondary)]">Renovado {activeLoan.renewalCount} vez/veces</p>}

                        <div className="flex flex-wrap gap-2 pt-2">
                          {activeLoan.status === 'REQUESTED' && (
                            <>
                              <button
                                onClick={() => confirmMutation.mutate(activeLoan.id)}
                                disabled={confirmMutation.isPending}
                                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                              >
                                Confirmar entrega
                              </button>
                              <button
                                onClick={() => cancelMutation.mutate(activeLoan.id)}
                                disabled={cancelMutation.isPending}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancelar solicitud
                              </button>
                            </>
                          )}
                          {activeLoan.status === 'ACTIVE' && !isReturnFormOpen && (
                            <button
                              onClick={() => setReturnForm({ loanId: activeLoan.id, conditionIn: activeLoan.conditionOut ?? item.condition, notesIn: '', nextLoanStatus: 'AVAILABLE' })}
                              className="rounded-lg border border-[var(--color-primary)] px-3 py-1.5 text-sm text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
                            >
                              Registrar devolución
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {isReturnFormOpen && returnForm && (
                      <div className="space-y-3 rounded-lg border border-[var(--color-cardBorder)] p-4">
                        <p className="text-sm font-semibold text-[var(--color-text)]">Registrar devolución</p>
                        <div>
                          <label className="mb-1 block text-xs text-[var(--color-textSecondary)]">Condición al devolver</label>
                          <select
                            value={returnForm.conditionIn}
                            onChange={e => setReturnForm(f => f ? { ...f, conditionIn: e.target.value as GameCondition } : f)}
                            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-1.5 text-sm text-[var(--color-inputText)]"
                          >
                            {conditionOptions.map(c => <option key={c} value={c}>{conditionLabels[c]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-[var(--color-textSecondary)]">Estado del ítem tras devolución</label>
                          <select
                            value={returnForm.nextLoanStatus}
                            onChange={e => setReturnForm(f => f ? { ...f, nextLoanStatus: e.target.value as LibraryItemLoanStatus } : f)}
                            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-1.5 text-sm text-[var(--color-inputText)]"
                          >
                            <option value="AVAILABLE">Disponible</option>
                            <option value="MAINTENANCE">En mantenimiento</option>
                            <option value="BLOCKED">Bloqueado</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-[var(--color-textSecondary)]">Notas (opcional)</label>
                          <textarea
                            value={returnForm.notesIn}
                            onChange={e => setReturnForm(f => f ? { ...f, notesIn: e.target.value } : f)}
                            rows={2}
                            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-1.5 text-sm text-[var(--color-inputText)]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => returnMutation.mutate(returnForm)}
                            disabled={returnMutation.isPending}
                            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                          >
                            {returnMutation.isPending ? 'Guardando...' : 'Confirmar devolución'}
                          </button>
                          <button
                            onClick={() => setReturnForm(null)}
                            className="rounded-lg border border-[var(--color-cardBorder)] px-3 py-1.5 text-sm text-[var(--color-textSecondary)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {item.queue.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-[var(--color-textSecondary)]">Lista de espera ({item.queue.length})</p>
                        <ul className="space-y-1">
                          {item.queue.map((entry, index) => (
                            <li key={entry.id} className="flex gap-2 text-xs text-[var(--color-textSecondary)]">
                              <span className="font-mono">{index + 1}.</span>
                              <span>{entry.user.name}</span>
                              <span>· desde {formatDate(entry.createdAt)}</span>
                              {entry.status === 'NOTIFIED' && <span className="font-medium text-yellow-600">· Notificado</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PolicyModal
        item={policyItem}
        isSaving={policyMutation.isPending}
        onClose={() => setPolicyItem(null)}
        onConfirm={(loanPolicy) => {
          if (!policyItem) return;
          policyMutation.mutate({ itemId: policyItem.id, loanPolicy });
        }}
      />
    </>
  );
}

function ActiveLoansList() {
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['library-loans-active'],
    queryFn: async () => {
      const res = await api.get('/api/library-loans/active');
      return res.data.data as LibraryLoan[];
    },
    refetchInterval: 60000,
  });

  const confirmMutation = useMutation({
    mutationFn: (loanId: string) => api.patch(`/api/library-loans/${loanId}/confirm-delivery`),
    onSuccess: () => { showSuccess('Entrega confirmada'); queryClient.invalidateQueries({ queryKey: ['library-loans-active'] }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (loanId: string) => api.post(`/api/library-loans/${loanId}/cancel`),
    onSuccess: () => { showSuccess('Solicitud cancelada'); queryClient.invalidateQueries({ queryKey: ['library-loans-active'] }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al cancelar');
    }
  });

  if (isLoading) return <p className="text-sm text-[var(--color-textSecondary)]">Cargando...</p>;
  if (!data || data.length === 0) return <p className="text-sm text-[var(--color-textSecondary)]">No hay préstamos activos.</p>;

  const requested = data.filter(l => l.status === 'REQUESTED');
  const active = data.filter(l => l.status === 'ACTIVE');

  return (
    <div className="space-y-4">
      {requested.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-textSecondary)]">Pendientes de entrega ({requested.length})</h3>
          <div className="space-y-2">
            {requested.map(loan => (
              <div key={loan.id} className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">{loan.libraryItem.name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">Solicitado por <strong>{loan.user.name}</strong> · {formatDate(loan.createdAt)}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">ID: {loan.libraryItem.internalId}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmMutation.mutate(loan.id)}
                    disabled={confirmMutation.isPending}
                    className="whitespace-nowrap rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    Confirmar entrega
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate(loan.id)}
                    disabled={cancelMutation.isPending}
                    className="whitespace-nowrap rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancelar solicitud
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-textSecondary)]">Préstamos activos ({active.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-cardBorder)] text-left text-xs text-[var(--color-textSecondary)]">
                  <th className="pb-2 pr-4">Juego</th>
                  <th className="pb-2 pr-4">Socio</th>
                  <th className="pb-2 pr-4">Vence</th>
                  <th className="pb-2 pr-4">Reno.</th>
                </tr>
              </thead>
              <tbody>
                {active.map(loan => (
                  <tr key={loan.id} className={`border-b border-[var(--color-cardBorder)] ${isOverdue(loan) ? 'bg-red-50' : ''}`}>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-[var(--color-text)]">{loan.libraryItem.name}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{loan.libraryItem.internalId}</p>
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-textSecondary)]">{loan.user.name}</td>
                    <td className={`py-2 pr-4 font-medium ${isOverdue(loan) ? 'text-red-600' : 'text-[var(--color-text)]'}`}>
                      {formatDate(loan.dueAt)}{isOverdue(loan) && ' ⚠'}
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-textSecondary)]">{loan.renewalCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateInventoryModal({
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    bggId: string | null;
    name: string;
    ownerType: 'club' | 'member';
    ownerUserId: string | null;
    condition: GameCondition;
    gameType: LibraryGameType;
    notes: string | null;
    loanPolicy: LibraryLoanPolicy;
    acquisitionDate: string | null;
  }) => void;
}) {
  const [ownerType, setOwnerType] = useState<'club' | 'member'>('club');
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [form, setForm] = useState({
    bggId: '',
    name: '',
    condition: 'BUENO' as GameCondition,
    gameType: 'MESA' as LibraryGameType,
    notes: '',
    loanPolicy: 'LOANABLE' as LibraryLoanPolicy,
    acquisitionDate: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setOwnerType('club');
      setSelectedMember(null);
      setForm({
        bggId: '',
        name: '',
        condition: 'BUENO',
        gameType: 'MESA',
        notes: '',
        loanPolicy: 'LOANABLE',
        acquisitionDate: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalShell maxWidth="max-w-2xl">
      <div className="border-b border-[var(--color-cardBorder)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Alta manual de ítem</h3>
        <p className="mt-1 text-sm text-[var(--color-textSecondary)]">Registra un juego físico nuevo en el inventario compartido.</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">ID de BGG/RPGGeek</label>
          <input
            type="text"
            value={form.bggId}
            onChange={(event) => setForm((current) => ({ ...current, bggId: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Propietario</label>
          <select
            value={ownerType}
            onChange={(event) => {
              const nextValue = event.target.value as 'club' | 'member';
              setOwnerType(nextValue);
              if (nextValue === 'club') {
                setSelectedMember(null);
              }
            }}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            <option value="club">Club</option>
            <option value="member">Particular</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Tipo</label>
          <select
            value={form.gameType}
            onChange={(event) => setForm((current) => ({ ...current, gameType: event.target.value as LibraryGameType }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            {gameTypeOptions.map((option) => (
              <option key={option} value={option}>{gameTypeLabels[option]}</option>
            ))}
          </select>
        </div>

        {ownerType === 'member' && (
          <div className="md:col-span-2">
            <MemberAutocomplete
              selectedMember={selectedMember}
              onSelect={setSelectedMember}
              label="Miembro propietario"
              placeholder="Busca un miembro por nombre, nick o correo"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Estado</label>
          <select
            value={form.condition}
            onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value as GameCondition }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            {conditionOptions.map((option) => (
              <option key={option} value={option}>{conditionLabels[option]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Política de préstamo</label>
          <select
            value={form.loanPolicy}
            onChange={(event) => setForm((current) => ({ ...current, loanPolicy: event.target.value as LibraryLoanPolicy }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            {(['LOANABLE', 'CONSULT', 'NOT_LOANABLE'] as LibraryLoanPolicy[]).map((option) => (
              <option key={option} value={option}>{loanPolicyLabels[option]}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Fecha de adquisición</label>
          <input
            type="date"
            value={form.acquisitionDate}
            onChange={(event) => setForm((current) => ({ ...current, acquisitionDate: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Notas</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--color-cardBorder)] p-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--color-cardBorder)] px-4 py-2 text-[var(--color-textSecondary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSubmit({
            bggId: form.bggId.trim() || null,
            name: form.name.trim(),
            ownerType,
            ownerUserId: ownerType === 'member' ? selectedMember?.id ?? null : null,
            condition: form.condition,
            gameType: form.gameType,
            notes: form.notes.trim() || null,
            loanPolicy: form.loanPolicy,
            acquisitionDate: form.acquisitionDate || null,
          })}
          disabled={isSaving || !form.name.trim() || (ownerType === 'member' && !selectedMember)}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Crear ítem'}
        </button>
      </div>
    </ModalShell>
  );
}

function BajaConfirmModal({
  item,
  isSaving,
  onClose,
  onConfirm,
}: {
  item: AdminInventoryItem | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!item) return null;

  return (
    <ModalShell maxWidth="max-w-md">
      <div className="border-b border-[var(--color-cardBorder)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Confirmar baja</h3>
        <p className="mt-1 text-sm text-[var(--color-textSecondary)]">{item.name}</p>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-sm text-[var(--color-text)]">
          Este juego no se eliminará de la base de datos. Se marcará como dado de baja y dejará de aparecer en la ludoteca activa.
        </p>
        <p className="text-xs text-[var(--color-textSecondary)]">
          Podrás reactivarlo más adelante desde esta misma pantalla si vuelve al inventario compartido.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--color-cardBorder)] p-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--color-cardBorder)] px-4 py-2 text-[var(--color-textSecondary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSaving}
          className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? 'Aplicando...' : 'Dar de baja'}
        </button>
      </div>
    </ModalShell>
  );
}

function ApproveDonationModal({
  donation,
  isSaving,
  onClose,
  onSubmit,
}: {
  donation: DonationRequestAdminItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    bggId: string | null;
    name: string;
    gameType: LibraryGameType;
    condition: GameCondition;
    notes: string | null;
    loanPolicy: LibraryLoanPolicy;
    acquisitionDate: string | null;
  }) => void;
}) {
  const [form, setForm] = useState({
    bggId: '',
    name: '',
    gameType: 'MESA' as LibraryGameType,
    condition: 'BUENO' as GameCondition,
    notes: '',
    loanPolicy: 'LOANABLE' as LibraryLoanPolicy,
    acquisitionDate: '',
  });

  useEffect(() => {
    if (!donation) return;
    setForm({
      bggId: donation.bggId ?? '',
      name: donation.name,
      gameType: donation.gameType as LibraryGameType,
      condition: donation.condition,
      notes: donation.notes ?? '',
      loanPolicy: 'LOANABLE',
      acquisitionDate: donation.acquisitionDate ? donation.acquisitionDate.slice(0, 10) : '',
    });
  }, [donation]);

  if (!donation) return null;

  return (
    <ModalShell maxWidth="max-w-2xl">
      <div className="border-b border-[var(--color-cardBorder)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Aprobar donación</h3>
        <p className="mt-1 text-sm text-[var(--color-textSecondary)]">Se registrará como juego del club, mostrando a {donation.requesterDisplayName} como donante.</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">ID de BGG/RPGGeek</label>
          <input
            type="text"
            value={form.bggId}
            onChange={(event) => setForm((current) => ({ ...current, bggId: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Tipo</label>
          <select
            value={form.gameType}
            onChange={(event) => setForm((current) => ({ ...current, gameType: event.target.value as LibraryGameType }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            {gameTypeOptions.map((option) => (
              <option key={option} value={option}>{gameTypeLabels[option]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Estado</label>
          <select
            value={form.condition}
            onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value as GameCondition }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            {conditionOptions.map((option) => (
              <option key={option} value={option}>{conditionLabels[option]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Política de préstamo</label>
          <select
            value={form.loanPolicy}
            onChange={(event) => setForm((current) => ({ ...current, loanPolicy: event.target.value as LibraryLoanPolicy }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          >
            {(['LOANABLE', 'CONSULT', 'NOT_LOANABLE'] as LibraryLoanPolicy[]).map((option) => (
              <option key={option} value={option}>{loanPolicyLabels[option]}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Fecha de adquisición</label>
          <input
            type="date"
            value={form.acquisitionDate}
            onChange={(event) => setForm((current) => ({ ...current, acquisitionDate: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[var(--color-textSecondary)]">Notas</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--color-cardBorder)] p-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--color-cardBorder)] px-4 py-2 text-[var(--color-textSecondary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSubmit({
            bggId: form.bggId.trim() || null,
            name: form.name.trim(),
            gameType: form.gameType,
            condition: form.condition,
            notes: form.notes.trim() || null,
            loanPolicy: form.loanPolicy,
            acquisitionDate: form.acquisitionDate || null,
          })}
          disabled={isSaving || !form.name.trim()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? 'Registrando...' : 'Aprobar y registrar'}
        </button>
      </div>
    </ModalShell>
  );
}

function RejectDonationModal({
  donation,
  isSaving,
  onClose,
  onSubmit,
}: {
  donation: DonationRequestAdminItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [donation]);

  if (!donation) return null;

  return (
    <ModalShell maxWidth="max-w-md">
      <div className="border-b border-[var(--color-cardBorder)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Rechazar donación</h3>
        <p className="mt-1 text-sm text-[var(--color-textSecondary)]">{donation.name}</p>
      </div>
      <div className="space-y-3 p-5">
        <label className="block text-xs font-medium text-[var(--color-textSecondary)]">Motivo (opcional)</label>
        <textarea
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-3 py-2 text-sm text-[var(--color-inputText)]"
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--color-cardBorder)] p-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--color-cardBorder)] px-4 py-2 text-[var(--color-textSecondary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSubmit(reason.trim() || null)}
          disabled={isSaving}
          className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? 'Rechazando...' : 'Rechazar'}
        </button>
      </div>
    </ModalShell>
  );
}

function InventoryPanel() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemToBaja, setItemToBaja] = useState<AdminInventoryItem | null>(null);
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['library-admin-inventory', page, search, includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        includeInactive: String(includeInactive),
      });
      if (search) params.set('search', search);
      const res = await api.get(`/api/ludoteca/admin/items?${params.toString()}`);
      return res.data.data as { items: AdminInventoryItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
    },
  });

  const refreshInventory = () => {
    queryClient.invalidateQueries({ queryKey: ['library-admin-inventory'] });
    queryClient.invalidateQueries({ queryKey: ['library-loans-active'] });
    queryClient.invalidateQueries({ queryKey: ['library-item-search'] });
    queryClient.invalidateQueries({ queryKey: ['ludoteca-items'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      bggId: string | null;
      name: string;
      ownerType: 'club' | 'member';
      ownerUserId: string | null;
      condition: GameCondition;
      gameType: LibraryGameType;
      notes: string | null;
      loanPolicy: LibraryLoanPolicy;
      acquisitionDate: string | null;
    }) => api.post('/api/ludoteca/admin/items', payload),
    onSuccess: () => {
      showSuccess('Ítem creado correctamente');
      setIsCreateOpen(false);
      refreshInventory();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al crear el ítem');
    }
  });

  const bajaMutation = useMutation({
    mutationFn: (itemId: string) => api.patch(`/api/ludoteca/admin/items/${itemId}/baja`),
    onSuccess: (response) => {
      showSuccess(response.data.message ?? 'Ítem dado de baja');
      setItemToBaja(null);
      refreshInventory();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al dar de baja el ítem');
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: (itemId: string) => api.patch(`/api/ludoteca/admin/items/${itemId}/reactivate`),
    onSuccess: () => {
      showSuccess('Ítem reactivado correctamente');
      refreshInventory();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al reactivar el ítem');
    }
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setPage(1);
                  setSearch(searchInput.trim());
                }
              }}
              placeholder="Busca por ID, juego, propietario o donante"
              className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] px-4 py-2 text-[var(--color-inputText)]"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setSearch(searchInput.trim());
              }}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white"
            >
              Buscar
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
          >
            Alta manual
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => {
              setIncludeInactive(event.target.checked);
              setPage(1);
            }}
          />
          Incluir ítems dados de baja
        </label>

        {isLoading ? (
          <p className="text-sm text-[var(--color-textSecondary)]">Cargando inventario...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)]">No hay ítems que coincidan con la búsqueda.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const canAskBaja = !item.bajaAt && !item.isClubOwned;
              const blockReason = item.hasActiveLoan
                ? 'Tiene un préstamo o solicitud activa'
                : item.queueCount > 0
                  ? 'Tiene usuarios en cola de espera'
                  : item.isClubOwned
                    ? 'Los ítems del club no se dan de baja con esta acción'
                    : null;

              return (
                <div key={item.id} className={`rounded-lg border p-4 ${item.bajaAt ? 'border-red-200 bg-red-50/60' : 'border-[var(--color-cardBorder)]'}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[var(--color-text)]">{item.name}</p>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${loanStatusColors[item.loanStatus]}`}>
                          {loanStatusLabels[item.loanStatus]}
                        </span>
                        {item.isDonated && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Donación</span>}
                        {item.bajaAt && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Baja</span>}
                      </div>
                      <p className="text-sm text-[var(--color-textSecondary)]">ID: {item.internalId} · {gameTypeLabels[item.gameType as LibraryGameType] ?? item.gameType}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">Propietario: {getOwnerLabel(item.ownerEmail, item.ownerDisplayName)}</p>
                      {item.donorDisplayName && <p className="text-sm text-[var(--color-textSecondary)]">Donado por: {item.donorDisplayName}</p>}
                      <p className="text-sm text-[var(--color-textSecondary)]">Estado físico: {conditionLabels[item.condition]}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">Política: {loanPolicyLabels[item.loanPolicy]}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">Adquisición: {formatDate(item.acquisitionDate)}</p>
                      {item.bajaAt && <p className="text-sm font-medium text-red-700">Baja: {formatDate(item.bajaAt)}</p>}
                      {item.notes && <p className="text-sm text-yellow-700">{item.notes}</p>}
                      {blockReason && canAskBaja && <p className="text-xs text-red-600">{blockReason}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.bajaAt ? (
                        <button
                          type="button"
                          onClick={() => reactivateMutation.mutate(item.id)}
                          disabled={reactivateMutation.isPending}
                          className="rounded-lg border border-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary)] disabled:opacity-50"
                        >
                          Reactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (blockReason) {
                              showError(blockReason);
                              return;
                            }
                            if (!canAskBaja) {
                              showError('Solo se pueden dar de baja ítems de particulares.');
                              return;
                            }
                            setItemToBaja(item);
                          }}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700"
                        >
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-textSecondary)]">
              Página {pagination.page} de {pagination.totalPages} · {pagination.total} ítems
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-[var(--color-cardBorder)] px-3 py-2 text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
                disabled={pagination.page === pagination.totalPages}
                className="rounded-lg border border-[var(--color-cardBorder)] px-3 py-2 text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateInventoryModal
        isOpen={isCreateOpen}
        isSaving={createMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <BajaConfirmModal
        item={itemToBaja}
        isSaving={bajaMutation.isPending}
        onClose={() => setItemToBaja(null)}
        onConfirm={() => {
          if (!itemToBaja) return;
          bajaMutation.mutate(itemToBaja.id);
        }}
      />
    </>
  );
}

function DonationsPanel() {
  const [donationToApprove, setDonationToApprove] = useState<DonationRequestAdminItem | null>(null);
  const [donationToReject, setDonationToReject] = useState<DonationRequestAdminItem | null>(null);
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['library-donation-requests'],
    queryFn: async () => {
      const res = await api.get('/api/ludoteca/admin/donations');
      return res.data.data as DonationRequestAdminItem[];
    },
  });

  const refreshDonations = () => {
    queryClient.invalidateQueries({ queryKey: ['library-donation-requests'] });
    queryClient.invalidateQueries({ queryKey: ['library-admin-inventory'] });
    queryClient.invalidateQueries({ queryKey: ['ludoteca-items'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ donationId, payload }: {
      donationId: string;
      payload: {
        bggId: string | null;
        name: string;
        gameType: LibraryGameType;
        condition: GameCondition;
        notes: string | null;
        loanPolicy: LibraryLoanPolicy;
        acquisitionDate: string | null;
      };
    }) => api.patch(`/api/ludoteca/admin/donations/${donationId}/approve`, payload),
    onSuccess: () => {
      showSuccess('Donación aprobada y registrada');
      setDonationToApprove(null);
      refreshDonations();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al aprobar la donación');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ donationId, rejectionReason }: { donationId: string; rejectionReason: string | null }) =>
      api.patch(`/api/ludoteca/admin/donations/${donationId}/reject`, { rejectionReason }),
    onSuccess: () => {
      showSuccess('Solicitud rechazada');
      setDonationToReject(null);
      refreshDonations();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg ?? 'Error al rechazar la donación');
    }
  });

  if (isLoading) {
    return <p className="text-sm text-[var(--color-textSecondary)]">Cargando donaciones...</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)]">No hay solicitudes de donación.</p>
        ) : (
          data.map((donation) => (
            <div key={donation.id} className="rounded-lg border border-[var(--color-cardBorder)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-[var(--color-text)]">{donation.name}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getDonationStatusClasses(donation.status)}`}>
                      {getDonationStatusLabel(donation.status)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Solicitante: {donation.requesterDisplayName}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Tipo: {gameTypeLabels[donation.gameType as LibraryGameType] ?? donation.gameType}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Estado: {conditionLabels[donation.condition]}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Fecha propuesta: {formatDate(donation.acquisitionDate)}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Registrada: {formatDate(donation.createdAt)}</p>
                  {donation.notes && <p className="text-sm text-[var(--color-textSecondary)]">Notas: {donation.notes}</p>}
                  {donation.reviewerDisplayName && <p className="text-sm text-[var(--color-textSecondary)]">Revisó: {donation.reviewerDisplayName}</p>}
                  {donation.rejectionReason && <p className="text-sm text-red-600">Motivo: {donation.rejectionReason}</p>}
                  {donation.createdLibraryItemId && <p className="text-sm text-green-700">Ítem creado: {donation.createdLibraryItemId}</p>}
                </div>

                {donation.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDonationToApprove(donation)}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm text-white"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonationToReject(donation)}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ApproveDonationModal
        donation={donationToApprove}
        isSaving={approveMutation.isPending}
        onClose={() => setDonationToApprove(null)}
        onSubmit={(payload) => {
          if (!donationToApprove) return;
          approveMutation.mutate({ donationId: donationToApprove.id, payload });
        }}
      />

      <RejectDonationModal
        donation={donationToReject}
        isSaving={rejectMutation.isPending}
        onClose={() => setDonationToReject(null)}
        onSubmit={(reason) => {
          if (!donationToReject) return;
          rejectMutation.mutate({ donationId: donationToReject.id, rejectionReason: reason });
        }}
      />
    </>
  );
}

export default function LibraryLoansAdmin() {
  const [tab, setTab] = useState<'search' | 'active' | 'inventory' | 'donations'>('search');

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Ludoteca: Préstamos e inventario</h1>
          <p className="mt-1 text-sm text-[var(--color-textSecondary)]">
            Gestiona préstamos, inventario compartido, bajas lógicas y validación de donaciones.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--color-cardBorder)]">
          {([
            ['search', 'Buscar'],
            ['active', 'Préstamos activos'],
            ['inventory', 'Inventario'],
            ['donations', 'Donaciones'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            {tab === 'search' && <SearchPanel />}
            {tab === 'active' && <ActiveLoansList />}
            {tab === 'inventory' && <InventoryPanel />}
            {tab === 'donations' && <DonationsPanel />}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
