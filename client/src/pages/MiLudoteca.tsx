import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import type { ApiResponse } from '../types/auth';

interface GameLocation {
  id: string;
  name: string;
}

interface CatalogGame {
  id: string;
  name: string;
  image: string | null;
  thumbnail: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
}

interface UserGame {
  id: string;
  gameId: string;
  game: CatalogGame;
  own: boolean;
  wishlist: boolean;
  previouslyOwned: boolean;
  wishlistPriority: number | null;
  wantToPlay: boolean;
  locationId: string | null;
  location: GameLocation | null;
  status: string;
}

interface MyGamesResponse {
  games: UserGame[];
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface BggSearchGame {
  id: string;
  name: string;
  yearPublished: string;
  thumbnail: string;
}

interface BggSearchResponse {
  games: BggSearchGame[];
  total: number;
  page: number;
  pageSize: number;
}

interface BggCollectionItem {
  bggId: string;
  title: string;
  thumbnail: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  own: boolean;
  wishlist: boolean;
  previouslyOwned: boolean;
  wishlistPriority: number | null;
}

interface SyncCheckResponse {
  bggUsername: string;
  lastBggSync: string | null;
  toImport: BggCollectionItem[];
  toImportOwned: number;
  toImportWishlist: number;
  toImportPreviouslyOwned: number;
  toDelete: { gameId: string; title: string }[];
  estimatedSeconds: number;
  newCatalogItems: number;
}

interface BggSyncLaunchResponse {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalToImport: number;
  totalToDelete: number;
  estimatedSeconds: number;
}

interface BggSyncJob {
  id: string;
  status: 'QUEUED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalToImport: number;
  totalToDelete: number;
  processed: number;
  imported: number;
  linkedExisting: number;
  deleted: number;
  failed: number;
  estimatedSeconds: number;
  error: string | null;
  queuePosition: number | null;
  estimatedWaitSeconds: number | null;
}

const BGG_SYNC_DISMISSED_JOB_KEY = 'bggSyncDismissedJobId';
type Tab = 'own' | 'wishlist' | 'previouslyOwned' | 'wantToPlay';

const TAB_LABELS: Record<Tab, string> = {
  own: 'Mi colección',
  wishlist: 'Wishlist',
  previouslyOwned: 'Lo tuve',
  wantToPlay: 'Quiero jugar',
};

function formatEta(seconds: number) {
  if (!seconds || seconds < 60) {
    return 'menos de 1 minuto';
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return 'No disponible';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function getSyncStatusLabel(job: BggSyncJob) {
  if (job.status === 'QUEUED') return 'Preparando sincronización...';
  if (job.status === 'PENDING') return 'En cola';
  if (job.status === 'PROCESSING') return 'Sincronizando';
  if (job.status === 'COMPLETED') return 'Importación desde BGG completada';
  if (job.status === 'CANCELLED') return 'Sincronización cancelada';
  return 'Con incidencias';
}

export default function MiLudoteca() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('own');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [bggQuery, setBggQuery] = useState('');
  const [bggQueryInput, setBggQueryInput] = useState('');
  const [showBggSearch, setShowBggSearch] = useState(false);
  const [bggUsernameInput, setBggUsernameInput] = useState('');
  const [syncData, setSyncData] = useState<SyncCheckResponse | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncImportLocationId, setSyncImportLocationId] = useState('');
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [pendingRemovalGame, setPendingRemovalGame] = useState<UserGame | null>(null);
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(
    () => localStorage.getItem(BGG_SYNC_DISMISSED_JOB_KEY)
  );

  const { data, isLoading } = useQuery({
    queryKey: ['myGames', tab, search, page, locationFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ tab, page: String(page), pageSize: '48', ...(search && { search }), ...(locationFilter && { locationId: locationFilter }) });
      const res = await api.get<ApiResponse<MyGamesResponse>>(`/api/my-ludoteca?${params}`);
      return res.data.data;
    },
  });

  const { data: locationsData } = useQuery({
    queryKey: ['myLocations'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GameLocation[]>>('/api/my-ludoteca/locations');
      return res.data.data;
    },
  });

  const { data: bggSearchData, isLoading: bggSearchLoading } = useQuery({
    queryKey: ['bggSearch', bggQuery],
    queryFn: async () => {
      if (!bggQuery) return null;
      const res = await api.get<ApiResponse<BggSearchResponse>>(
        `/api/bgg/search?query=${encodeURIComponent(bggQuery)}&pageSize=12`
      );
      return res.data.data;
    },
    enabled: !!bggQuery,
    staleTime: 5 * 60 * 1000,
  });

  const { data: latestSyncJob } = useQuery({
    queryKey: ['myLudotecaSyncLatest'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BggSyncJob | null>>('/api/my-ludoteca/bgg-sync-jobs/latest');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const { data: bggUsernameData } = useQuery({
    queryKey: ['myBggUsername'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ bggUsername: string | null }>>('/api/my-ludoteca/bgg-username');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (bggUsernameData?.bggUsername) {
      setBggUsernameInput(bggUsernameData.bggUsername);
    }
  }, [bggUsernameData]);

  const { data: activeSyncJob, refetch: refetchActiveSyncJob } = useQuery({
    queryKey: ['myLudotecaSyncJob', activeJobId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BggSyncJob>>(`/api/my-ludoteca/bgg-sync-jobs/${activeJobId}`);
      return res.data.data;
    },
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const job = query.state.data as BggSyncJob | undefined;
      return job && (job.status === 'QUEUED' || job.status === 'PENDING' || job.status === 'PROCESSING') ? 5000 : false;
    },
  });

  useEffect(() => {
    if (!activeJobId && latestSyncJob && (latestSyncJob.status === 'QUEUED' || latestSyncJob.status === 'PENDING' || latestSyncJob.status === 'PROCESSING')) {
      setActiveJobId(latestSyncJob.id);
    }
  }, [activeJobId, latestSyncJob]);

  const locations: GameLocation[] = locationsData ?? [];
  const games = data?.games ?? [];
  const pagination = data?.pagination;
  const displayedSyncJob = activeSyncJob ?? latestSyncJob ?? null;
  const syncRunning = displayedSyncJob?.status === 'QUEUED' || displayedSyncJob?.status === 'PENDING' || displayedSyncJob?.status === 'PROCESSING';
  const dismissSyncJob = useCallback((jobId: string, reload = false) => {
    setDismissedJobId(jobId);
    localStorage.setItem(BGG_SYNC_DISMISSED_JOB_KEY, jobId);
    if (reload) window.location.reload();
  }, []);

  const cancelSyncMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/api/my-ludoteca/bgg-sync-jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLudotecaSyncLatest'] });
      queryClient.invalidateQueries({ queryKey: ['myLudotecaSyncJob'] });
      setActiveJobId(null);
      toastSuccess('Sincronización cancelada');
    },
    onError: () => toastError('No se pudo cancelar la sincronización'),
  });

  const addMutation = useMutation({
    mutationFn: async ({ bggId, own, wishlist, previouslyOwned, wantToPlay }: { bggId: string; own?: boolean; wishlist?: boolean; previouslyOwned?: boolean; wantToPlay?: boolean }) => {
      await api.post('/api/my-ludoteca', { bggId, own, wishlist, previouslyOwned, wantToPlay });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      toastSuccess('Juego añadido a tu ludoteca');
    },
    onError: () => toastError('Error al añadir el juego'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: Partial<Pick<UserGame, 'own' | 'wishlist' | 'previouslyOwned' | 'wantToPlay' | 'wishlistPriority' | 'locationId'>> }) => {
      await api.patch(`/api/my-ludoteca/${gameId}`, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myGames'] }),
    onError: () => toastError('Error al actualizar el juego'),
  });

  const removeMutation = useMutation({
    mutationFn: async (gameId: string) => {
      await api.delete(`/api/my-ludoteca/${gameId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      toastSuccess('Juego eliminado');
    },
    onError: () => toastError('Error al eliminar el juego'),
  });

  const createLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<ApiResponse<GameLocation>>('/api/my-ludoteca/locations', { name });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLocations'] });
      toastSuccess('Ubicación creada');
      setShowNewLocationModal(false);
      setNewLocationName('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toastError(msg || 'Error al crear la ubicación');
    },
  });

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleBggSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setBggQuery(bggQueryInput);
  }, [bggQueryInput]);

  const handleSyncCheck = async () => {
    if (!bggUsernameInput.trim()) {
      toastError('Introduce tu usuario de BGG primero');
      return;
    }
    setSyncing(true);
    try {
      if (bggUsernameInput.trim() !== (bggUsernameData?.bggUsername ?? '')) {
        await api.patch('/api/my-ludoteca/bgg-username', { bggUsername: bggUsernameInput.trim() });
      }
      const res = await api.get<ApiResponse<SyncCheckResponse>>('/api/my-ludoteca/bgg-sync-check');
      setSyncData(res.data.data ?? null);
      setShowSyncModal(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toastError(msg || 'Error al consultar BGG');
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmSync = async () => {
    if (!syncData) return;
    setSyncing(true);
    try {
      const res = await api.post<ApiResponse<BggSyncLaunchResponse>>('/api/my-ludoteca/bgg-sync-confirm', {
        locationId: syncImportLocationId || null,
      });

      const launch = res.data.data;
      if (!launch) {
        throw new Error('No se pudo iniciar la sincronización');
      }
      setActiveJobId(launch.jobId);
      setDismissedJobId(null);
      localStorage.removeItem(BGG_SYNC_DISMISSED_JOB_KEY);
      queryClient.invalidateQueries({ queryKey: ['myLudotecaSyncLatest'] });
      void refetchActiveSyncJob();
      toastSuccess('Sincronización encolada. Se calcularán los cambios en breve.');
      setShowSyncModal(false);
      setSyncData(null);
      setSyncImportLocationId('');
      setShowSyncDetails(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toastError(msg || 'Error durante la sincronización');
    } finally {
      setSyncing(false);
    }
  };

  const handleLocationChange = (gameId: string, value: string) => {
    if (value === '__new__') {
      setShowNewLocationModal(true);
      return;
    }

    updateMutation.mutate({ gameId, data: { locationId: value || null } });
  };

  const alreadyInLibrary = useCallback(
    (bggId: string) => games.some((game) => game.gameId === bggId),
    [games]
  );

  const syncProgress = useMemo(() => {
    if (!displayedSyncJob) return null;
    const total = displayedSyncJob.totalToImport + displayedSyncJob.totalToDelete;
    if (total === 0) return 0;
    return Math.min(100, Math.round((displayedSyncJob.processed / total) * 100));
  }, [displayedSyncJob]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Mi ludoteca</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            Tu colección personal de juegos
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-3">Sincronizar con BoardGameGeek</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={bggUsernameInput}
                  onChange={(e) => setBggUsernameInput(e.target.value)}
                  placeholder="Tu usuario de BGG"
                  className="flex-1 px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  onClick={handleSyncCheck}
                  disabled={syncing || syncRunning}
                  className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] disabled:opacity-50 flex items-center gap-2"
                >
                  {syncing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                      Consultando BGG...
                    </>
                  ) : syncRunning ? (
                    'Sincronización en curso'
                  ) : (
                    'Actualizar desde BGG'
                  )}
                </button>
              </div>
            </div>

            {displayedSyncJob && displayedSyncJob.id !== dismissedJobId && (
              <div className="rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)]/50 p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {getSyncStatusLabel(displayedSyncJob)}
                    </p>
                    <div className="space-y-1">
                      {(displayedSyncJob.status === 'COMPLETED' || displayedSyncJob.status === 'FAILED' || displayedSyncJob.status === 'CANCELLED') && (
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          {(displayedSyncJob.status === 'COMPLETED' || displayedSyncJob.status === 'FAILED') &&
                            `Última importación: ${formatDateTime(displayedSyncJob.finishedAt ?? displayedSyncJob.requestedAt)}. `}
                          {displayedSyncJob.status === 'COMPLETED' && `Añadidos: ${displayedSyncJob.imported + displayedSyncJob.linkedExisting}. Nuevos en catálogo: ${displayedSyncJob.imported}. Eliminados: ${displayedSyncJob.deleted}.${displayedSyncJob.failed > 0 ? ` Fallidos: ${displayedSyncJob.failed}.` : ''}`}
                          {displayedSyncJob.status === 'FAILED' && (displayedSyncJob.error || 'La sincronización terminó con incidencias.')}
                        </p>
                      )}
                      {(displayedSyncJob.status === 'QUEUED' || displayedSyncJob.status === 'PENDING' || displayedSyncJob.status === 'PROCESSING') && (
                        <>
                          {displayedSyncJob.status !== 'PROCESSING' && displayedSyncJob.queuePosition != null && (
                            <p className="text-xs text-[var(--color-textSecondary)]">
                              Posición en cola: {displayedSyncJob.queuePosition}
                              {displayedSyncJob.estimatedWaitSeconds != null && displayedSyncJob.estimatedWaitSeconds > 0 &&
                                ` · Espera estimada: ~${formatEta(displayedSyncJob.estimatedWaitSeconds)}`}
                            </p>
                          )}
                          <p className="text-xs text-[var(--color-textSecondary)]">
                            {displayedSyncJob.status === 'QUEUED'
                              ? 'Calculando cambios desde BGG...'
                              : `Se están procesando ${displayedSyncJob.totalToImport + displayedSyncJob.totalToDelete} cambios. Refresca la página en unos ${formatEta(displayedSyncJob.estimatedSeconds)} si te vas antes.`}
                          </p>
                        </>
                      )}
                    </div>
                    {(displayedSyncJob.status === 'COMPLETED' || displayedSyncJob.status === 'FAILED' || displayedSyncJob.status === 'CANCELLED') && (
                      <p className="text-[11px] text-[var(--color-textSecondary)] mt-1">
                        {displayedSyncJob.status === 'COMPLETED'
                          ? 'Puedes pulsar "Cerrar" para ocultar este mensaje y recargar la página para que aparezcan los juegos en tu ludoteca.'
                          : 'Puedes pulsar "Cerrar" para ocultar este mensaje.'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-textSecondary)]">
                      {displayedSyncJob.estimatedSeconds > 0 && `Estimación: ${formatEta(displayedSyncJob.estimatedSeconds)}`}
                    </span>
                    {(displayedSyncJob.status === 'QUEUED' || displayedSyncJob.status === 'PENDING') && (
                      <button
                        onClick={() => cancelSyncMutation.mutate(displayedSyncJob.id)}
                        disabled={cancelSyncMutation.isPending}
                        className="px-3 py-1 text-xs border border-red-400 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                      >
                        {cancelSyncMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                    {(displayedSyncJob.status === 'COMPLETED' || displayedSyncJob.status === 'FAILED' || displayedSyncJob.status === 'CANCELLED') && (
                      <button
                        onClick={() => dismissSyncJob(displayedSyncJob.id, displayedSyncJob.status === 'COMPLETED')}
                        className="px-3 py-1 text-xs border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                        title="Cerrar"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>

                {syncProgress !== null && (
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                        style={{ width: `${syncProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--color-textSecondary)]">
                      {displayedSyncJob.processed} / {displayedSyncJob.totalToImport + displayedSyncJob.totalToDelete} operaciones
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <button
              onClick={() => setShowBggSearch(!showBggSearch)}
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              {showBggSearch ? 'Ocultar búsqueda en BGG' : 'Buscar juego en BGG y añadir'}
            </button>
            {showBggSearch && (
              <div className="mt-3 space-y-3">
                <form onSubmit={handleBggSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={bggQueryInput}
                    onChange={(e) => setBggQueryInput(e.target.value)}
                    placeholder="Nombre del juego..."
                    className="flex-1 px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
                  >
                    Buscar
                  </button>
                </form>

                {bggSearchLoading && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {bggSearchData && bggSearchData.games.length === 0 && (
                  <p className="text-sm text-[var(--color-textSecondary)]">No se encontraron resultados.</p>
                )}

                {bggSearchData && bggSearchData.games.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {bggSearchData.games.map((game) => {
                      const inLibrary = alreadyInLibrary(game.id);
                      return (
                        <div key={game.id} className="flex flex-col items-center gap-1 text-center">
                          {game.thumbnail ? (
                            <img src={game.thumbnail} alt={game.name} className="w-16 h-16 object-cover rounded" loading="lazy" />
                          ) : (
                            <div className="w-16 h-16 bg-[var(--color-tableRowHover)] rounded flex items-center justify-center text-xs text-[var(--color-textSecondary)]">
                              Sin img
                            </div>
                          )}
                          <p className="text-xs text-[var(--color-text)] leading-tight line-clamp-2">{game.name}</p>
                          {game.yearPublished && (
                            <p className="text-[10px] text-[var(--color-textSecondary)]">{game.yearPublished}</p>
                          )}
                          <button
                            onClick={() => addMutation.mutate({ bggId: game.id, own: true })}
                            disabled={inLibrary || addMutation.isPending}
                            className="text-xs px-2 py-1 rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
                          >
                            {inLibrary ? 'Ya tienes' : 'Añadir'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex border border-[var(--color-cardBorder)] rounded-lg overflow-hidden">
            {(Object.keys(TAB_LABELS) as Tab[]).map((currentTab) => (
              <button
                key={currentTab}
                onClick={() => { setTab(currentTab); setPage(1); }}
                className={`px-4 py-2 text-sm transition-colors ${tab === currentTab ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)]'}`}
              >
                {TAB_LABELS[currentTab]}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filtrar por nombre..."
              className="flex-1 px-3 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button type="submit" className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90">
              Filtrar
            </button>
          </form>
          {(locations?.length ?? 0) > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Todas las ubicaciones</option>
              <option value="__casa__">Casa</option>
              {locations!.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-[var(--color-textSecondary)]">
                {tab === 'own' && 'Tu colección está vacía. Busca juegos arriba o sincroniza con BGG.'}
                {tab === 'wishlist' && 'Tu wishlist está vacía.'}
                {tab === 'previouslyOwned' && 'No tienes juegos marcados como "Lo tuve".'}
                {tab === 'wantToPlay' && 'No tienes juegos marcados como "Quiero jugar".'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  locations={locations}
                  onUpdate={(payload) => updateMutation.mutate({ gameId: game.gameId, data: payload })}
                  onLocationChange={(value) => handleLocationChange(game.gameId, value)}
                  onRemove={() => setPendingRemovalGame(game)}
                />
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-[var(--color-textSecondary)] pt-2">
                <span>{pagination.total} juegos · Página {pagination.currentPage} de {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.currentPage <= 1 || isLoading}
                    className="px-3 py-1 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.currentPage >= pagination.totalPages || isLoading}
                    className="px-3 py-1 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {showSyncModal && syncData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setShowSyncModal(false); setSyncImportLocationId(''); }} />
            <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Sincronización con BGG</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">
                Se van a <span className="text-green-600 font-medium">importar {syncData.toImport.length} juegos</span>
                {(syncData.toImportOwned > 0 || syncData.toImportWishlist > 0 || syncData.toImportPreviouslyOwned > 0) && (
                  <span className="text-[var(--color-textSecondary)]">
                    {' '}(
                    {[
                      syncData.toImportOwned > 0 ? `${syncData.toImportOwned} de tu colección` : null,
                      syncData.toImportWishlist > 0 ? `${syncData.toImportWishlist} de wishlist` : null,
                      syncData.toImportPreviouslyOwned > 0 ? `${syncData.toImportPreviouslyOwned} marcados como "Lo tuve"` : null,
                    ].filter(Boolean).join(', ')}
                    )
                  </span>
                )}
                {' '}y <span className="text-red-600 font-medium">eliminar {syncData.toDelete.length}</span> de tu ludoteca.
              </p>
              <div className="rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)]/50 p-3 text-xs text-[var(--color-textSecondary)]">
                Tiempo estimado: {formatEta(syncData.estimatedSeconds)}.
                {syncData.newCatalogItems > 0 && ` ${syncData.newCatalogItems} juego${syncData.newCatalogItems !== 1 ? 's' : ''} se añadirán al catálogo compartido por primera vez.`}
                {' '}La sincronización se ejecutará en background; podrás seguir usando la web y refrescar la página más tarde.
              </div>
              <p className="text-xs text-[var(--color-textSecondary)]">
                Solo se eliminan juegos que fueron importados desde BGG. Los añadidos manualmente desde la app no se ven afectados.
              </p>

              {(syncData.toImport.length > 0 || syncData.toDelete.length > 0) && (
                <button
                  onClick={() => setShowSyncDetails(!showSyncDetails)}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {showSyncDetails ? 'Ocultar detalles' : 'Ver detalles'}
                </button>
              )}

              {showSyncDetails && (
                <div className="max-h-56 overflow-y-auto border border-[var(--color-cardBorder)] rounded-lg p-2 space-y-1 text-xs">
                  {syncData.toImport.map((game) => (
                    <div key={game.bggId} className="flex items-center gap-1">
                      <span className="text-green-600 font-bold">+</span>
                      <span className="text-[var(--color-text)]">{game.title}</span>
                      <span className="text-[10px] text-[var(--color-textSecondary)]">
                        {[
                          game.own ? 'Tengo' : null,
                          game.wishlist ? 'Wishlist' : null,
                          game.previouslyOwned ? 'Lo tuve' : null,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  ))}
                  {syncData.toDelete.map((game) => (
                    <div key={game.gameId} className="flex items-center gap-1">
                      <span className="text-red-600 font-bold">-</span>
                      <span className="text-[var(--color-textSecondary)]">{game.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {syncData.toImport.length === 0 && syncData.toDelete.length === 0 && (
                <p className="text-sm text-[var(--color-textSecondary)]">Tu ludoteca ya está sincronizada con BGG.</p>
              )}

              {syncData.toImport.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-text)]">
                    Ubicación para los juegos importados
                  </label>
                  <select
                    value={syncImportLocationId}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewLocationModal(true);
                      } else {
                        setSyncImportLocationId(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Casa (por defecto)</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                    <option value="__new__">Añadir otra ubicación...</option>
                  </select>
                  <p className="text-[10px] text-[var(--color-textSecondary)]">
                    Podrás cambiar la ubicación de cada juego individualmente después.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowSyncModal(false); setSyncImportLocationId(''); }}
                  className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
                >
                  Cancelar
                </button>
                {(syncData.toImport.length > 0 || syncData.toDelete.length > 0) && (
                  <button
                    onClick={handleConfirmSync}
                    disabled={syncing}
                    className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {syncing ? 'Lanzando...' : 'Lanzar sincronización'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {pendingRemovalGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setPendingRemovalGame(null)} />
            <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Quitar juego</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">
                Se quitará <span className="font-medium text-[var(--color-text)]">{pendingRemovalGame.game.name}</span> de tu lista.
              </p>
              <p className="text-xs text-[var(--color-textSecondary)]">
                Pulsa Aceptar para confirmar o Cancelar para mantenerlo en tu ludoteca.
              </p>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => setPendingRemovalGame(null)}
                  className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    removeMutation.mutate(pendingRemovalGame.gameId);
                    setPendingRemovalGame(null);
                  }}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewLocationModal(false)} />
            <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Nueva ubicación</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">
                Dale un nombre a la ubicación donde guardas tus juegos.
              </p>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLocationName.trim()) {
                    createLocationMutation.mutate(newLocationName.trim());
                  }
                }}
                placeholder="Ej: Club Dreadnought"
                autoFocus
                className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => { setShowNewLocationModal(false); setNewLocationName(''); }}
                  className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createLocationMutation.mutate(newLocationName.trim())}
                  disabled={!newLocationName.trim() || createLocationMutation.isPending}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {createLocationMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

interface GameCardProps {
  game: UserGame;
  locations: GameLocation[];
  onUpdate: (data: Partial<Pick<UserGame, 'own' | 'wishlist' | 'previouslyOwned' | 'wantToPlay' | 'wishlistPriority' | 'locationId'>>) => void;
  onLocationChange: (value: string) => void;
  onRemove: () => void;
}

function GameCard({ game, locations, onUpdate, onLocationChange, onRemove }: GameCardProps) {
  const imageUrl = game.game.image ?? game.game.thumbnail;

  const handleOwnClick = () => {
    // Can't deactivate "Tengo" if it's the only active flag
    if (game.own && !game.wishlist && !game.previouslyOwned && !game.wantToPlay) return;
    onUpdate({ own: !game.own, ...(game.own ? {} : { previouslyOwned: false }) });
  };

  const handleWishlistClick = () => {
    if (!game.wishlist) {
      // Activating wishlist â†’ deactivate "Tengo"
      onUpdate({ wishlist: true, own: false });
    } else {
      // Deactivating wishlist only allowed if something else stays active
      if (!game.wantToPlay && !game.own && !game.previouslyOwned) return;
      onUpdate({ wishlist: false });
    }
  };

  const handlePreviouslyOwnedClick = () => {
    if (!game.previouslyOwned) {
      onUpdate({ previouslyOwned: true, own: false });
    } else {
      if (!game.wantToPlay && !game.own && !game.wishlist) return;
      onUpdate({ previouslyOwned: false });
    }
  };

  const handleWantToPlayClick = () => {
    if (!game.wantToPlay) {
      // Activating wantToPlay â†’ deactivate "Tengo"
      onUpdate({ wantToPlay: true, own: false });
    } else {
      // Deactivating only allowed if something else stays active
      if (!game.wishlist && !game.own && !game.previouslyOwned) return;
      onUpdate({ wantToPlay: false });
    }
  };

  return (
    <div className="flex max-sm:flex-row sm:flex-col bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Imagen: en móvil rectangular 2:3 a la izquierda; en sm+ vertical 3:4 ancho completo */}
      <div className="max-sm:w-[72px] max-sm:aspect-[2/3] max-sm:shrink-0 sm:aspect-[3/4] sm:w-full bg-[var(--color-tableRowHover)] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={game.game.name}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] text-[var(--color-textSecondary)] text-center px-1">{game.game.name}</span>
          </div>
        )}
      </div>

      <div className="p-2 flex flex-col gap-1 flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text)] leading-tight line-clamp-2">{game.game.name}</p>
        {game.game.yearPublished && (
          <p className="text-[10px] text-[var(--color-textSecondary)]">{game.game.yearPublished}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          <FlagChip label="Tengo" active={game.own} onClick={handleOwnClick} />
          <FlagChip label="Wishlist" active={game.wishlist} onClick={handleWishlistClick} />
          <FlagChip label="Lo tuve" active={game.previouslyOwned} onClick={handlePreviouslyOwnedClick} />
          <FlagChip label="Jugar" active={game.wantToPlay} onClick={handleWantToPlayClick} />
        </div>
        {game.wishlist && (
          <select
            value={game.wishlistPriority ?? ''}
            onChange={(e) => onUpdate({ wishlistPriority: e.target.value ? Number(e.target.value) : null })}
            className="mt-0.5 w-full text-[10px] px-1.5 py-1 border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            <option value="">Sin prioridad</option>
            <option value="1">1 · Imprescindible</option>
            <option value="2">2 · Me encantaría tenerlo</option>
            <option value="3">3 · Me gustaría tenerlo</option>
            <option value="4">4 · Lo estoy pensando</option>
            <option value="5">5 · Mejor no comprarlo</option>
          </select>
        )}

        <select
          value={game.locationId ?? ''}
          onChange={(e) => onLocationChange(e.target.value)}
          className="mt-1 w-full text-[10px] px-1.5 py-1 border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        >
          <option value="">Casa</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
          <option value="__new__">Añadir otra ubicación...</option>
        </select>

        <div className="flex items-center justify-between mt-auto pt-1">
          <a
            href={`https://boardgamegeek.com/boardgame/${game.gameId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[var(--color-primary)] hover:underline"
          >
            BGG
          </a>
          <button
            onClick={onRemove}
            className="text-[10px] text-red-400 hover:text-red-600"
            title="Eliminar de mi ludoteca"
          >
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}

function FlagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'text-[var(--color-textSecondary)] border-[var(--color-cardBorder)] hover:border-[var(--color-primary)]'
      }`}
    >
      {label}
    </button>
  );
}

