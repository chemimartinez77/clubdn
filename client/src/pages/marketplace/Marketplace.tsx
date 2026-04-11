// client/src/pages/marketplace/Marketplace.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/axios';
import type { MarketplaceListing, MarketplaceFilters, MarketplaceListingsResponse, MarketplaceCategory } from '../../types/marketplace';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../types/marketplace';
import type { ApiResponse } from '../../types/auth';

const EMPTY_FILTERS: MarketplaceFilters = {
  q: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
};

const SORT_OPTIONS: { label: string; sortBy: MarketplaceFilters['sortBy']; sortDir: 'asc' | 'desc' }[] = [
  { label: 'Más recientes', sortBy: 'createdAt', sortDir: 'desc' },
  { label: 'Más antiguos', sortBy: 'createdAt', sortDir: 'asc' },
  { label: 'Precio: menor a mayor', sortBy: 'price', sortDir: 'asc' },
  { label: 'Precio: mayor a menor', sortBy: 'price', sortDir: 'desc' },
  { label: 'Nombre A–Z', sortBy: 'title', sortDir: 'asc' },
  { label: 'Nombre Z–A', sortBy: 'title', sortDir: 'desc' },
];

export default function Marketplace() {
  const [filters, setFilters] = useState<MarketplaceFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  params.set('sortBy', filters.sortBy);
  params.set('sortDir', filters.sortDir);
  params.set('page', String(page));
  params.set('pageSize', '20');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', 'listings', filters, page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MarketplaceListingsResponse>>(`/api/marketplace/listings?${params}`);
      return res.data.data!;
    },
  });

  const listings = data?.listings ?? [];
  const pagination = data?.pagination;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = SORT_OPTIONS[parseInt(e.target.value)];
    if (opt) setFilters(f => ({ ...f, sortBy: opt.sortBy, sortDir: opt.sortDir }));
    setPage(1);
  };

  const currentSortIndex = SORT_OPTIONS.findIndex(
    o => o.sortBy === filters.sortBy && o.sortDir === filters.sortDir
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Mercadillo</h1>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">
              Compra y vende material del hobby entre miembros del club
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/mercadillo/mis-anuncios"
              className="px-4 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
            >
              Mis anuncios
            </Link>
            <Link
              to="/mercadillo/conversaciones"
              className="px-4 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
            >
              Conversaciones
            </Link>
            <Link
              to="/mercadillo/nuevo"
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              + Publicar anuncio
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar anuncios..."
            value={filters.q}
            onChange={e => { setFilters(f => ({ ...f, q: e.target.value })); setPage(1); }}
            className="flex-1 px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
          />
          <select
            value={filters.category}
            onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
          >
            <option value="">Todas las categorías</option>
            {(Object.entries(CATEGORY_LABELS) as [MarketplaceCategory, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Precio mín."
              value={filters.minPrice}
              onChange={e => { setFilters(f => ({ ...f, minPrice: e.target.value })); setPage(1); }}
              className="w-28 px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
            />
            <input
              type="number"
              placeholder="Precio máx."
              value={filters.maxPrice}
              onChange={e => { setFilters(f => ({ ...f, maxPrice: e.target.value })); setPage(1); }}
              className="w-28 px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
            />
          </div>
          <select
            value={currentSortIndex >= 0 ? currentSortIndex : 0}
            onChange={handleSortChange}
            className="px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
          >
            {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
          </select>
        </div>

        {/* Listado */}
        {isLoading ? (
          <div className="text-center py-16 text-[var(--color-textSecondary)]">Cargando anuncios...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-textSecondary)]">
            <p className="text-lg font-medium mb-2">No hay anuncios disponibles</p>
            <p className="text-sm">Sé el primero en publicar algo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg disabled:opacity-40 hover:bg-[var(--color-tableRowHover)]"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-[var(--color-textSecondary)]">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg disabled:opacity-40 hover:bg-[var(--color-tableRowHover)]"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const thumb = listing.images[0];
  return (
    <Link
      to={`/mercadillo/${listing.id}`}
      className="block bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      {thumb ? (
        <img src={thumb} alt={listing.title} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-[var(--color-tableRowHover)] flex items-center justify-center text-[var(--color-textSecondary)] text-sm">
          Sin imagen
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-[var(--color-text)] text-sm leading-tight line-clamp-2">{listing.title}</h3>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[listing.status]}`}>
            {STATUS_LABELS[listing.status]}
          </span>
        </div>
        <p className="text-xs text-[var(--color-textSecondary)] mb-2">{CATEGORY_LABELS[listing.category]}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-[var(--color-primary)]">{Number(listing.price).toFixed(2)}€</span>
          <span className="text-xs text-[var(--color-textSecondary)]">{listing.author.name}</span>
        </div>
      </div>
    </Link>
  );
}
