import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardContent } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../api/axios';
import type { LibraryLoan, ItemSearchResult, GameCondition, LibraryItemLoanStatus, LibraryLoanPolicy } from '../../types/libraryLoans';

const conditionLabels: Record<GameCondition, string> = { NUEVO: 'Nuevo', BUENO: 'Bueno', REGULAR: 'Regular', MALO: 'Malo' };
const conditionOptions: GameCondition[] = ['NUEVO', 'BUENO', 'REGULAR', 'MALO'];
const loanPolicyLabels: Record<LibraryLoanPolicy, string> = {
  LOANABLE: 'Prestable',
  CONSULT: 'Consulta',
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

function getOwnerLabel(ownerEmail: string | null): string {
  if (!ownerEmail || ownerEmail === 'clubdreadnought.vlc@gmail.com') {
    return 'Club Dreadnought';
  }
  return ownerEmail;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-xl">
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
      </div>
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
  };

  const confirmMutation = useMutation({
    mutationFn: (loanId: string) => api.patch(`/api/library-loans/${loanId}/confirm-delivery`),
    onSuccess: () => { showSuccess('Entrega confirmada'); refreshSearch(); },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al confirmar la entrega'); }
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
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al cancelar la solicitud'); }
  });

  const returnMutation = useMutation({
    mutationFn: (form: { loanId: string; conditionIn: GameCondition; notesIn: string; nextLoanStatus: LibraryItemLoanStatus }) =>
      api.post(`/api/library-loans/${form.loanId}/return`, { conditionIn: form.conditionIn, notesIn: form.notesIn || undefined, nextLoanStatus: form.nextLoanStatus }),
    onSuccess: () => { showSuccess('Devolución registrada'); setReturnForm(null); refreshSearch(); },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al registrar la devolución'); }
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
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error'); }
  });

  const cancelMutation = useMutation({
    mutationFn: (loanId: string) => api.post(`/api/library-loans/${loanId}/cancel`),
    onSuccess: () => { showSuccess('Solicitud cancelada'); queryClient.invalidateQueries({ queryKey: ['library-loans-active'] }); },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al cancelar'); }
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

export default function LibraryLoansAdmin() {
  const [tab, setTab] = useState<'search' | 'active'>('search');

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Préstamos de ludoteca</h1>

        <div className="flex gap-2 border-b border-[var(--color-cardBorder)]">
          {(['search', 'active'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'}`}
            >
              {t === 'search' ? 'Buscar' : 'Préstamos activos'}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            {tab === 'search' ? <SearchPanel /> : <ActiveLoansList />}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
