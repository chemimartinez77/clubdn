// client/src/pages/marketplace/MarketplaceListing.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import InfoTooltip from '../../components/ui/InfoTooltip';
import MarketplaceListingShareCard from '../../components/marketplace/MarketplaceListingShareCard';
import { api } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../types/marketplace';
import type { MarketplaceListing, MarketplaceConversationSummary } from '../../types/marketplace';
import type { ApiResponse } from '../../types/auth';

export default function MarketplaceListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [imageIndex, setImageIndex] = useState(0);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [includeExtraImages, setIncludeExtraImages] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const recordedViewForIdRef = useRef<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);

  const { data: listing, isLoading, error } = useQuery<MarketplaceListing>({
    queryKey: ['marketplace', 'listing', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ listing: MarketplaceListing }>>(`/api/marketplace/listings/${id}`);
      return res.data.data!.listing;
    },
  });

  // Obtener conversaciones para mostrar globo de no leídos (vendedor: suma de todos los hilos; comprador: su hilo)
  const isOwnerCheck = !!user?.id && listing?.author.id === user.id;
  const isBuyerCheck = !!user?.id && !isOwnerCheck;
  const { data: convData } = useQuery<{ conversations: MarketplaceConversationSummary[] }>({
    queryKey: ['marketplace', 'conversations'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ conversations: MarketplaceConversationSummary[] }>>('/api/marketplace/conversations');
      return res.data.data!;
    },
    enabled: isOwnerCheck || isBuyerCheck,
    staleTime: 30000,
  });
  const convForThisListing = (convData?.conversations ?? []).filter(c => c.listingId === id);
  const totalUnread = convForThisListing.reduce((sum, c) => sum + c.unreadCount, 0);
  // Para el comprador: la conversación propia (si existe)
  const buyerConv = isBuyerCheck ? convForThisListing.find(c => c.buyerId === user?.id) : undefined;
  const buyerUnread = buyerConv?.unreadCount ?? 0;

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/api/marketplace/listings/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      navigate('/mercadillo/mis-anuncios');
    },
  });

  const openConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/marketplace/listings/${id}/conversations`);
      return res.data.data.conversation;
    },
    onSuccess: (conv) => {
      navigate(`/mercadillo/conversaciones/${conv.id}`);
    },
  });

  const recordViewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ viewsCount: number; counted: boolean }>>(`/api/marketplace/listings/${id}/view`);
      return res.data.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<MarketplaceListing>(['marketplace', 'listing', id], (prev) => (
        prev ? { ...prev, viewsCount: data.viewsCount } : prev
      ));
    },
  });

  useEffect(() => {
    if (!id || !listing) return;
    if (recordedViewForIdRef.current === id) return;

    recordedViewForIdRef.current = id;

    if (user?.id && listing.author.id !== user.id) {
      recordViewMutation.mutate();
    }
  }, [id, listing, user?.id]);

  const handleOpenDownloadModal = () => {
    if (!listing) return;
    setIncludeExtraImages(false);
    setIsDownloadModalOpen(true);
  };

  const handleDownloadPng = async () => {
    if (!listing) return;
    if (!shareCardRef.current) return;

    try {
      setIsDownloadingPng(true);
      const safeBaseName = listing.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'anuncio';

      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#173129',
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `mercadillo-clubdn-${safeBaseName}.png`;
      link.click();
    } finally {
      setIsDownloadingPng(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-16 text-[var(--color-textSecondary)]">Cargando anuncio...</div>
      </Layout>
    );
  }

  if (error || !listing) {
    return (
      <Layout>
        <div className="text-center py-16 text-[var(--color-textSecondary)]">
          <p className="text-lg font-medium mb-2">Anuncio no disponible</p>
          <Link to="/mercadillo" className="text-[var(--color-primary)] text-sm hover:underline">Volver al mercadillo</Link>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === listing.author.id;
  const canContact = !isOwner && listing.status === 'PUBLICADO' && !listing.isArchived;
  const canEdit = isOwner && listing.status === 'PUBLICADO' && !listing.isArchived;
  const canArchive = isOwner && !listing.isArchived && listing.status !== 'VENDIDO';

  const thumb = listing.images[imageIndex];
  const downloadPngHelpText = `Comparte tu anuncio bajándote la imagen y subiéndola a las redes que quieras.

Se generará una ficha visual con la imagen principal del anuncio, el precio, el estado, la descripción completa y el contacto adicional si lo has añadido.

Si tu anuncio tiene más fotos, podrás decidir en la siguiente ventana si quieres incluirlas también debajo de la imagen principal antes de descargar el PNG.`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-[var(--color-textSecondary)] mb-4">
          <Link to="/mercadillo" className="hover:text-[var(--color-primary)]">Mercadillo</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-text)]">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Imágenes */}
          <div>
            {listing.images.length > 0 ? (
              <>
                <div className="w-full aspect-square bg-[var(--color-tableRowHover)] rounded-xl overflow-hidden mb-2">
                  <img
                    src={thumb}
                    alt={listing.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                {listing.images.length > 1 && (
                  <div className="flex gap-2">
                    {listing.images.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setImageIndex(i)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === imageIndex ? 'border-[var(--color-primary)]' : 'border-transparent'}`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-square bg-[var(--color-tableRowHover)] rounded-xl flex items-center justify-center text-[var(--color-textSecondary)]">
                Sin imagen
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h1 className="text-xl font-bold text-[var(--color-text)] leading-tight">{listing.title}</h1>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[listing.status]}`}>
                  {STATUS_LABELS[listing.status]}
                </span>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">{CATEGORY_LABELS[listing.category]}</p>
            </div>

            <p className="text-3xl font-bold text-[var(--color-primary)]">{Number(listing.price).toFixed(2)} €</p>

            {listing.description && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Descripción</h2>
                <p className="text-sm text-[var(--color-text)] whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>
            )}

            {listing.contactExtra && (
              <div className="text-sm">
                <span className="font-medium text-[var(--color-text)]">Contacto adicional: </span>
                <span className="text-[var(--color-textSecondary)]">{listing.contactExtra}</span>
              </div>
            )}

            <div className="text-sm text-[var(--color-textSecondary)]">
              Publicado por <span className="font-medium text-[var(--color-text)]">{listing.author.name}</span>
              {' · '}
              {new Date(listing.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div className="text-sm text-[var(--color-textSecondary)]">
              👁️ {listing.viewsCount}
            </div>

            {listing.isArchived && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                Este anuncio está retirado por el vendedor.
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenDownloadModal}
                  className="flex-1"
                >
                  Descargar PNG
                </Button>
                <InfoTooltip
                  ariaLabel="Información sobre Descargar PNG"
                  content={downloadPngHelpText}
                  tooltipClassName="max-w-[280px] text-left"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-inputBorder)] bg-[var(--color-cardBackground)] text-sm font-bold text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors">
                    ?
                  </span>
                </InfoTooltip>
              </div>
              {canContact && (
                <button
                  onClick={() => openConversationMutation.mutate()}
                  disabled={openConversationMutation.isPending}
                  className="w-full px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {openConversationMutation.isPending ? 'Abriendo chat...' : 'Contactar con el vendedor'}
                  {buyerUnread > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 bg-white text-[var(--color-primary)] text-xs font-bold rounded-full flex items-center justify-center">
                      {buyerUnread > 99 ? '99+' : buyerUnread}
                    </span>
                  )}
                </button>
              )}
              {isOwner && (
                <Link
                  to={`/mercadillo/conversaciones`}
                  className="w-full px-4 py-2.5 border border-[var(--color-inputBorder)] rounded-lg text-sm text-center text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors relative flex items-center justify-center gap-2"
                >
                  Ver conversaciones de este anuncio
                  {totalUnread > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </Link>
              )}
              {canEdit && (
                <Link
                  to={`/mercadillo/${listing.id}/editar`}
                  className="w-full px-4 py-2.5 border border-[var(--color-inputBorder)] rounded-lg text-sm text-center text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                >
                  Editar anuncio
                </Link>
              )}
              {canArchive && !archiveConfirm && (
                <button
                  onClick={() => setArchiveConfirm(true)}
                  className="w-full px-4 py-2.5 border border-[var(--color-inputBorder)] rounded-lg text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                >
                  Retirar anuncio
                </button>
              )}
              {archiveConfirm && (
                <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 text-sm">
                  <p className="text-amber-800 mb-2">¿Seguro que quieres retirar este anuncio?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setArchiveConfirm(false)}
                      className="flex-1 px-3 py-1.5 border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => archiveMutation.mutate()}
                      disabled={archiveMutation.isPending}
                      className="flex-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {archiveMutation.isPending ? 'Retirando...' : 'Sí, retirar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isDownloadModalOpen && listing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-2xl">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--color-cardBorder)]">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Descargar PNG</h2>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Genera una ficha visual del anuncio lista para compartir manualmente.
                </p>
              </div>
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)] text-2xl leading-none"
                aria-label="Cerrar modal de descarga PNG"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 border-b border-[var(--color-cardBorder)]">
              {listing.images.length > 1 ? (
                <label className="inline-flex items-center gap-3 text-sm text-[var(--color-text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExtraImages}
                    onChange={(e) => setIncludeExtraImages(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--color-inputBorder)]"
                  />
                  Incluir imágenes adicionales debajo de la principal
                </label>
              ) : (
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Este anuncio solo tiene una imagen, así que el PNG incluirá únicamente la principal.
                </p>
              )}
            </div>

            <div className="max-h-[60vh] overflow-auto px-6 py-6 bg-[var(--color-background)]">
              <div className="flex justify-center">
                <div ref={shareCardRef}>
                  <MarketplaceListingShareCard
                    listing={listing}
                    includeExtraImages={includeExtraImages}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-cardBorder)]">
              <Button
                variant="ghost"
                onClick={() => setIsDownloadModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDownloadPng}
                isLoading={isDownloadingPng}
              >
                Descargar PNG
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
