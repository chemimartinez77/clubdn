// client/src/pages/Ludoteca.tsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { useToast } from '../contexts/ToastContext';
import GameDetailModal from '../components/games/GameDetailModal';

type GameType = 'WARGAME' | 'MESA' | 'CARTAS' | 'MINI' | 'ROL';
type GameCondition = 'NUEVO' | 'BUENO' | 'REGULAR' | 'MALO';

interface LibraryItem {
  id: string;
  bggId: string | null;
  internalId: string;
  name: string;
  description: string | null;
  notes: string | null;
  gameType: GameType;
  condition: GameCondition;
  ownerEmail: string | null;
  acquisitionDate: string | null;
  createdAt: string;
  updatedAt: string;
  gameThumbnail?: string | null;
}

interface LibraryStats {
  total: number;
  clubItems: number;
  memberItems: number;
  byGameType: { type: GameType; count: number }[];
  byCondition: { condition: GameCondition; count: number }[];
  uniqueOwners: number;
}

interface Filters {
  gameTypes: GameType[];
  conditions: GameCondition[];
  owners: string[];
}

const gameTypeLabels: Record<GameType, string> = {
  WARGAME: 'Wargame',
  MESA: 'Juego de Mesa',
  CARTAS: 'Juego de Cartas',
  MINI: 'Miniaturas',
  ROL: 'Rol'
};

const gameTypeIcons: Record<GameType, string> = {
  WARGAME: '🎖️',
  MESA: '🎲',
  CARTAS: '🃏',
  MINI: '♟️',
  ROL: '📖'
};

const conditionLabels: Record<GameCondition, string> = {
  NUEVO: 'Nuevo',
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  MALO: 'Malo'
};

const conditionColors: Record<GameCondition, string> = {
  NUEVO: 'bg-green-100 text-green-800',
  BUENO: 'bg-blue-100 text-blue-800',
  REGULAR: 'bg-yellow-100 text-yellow-800',
  MALO: 'bg-red-100 text-red-800'
};

// Helper para mostrar el nombre del propietario
const getOwnerDisplayName = (ownerEmail: string | null): string => {
  if (!ownerEmail || ownerEmail === 'club' || ownerEmail === 'clubdreadnought.vlc@gmail.com') {
    return 'Club Dreadnought';
  }
  return ownerEmail;
};

export default function Ludoteca() {
  const { error: showError } = useToast();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/ludoteca/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/ludoteca/filters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilters(data.data);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage === -1 ? '9999' : itemsPerPage.toString()
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedType !== 'all') params.append('gameType', selectedType);
      if (selectedCondition !== 'all') params.append('condition', selectedCondition);
      if (selectedOwner !== 'all') params.append('ownerEmail', selectedOwner);

      const response = await fetch(`${API_URL}/api/ludoteca?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.total);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        showError('Error al cargar los juegos');
      }
    } catch (error) {
      console.error('Error loading items:', error);
      showError('Error al cargar los juegos');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, selectedType, selectedCondition, selectedOwner, showError]);

  // Cargar estadísticas y filtros
  useEffect(() => {
    loadStats();
    loadFilters();
  }, [loadStats, loadFilters]);

  // Cargar items con filtros
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ludoteca del Club</h1>
            <p className="text-gray-600 mt-1">Catálogo de juegos disponibles en el club</p>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Juegos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Del Club</p>
                    <p className="text-3xl font-bold text-green-600">{stats.clubItems}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏛️</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">De Socios</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.memberItems}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <p className="text-sm text-gray-600">Propietarios</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.uniqueOwners + 1}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Búsqueda */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, descripción o ID..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <svg
                    className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filtro por tipo */}
                <select
                  value={selectedType}
                  onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Todos los tipos</option>
                  {filters?.gameTypes.map(type => (
                    <option key={type} value={type}>{gameTypeIcons[type]} {gameTypeLabels[type]}</option>
                  ))}
                </select>

                {/* Filtro por condición */}
                <select
                  value={selectedCondition}
                  onChange={(e) => { setSelectedCondition(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Todas las condiciones</option>
                  {filters?.conditions.map(condition => (
                    <option key={condition} value={condition}>{conditionLabels[condition]}</option>
                  ))}
                </select>

                {/* Filtro por propietario */}
                <select
                  value={selectedOwner}
                  onChange={(e) => { setSelectedOwner(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Todos los propietarios</option>
                  {filters?.owners.map(owner => (
                    <option key={owner} value={owner}>
                      🏛️ {getOwnerDisplayName(owner === 'club' ? null : owner)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de items por página */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Mostrar:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value={10}>10 por página</option>
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                    <option value={-1}>Todos ({totalItems})</option>
                  </select>
                </div>
                {totalItems > 0 && (
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} juegos
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de juegos */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12 text-gray-500">
                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron juegos</h3>
                <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-4 mb-3">
                      {/* Miniatura del juego */}
                      <div className="flex-shrink-0">
                        {item.gameThumbnail ? (
                          <img
                            src={item.gameThumbnail}
                            alt={item.name}
                            className="w-24 h-24 object-contain rounded-md border border-gray-200 bg-white"
                          />
                        ) : (
                          <div className="w-24 h-24 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                            <span className="text-4xl">{gameTypeIcons[item.gameType]}</span>
                          </div>
                        )}
                      </div>

                      {/* Información del juego */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">{item.internalId}</p>
                            <p className="text-xs text-gray-500">{gameTypeLabels[item.gameType]}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${conditionColors[item.condition]}`}>
                            {conditionLabels[item.condition]}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{item.name}</h3>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    )}

                    {item.notes && (
                      <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <strong>Nota:</strong> {item.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-lg">🏛️</span>
                        <span className="text-xs font-medium">{getOwnerDisplayName(item.ownerEmail)}</span>
                      </div>

                      {item.bggId && (
                        <button
                          onClick={() => setSelectedGameId(item.bggId)}
                          className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          Ver detalle
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {/* Sección informativa */}
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">Acerca de la Ludoteca</h4>
                  <p className="text-sm text-blue-800">
                    La ludoteca del club es un catálogo de todos los juegos que el club y los socios ponen a disposición.
                    Aquí podrás ver qué juegos están disponibles, quién es su propietario y sus características principales.
                    Si deseas aportar tus juegos a la ludoteca, contacta con la junta directiva.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalle del juego */}
      {selectedGameId && (
        <GameDetailModal
          gameId={selectedGameId}
          isOpen={!!selectedGameId}
          onClose={() => setSelectedGameId(null)}
        />
      )}
    </Layout>
  );
}
