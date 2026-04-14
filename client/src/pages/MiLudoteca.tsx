// client/src/pages/MiLudoteca.tsx
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import type { ApiResponse } from '../types/auth';

// ---------- tipos ----------

interface GameLocation {
  id: string;
  name: string;
}

interface UserGame {
  id: string;
  bggId: string;
  title: string;
  thumbnail: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  own: boolean;
  wishlist: boolean;
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
}

interface SyncCheckResponse {
  bggUsername: string;
  lastBggSync: string | null;
  toImport: BggCollectionItem[];
  toDelete: { bggId: string; title: string }[];
}

type Tab = 'own' | 'wishlist' | 'wantToPlay';

const TAB_LABELS: Record<Tab, string> = {
  own: 'Mi colección',
  wishlist: 'Wishlist',
  wantToPlay: 'Quiero jugar',
};

// ---------- componente ----------

export default function MiLudoteca() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('own');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // BGG search
  const [bggQuery, setBggQuery] = useState('');
  const [bggQueryInput, setBggQueryInput] = useState('');
  const [showBggSearch, setShowBggSearch] = useState(false);

  // BGG sync
  const [bggUsernameInput, setBggUsernameInput] = useState('');
  const [syncData, setSyncData] = useState<SyncCheckResponse | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  // Ubicación para importación de sync BGG
  const [syncImportLocationId, setSyncImportLocationId] = useState('');

  // Nueva ubicación
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // ---------- queries ----------

  const { data, isLoading } = useQuery({
    queryKey: ['myGames', tab, search],
    queryFn: async () => {
      const params = new URLSearchParams({ tab, ...(search && { search }) });
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

  const locations: GameLocation[] = locationsData ?? [];

  // ---------- mutations ----------

  const addMutation = useMutation({
    mutationFn: async ({ bggId, own, wishlist, wantToPlay }: { bggId: string; own?: boolean; wishlist?: boolean; wantToPlay?: boolean }) => {
      await api.post('/api/my-ludoteca', { bggId, own, wishlist, wantToPlay });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      toastSuccess('Juego añadido a tu ludoteca');
    },
    onError: () => toastError('Error al añadir el juego'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ bggId, data }: { bggId: string; data: Partial<Pick<UserGame, 'own' | 'wishlist' | 'wantToPlay' | 'wishlistPriority' | 'locationId'>> }) => {
      await api.patch(`/api/my-ludoteca/${bggId}`, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myGames'] }),
    onError: () => toastError('Error al actualizar el juego'),
  });

  const removeMutation = useMutation({
    mutationFn: async (bggId: string) => {
      await api.delete(`/api/my-ludoteca/${bggId}`);
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

  // ---------- handlers ----------

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  }, [searchInput]);

  const handleBggSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setBggQuery(bggQueryInput);
  }, [bggQueryInput]);

  const handleSaveUsername = async () => {
    if (!bggUsernameInput.trim()) return;
    setSavingUsername(true);
    try {
      await api.patch('/api/my-ludoteca/bgg-username', { bggUsername: bggUsernameInput.trim() });
      toastSuccess('Usuario de BGG guardado');
    } catch {
      toastError('Error al guardar el usuario de BGG');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSyncCheck = async () => {
    setSyncing(true);
    try {
      const res = await api.get<ApiResponse<SyncCheckResponse>>('/api/my-ludoteca/bgg-sync-check');
      setSyncData(res.data.data);
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
      await api.post('/api/my-ludoteca/bgg-sync-confirm', {
        toImport: syncData.toImport,
        toDelete: syncData.toDelete,
        locationId: syncImportLocationId || null,
      });
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      toastSuccess(`Sincronización completada: +${syncData.toImport.length} / -${syncData.toDelete.length}`);
      setShowSyncModal(false);
      setSyncData(null);
      setSyncImportLocationId('');
    } catch {
      toastError('Error durante la sincronización');
    } finally {
      setSyncing(false);
    }
  };

  const handleLocationChange = (bggId: string, value: string) => {
    if (value === '__new__') {
      setShowNewLocationModal(true);
      return;
    }
    // value === '' → Casa (null), value === id → ubicación personalizada
    updateMutation.mutate({ bggId, data: { locationId: value || null } });
  };

  // ---------- render ----------

  const games = data?.games ?? [];

  const alreadyInLibrary = useCallback(
    (bggId: string) => games.some((g) => g.bggId === bggId),
    [games]
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Mi ludoteca</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            Tu colección personal de juegos
          </p>
        </div>

        {/* Sync BGG */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-[var(--color-text)] mb-3">Sincronizar con BoardGameGeek</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={bggUsernameInput}
                  onChange={(e) => setBggUsernameInput(e.target.value)}
                  placeholder="Tu usuario de BGG"
                  className="flex-1 px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={savingUsername || !bggUsernameInput.trim()}
                  className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
              <button
                onClick={handleSyncCheck}
                disabled={syncing}
                className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] disabled:opacity-50 flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                    Consultando BGG...
                  </>
                ) : (
                  'Actualizar desde BGG'
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Búsqueda manual BGG */}
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
                            <img src={game.thumbnail} alt={game.name} className="w-16 h-16 object-cover rounded" />
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

        {/* Tabs + filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex border border-[var(--color-cardBorder)] rounded-lg overflow-hidden">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm transition-colors ${tab === t ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)]'}`}
              >
                {TAB_LABELS[t]}
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
        </div>

        {/* Grid de juegos */}
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
                {tab === 'wantToPlay' && 'No tienes juegos marcados como "Quiero jugar".'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                locations={locations}
                onUpdate={(data) => updateMutation.mutate({ bggId: game.bggId, data })}
                onLocationChange={(value) => handleLocationChange(game.bggId, value)}
                onRemove={() => removeMutation.mutate(game.bggId)}
              />
            ))}
          </div>
        )}

        {/* Modal de sincronización BGG */}
        {showSyncModal && syncData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setShowSyncModal(false); setSyncImportLocationId(''); }} />
            <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">Sincronización con BGG</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">
                Se van a <span className="text-green-600 font-medium">importar {syncData.toImport.length} juegos</span>{' '}
                y <span className="text-red-600 font-medium">eliminar {syncData.toDelete.length}</span> de tu ludoteca.
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
                  {syncData.toImport.map((g) => (
                    <div key={g.bggId} className="flex items-center gap-1">
                      <span className="text-green-600 font-bold">+</span>
                      <span className="text-[var(--color-text)]">{g.title}</span>
                    </div>
                  ))}
                  {syncData.toDelete.map((g) => (
                    <div key={g.bggId} className="flex items-center gap-1">
                      <span className="text-red-600 font-bold">-</span>
                      <span className="text-[var(--color-textSecondary)]">{g.title}</span>
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
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
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
                    {syncing ? 'Sincronizando...' : 'Confirmar cambios'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal nueva ubicación */}
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

// ---------- GameCard subcomponente ----------

interface GameCardProps {
  game: UserGame;
  locations: GameLocation[];
  onUpdate: (data: Partial<Pick<UserGame, 'own' | 'wishlist' | 'wantToPlay' | 'wishlistPriority'>>) => void;
  onLocationChange: (value: string) => void;
  onRemove: () => void;
}

function GameCard({ game, locations, onUpdate, onLocationChange, onRemove }: GameCardProps) {
  return (
    <div className="flex flex-col bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-square bg-[var(--color-tableRowHover)] flex items-center justify-center">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-[var(--color-textSecondary)] text-center px-2">{game.title}</span>
        )}
      </div>

      {/* Info */}
      <div className="p-2 flex flex-col gap-1 flex-1">
        <p className="text-xs font-medium text-[var(--color-text)] leading-tight line-clamp-2">{game.title}</p>
        {game.yearPublished && (
          <p className="text-[10px] text-[var(--color-textSecondary)]">{game.yearPublished}</p>
        )}

        {/* Flags */}
        <div className="flex flex-wrap gap-1 mt-1">
          <FlagChip
            label="Tengo"
            active={game.own}
            onClick={() => onUpdate({ own: !game.own })}
          />
          <FlagChip
            label="Wishlist"
            active={game.wishlist}
            onClick={() => onUpdate({ wishlist: !game.wishlist })}
          />
          <FlagChip
            label="Jugar"
            active={game.wantToPlay}
            onClick={() => onUpdate({ wantToPlay: !game.wantToPlay })}
          />
        </div>

        {/* Ubicación */}
        <select
          value={game.locationId ?? ''}
          onChange={(e) => onLocationChange(e.target.value)}
          className="mt-1 w-full text-[10px] px-1.5 py-1 border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        >
          <option value="">Casa</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
          <option value="__new__">Añadir otra ubicación...</option>
        </select>

        {/* Enlace BGG + eliminar */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <a
            href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
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
      className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'text-[var(--color-textSecondary)] border-[var(--color-cardBorder)] hover:border-[var(--color-primary)]'
      }`}
    >
      {label}
    </button>
  );
}
