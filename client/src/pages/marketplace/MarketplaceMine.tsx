// client/src/pages/marketplace/MarketplaceMine.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/axios';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../types/marketplace';
import type { MarketplaceListing, MarketplaceListingStatus } from '../../types/marketplace';
import type { ApiResponse } from '../../types/auth';
import { useState } from 'react';

const STATUS_TRANSITIONS: Record<MarketplaceListingStatus, MarketplaceListingStatus[]> = {
  PUBLICADO: ['RESERVADO', 'VENDIDO'],
  RESERVADO: ['PUBLICADO', 'VENDIDO'],
  VENDIDO: [],
};

export default function MarketplaceMine() {
  const queryClient = useQueryClient();
  const [statusTarget, setStatusTarget] = useState<Record<string, MarketplaceListingStatus>>({});

  const { data, isLoading } = useQuery<{ listings: MarketplaceListing[] }>({
    queryKey: ['marketplace', 'mine'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ listings: MarketplaceListing[] }>>('/api/marketplace/listings/mine');
      return res.data.data!;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/marketplace/listings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'mine'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/marketplace/listings/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'mine'] });
    },
  });

  const listings = data?.listings ?? [];
  const active = listings.filter(l => !l.isArchived);
  const archived = listings.filter(l => l.isArchived);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Mis anuncios</h1>
          <div className="flex gap-2">
            <Link
              to="/mercadillo"
              className="px-4 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
            >
              Volver al mercadillo
            </Link>
            <Link
              to="/mercadillo/nuevo"
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              + Publicar anuncio
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-[var(--color-textSecondary)]">Cargando...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-textSecondary)]">
            <p className="text-lg font-medium mb-2">Aún no tienes anuncios</p>
            <Link to="/mercadillo/nuevo" className="text-[var(--color-primary)] text-sm hover:underline">Publicar el primero</Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-[var(--color-textSecondary)] uppercase tracking-wide mb-3">Activos ({active.length})</h2>
                <div className="space-y-3">
                  {active.map(listing => (
                    <MineCard
                      key={listing.id}
                      listing={listing}
                      statusTarget={statusTarget[listing.id] as MarketplaceListingStatus | undefined}
                      onStatusTargetChange={(s) => setStatusTarget(prev => ({ ...prev, [listing.id]: s }))}
                      onStatusSave={(status) => statusMutation.mutate({ id: listing.id, status })}
                      onArchive={() => archiveMutation.mutate(listing.id)}
                      isLoading={statusMutation.isPending || archiveMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}
            {archived.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--color-textSecondary)] uppercase tracking-wide mb-3">Retirados ({archived.length})</h2>
                <div className="space-y-3">
                  {archived.map(listing => (
                    <MineCard
                      key={listing.id}
                      listing={listing}
                      statusTarget={undefined}
                      onStatusTargetChange={() => {}}
                      onStatusSave={() => {}}
                      onArchive={() => {}}
                      isLoading={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function MineCard({
  listing,
  statusTarget,
  onStatusTargetChange,
  onStatusSave,
  onArchive,
  isLoading,
}: {
  listing: MarketplaceListing;
  statusTarget: MarketplaceListingStatus | undefined;
  onStatusTargetChange: (s: MarketplaceListingStatus) => void;
  onStatusSave: (s: MarketplaceListingStatus) => void;
  onArchive: () => void;
  isLoading: boolean;
}) {
  const thumb = listing.images[0];
  const transitions = STATUS_TRANSITIONS[listing.status];
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  return (
    <div className="bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-xl overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Miniatura */}
        <Link to={`/mercadillo/${listing.id}`} className="shrink-0">
          {thumb ? (
            <img src={thumb} alt={listing.title} className="w-20 h-20 object-cover rounded-lg" />
          ) : (
            <div className="w-20 h-20 bg-[var(--color-tableRowHover)] rounded-lg flex items-center justify-center text-[var(--color-textSecondary)] text-xs">
              Sin imagen
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/mercadillo/${listing.id}`} className="font-semibold text-[var(--color-text)] text-sm hover:underline line-clamp-1">
              {listing.title}
            </Link>
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[listing.status]}`}>
              {STATUS_LABELS[listing.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">{CATEGORY_LABELS[listing.category]}</p>
          <p className="text-base font-bold text-[var(--color-primary)] mt-1">{Number(listing.price).toFixed(2)} €</p>
        </div>
      </div>

      {/* Acciones (solo activos y no VENDIDO) */}
      {!listing.isArchived && listing.status !== 'VENDIDO' && (
        <div className="border-t border-[var(--color-cardBorder)] px-4 py-2 flex flex-wrap gap-2 items-center">
          {listing.status === 'PUBLICADO' && (
            <Link
              to={`/mercadillo/${listing.id}/editar`}
              className="text-xs px-3 py-1 border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
            >
              Editar
            </Link>
          )}
          {transitions.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={statusTarget || ''}
                onChange={e => onStatusTargetChange(e.target.value as MarketplaceListingStatus)}
                className="text-xs px-2 py-1 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              >
                <option value="">Cambiar estado...</option>
                {transitions.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {statusTarget && (
                <button
                  onClick={() => onStatusSave(statusTarget)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  Aplicar
                </button>
              )}
            </div>
          )}
          {!archiveConfirm ? (
            <button
              onClick={() => setArchiveConfirm(true)}
              className="text-xs px-3 py-1 text-[var(--color-textSecondary)] hover:text-red-600 ml-auto"
            >
              Retirar
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[var(--color-textSecondary)]">¿Retirar anuncio?</span>
              <button onClick={() => setArchiveConfirm(false)} className="text-xs text-[var(--color-textSecondary)] hover:underline">No</button>
              <button
                onClick={onArchive}
                disabled={isLoading}
                className="text-xs px-2 py-0.5 bg-red-500 text-white rounded disabled:opacity-50"
              >
                Sí
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
