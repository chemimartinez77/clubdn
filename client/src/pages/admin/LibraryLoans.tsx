import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardContent } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../api/axios';
import type { LibraryLoan, ItemSearchResult, GameCondition, LibraryItemLoanStatus } from '../../types/libraryLoans';

const conditionLabels: Record<GameCondition, string> = { NUEVO: 'Nuevo', BUENO: 'Bueno', REGULAR: 'Regular', MALO: 'Malo' };
const conditionOptions: GameCondition[] = ['NUEVO', 'BUENO', 'REGULAR', 'MALO'];

function isOverdue(loan: LibraryLoan): boolean {
  return loan.status === 'ACTIVE' && !!loan.dueAt && new Date(loan.dueAt) < new Date();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES');
}

// ---- Panel de búsqueda por internalId ----
function SearchPanel() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['library-item-search', searched],
    queryFn: async () => {
      const res = await api.get(`/api/library-loans/search-item?internalId=${encodeURIComponent(searched)}`);
      return res.data.data as ItemSearchResult;
    },
    enabled: !!searched,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: (loanId: string) => api.patch(`/api/library-loans/${loanId}/confirm-delivery`),
    onSuccess: () => { showSuccess('Entrega confirmada'); queryClient.invalidateQueries({ queryKey: ['library-item-search', searched] }); queryClient.invalidateQueries({ queryKey: ['library-loans-active'] }); },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al confirmar la entrega'); }
  });

  const [returnForm, setReturnForm] = useState<{ loanId: string; conditionIn: GameCondition; notesIn: string; nextLoanStatus: LibraryItemLoanStatus } | null>(null);

  const loanableMutation = useMutation({
    mutationFn: ({ itemId, isLoanable }: { itemId: string; isLoanable: boolean }) =>
      api.patch(`/api/library-loans/items/${itemId}/loanable`, { isLoanable }),
    onSuccess: () => { showSuccess('Ítem actualizado'); queryClient.invalidateQueries({ queryKey: ['library-item-search', searched] }); },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al actualizar'); }
  });

  const returnMutation = useMutation({
    mutationFn: (form: { loanId: string; conditionIn: GameCondition; notesIn: string; nextLoanStatus: LibraryItemLoanStatus }) =>
      api.post(`/api/library-loans/${form.loanId}/return`, { conditionIn: form.conditionIn, notesIn: form.notesIn || undefined, nextLoanStatus: form.nextLoanStatus }),
    onSuccess: () => { showSuccess('Devolución registrada'); setReturnForm(null); queryClient.invalidateQueries({ queryKey: ['library-item-search', searched] }); queryClient.invalidateQueries({ queryKey: ['library-loans-active'] }); },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; showError(msg ?? 'Error al registrar la devolución'); }
  });

  const activeLoan = data?.loans[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') setSearched(query.trim()); }}
          placeholder="ID interno (número de pegatina)"
          className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-inputText)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <button
          onClick={() => setSearched(query.trim())}
          disabled={!query.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-50"
        >
          Buscar
        </button>
      </div>

      {(isLoading || isFetching) && <p className="text-sm text-[var(--color-textSecondary)]">Buscando...</p>}

      {searched && !isLoading && !data && (
        <p className="text-sm text-red-500">Ítem no encontrado.</p>
      )}

      {data && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              {data.thumbnail && <img src={data.thumbnail} alt={data.name} className="w-16 h-16 object-contain rounded" />}
              <div>
                <p className="font-semibold text-[var(--color-text)]">{data.name}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">ID: {data.internalId} · {data.gameType} · {conditionLabels[data.condition]}</p>
                {data.ownerEmail && <p className="text-xs text-[var(--color-textSecondary)]">Propietario: {data.ownerEmail}</p>}
                {data.notes && <p className="text-xs text-yellow-600 mt-1">{data.notes}</p>}
              </div>
              <div className="ml-auto flex flex-col items-end gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${data.loanStatus === 'AVAILABLE' ? 'bg-green-100 text-green-800' : data.loanStatus === 'ON_LOAN' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {data.loanStatus === 'AVAILABLE' ? 'Disponible' : data.loanStatus === 'ON_LOAN' ? 'Prestado' : data.loanStatus === 'REQUESTED' ? 'Solicitado' : data.loanStatus}
                </span>
                <button
                  onClick={() => loanableMutation.mutate({ itemId: data.id, isLoanable: !data.isLoanable })}
                  disabled={loanableMutation.isPending}
                  className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors disabled:opacity-50 ${data.isLoanable ? 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}`}
                >
                  {data.isLoanable ? 'Prestable' : 'No prestable'}
                </button>
              </div>
            </div>

            {activeLoan && (
              <div className="border border-[var(--color-cardBorder)] rounded-lg p-3 space-y-2">
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

                <div className="flex gap-2 pt-2">
                  {activeLoan.status === 'REQUESTED' && (
                    <button
                      onClick={() => confirmMutation.mutate(activeLoan.id)}
                      disabled={confirmMutation.isPending}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-50"
                    >
                      Confirmar entrega
                    </button>
                  )}
                  {activeLoan.status === 'ACTIVE' && !returnForm && (
                    <button
                      onClick={() => setReturnForm({ loanId: activeLoan.id, conditionIn: activeLoan.conditionOut ?? data.condition, notesIn: '', nextLoanStatus: 'AVAILABLE' })}
                      className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                    >
                      Registrar devolución
                    </button>
                  )}
                </div>
              </div>
            )}

            {returnForm && (
              <div className="border border-[var(--color-cardBorder)] rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">Registrar devolución</p>
                <div>
                  <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Condición al devolver</label>
                  <select value={returnForm.conditionIn} onChange={e => setReturnForm(f => f ? { ...f, conditionIn: e.target.value as GameCondition } : f)}
                    className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                    {conditionOptions.map(c => <option key={c} value={c}>{conditionLabels[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Estado del ítem tras devolución</label>
                  <select value={returnForm.nextLoanStatus} onChange={e => setReturnForm(f => f ? { ...f, nextLoanStatus: e.target.value as LibraryItemLoanStatus } : f)}
                    className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                    <option value="AVAILABLE">Disponible</option>
                    <option value="MAINTENANCE">En mantenimiento</option>
                    <option value="BLOCKED">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Notas (opcional)</label>
                  <textarea value={returnForm.notesIn} onChange={e => setReturnForm(f => f ? { ...f, notesIn: e.target.value } : f)}
                    rows={2} className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-inputText)]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => returnMutation.mutate(returnForm)} disabled={returnMutation.isPending}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-50">
                    {returnMutation.isPending ? 'Guardando...' : 'Confirmar devolución'}
                  </button>
                  <button onClick={() => setReturnForm(null)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-cardBorder)] text-[var(--color-textSecondary)]">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {data.queue.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-textSecondary)] mb-1">Lista de espera ({data.queue.length})</p>
                <ul className="space-y-1">
                  {data.queue.map((entry, i) => (
                    <li key={entry.id} className="text-xs text-[var(--color-textSecondary)] flex gap-2">
                      <span className="font-mono">{i + 1}.</span>
                      <span>{entry.user.name}</span>
                      <span className="text-[var(--color-textSecondary)]">· desde {formatDate(entry.createdAt)}</span>
                      {entry.status === 'NOTIFIED' && <span className="text-yellow-600 font-medium">· Notificado</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- Lista de préstamos activos ----
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

  if (isLoading) return <p className="text-sm text-[var(--color-textSecondary)]">Cargando...</p>;
  if (!data || data.length === 0) return <p className="text-sm text-[var(--color-textSecondary)]">No hay préstamos activos.</p>;

  const requested = data.filter(l => l.status === 'REQUESTED');
  const active = data.filter(l => l.status === 'ACTIVE');

  return (
    <div className="space-y-4">
      {requested.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-2">Pendientes de entrega ({requested.length})</h3>
          <div className="space-y-2">
            {requested.map(loan => (
              <div key={loan.id} className="flex items-center gap-3 p-3 rounded-lg border border-yellow-300 bg-yellow-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{loan.libraryItem.name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">Solicitado por <strong>{loan.user.name}</strong> · {formatDate(loan.createdAt)}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">ID: {loan.libraryItem.internalId}</p>
                </div>
                <button onClick={() => confirmMutation.mutate(loan.id)} disabled={confirmMutation.isPending}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-50 whitespace-nowrap">
                  Confirmar entrega
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-2">Préstamos activos ({active.length})</h3>
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

// ---- Página principal ----
export default function LibraryLoansAdmin() {
  const [tab, setTab] = useState<'search' | 'active'>('search');

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Préstamos de ludoteca</h1>

        <div className="flex gap-2 border-b border-[var(--color-cardBorder)]">
          {(['search', 'active'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'}`}
            >
              {t === 'search' ? 'Buscar por ID' : 'Préstamos activos'}
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
