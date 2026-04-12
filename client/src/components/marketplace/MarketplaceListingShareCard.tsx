import { CATEGORY_LABELS, STATUS_LABELS } from '../../types/marketplace';
import type { MarketplaceListing } from '../../types/marketplace';

interface MarketplaceListingShareCardProps {
  listing: MarketplaceListing;
  includeExtraImages: boolean;
}

export default function MarketplaceListingShareCard({
  listing,
  includeExtraImages,
}: MarketplaceListingShareCardProps) {
  const primaryImage = listing.images[0];
  const extraImages = includeExtraImages ? listing.images.slice(1) : [];

  return (
    <div
      className="w-[720px] max-w-full rounded-[28px] overflow-hidden border border-[var(--color-cardBorder)] shadow-2xl"
      style={{
        background:
          'linear-gradient(180deg, var(--color-cardBackground) 0%, color-mix(in srgb, var(--color-cardBackground) 86%, var(--color-background)) 100%)',
        color: 'var(--color-text)',
      }}
    >
      <div className="px-8 pt-8 pb-5 border-b border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)]/60">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)] mb-3">
          Club Dreadnought · Mercadillo
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-4xl font-bold leading-tight break-words">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)]">
                {CATEGORY_LABELS[listing.category]}
              </span>
              <span className="px-3 py-1 rounded-full bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)]">
                {STATUS_LABELS[listing.status]}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-textSecondary)] mb-1">
              Precio
            </div>
            <div className="text-4xl font-bold text-[var(--color-primary)]">
              {Number(listing.price).toFixed(2)} €
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="rounded-[24px] overflow-hidden bg-[var(--color-tableRowHover)] border border-[var(--color-cardBorder)]">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={listing.title}
              className="w-full h-[420px] object-contain bg-[var(--color-tableRowHover)]"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-[420px] flex items-center justify-center text-[var(--color-textSecondary)] text-lg">
              Sin imagen principal
            </div>
          )}
        </div>

        {listing.description && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-textSecondary)]">
              Descripción
            </h2>
            <p className="text-[19px] leading-relaxed whitespace-pre-line break-words">
              {listing.description}
            </p>
          </div>
        )}

        {listing.contactExtra && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-textSecondary)]">
              Contacto adicional
            </h2>
            <p className="text-[18px] leading-relaxed break-words">{listing.contactExtra}</p>
          </div>
        )}

        {extraImages.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-textSecondary)]">
              Imágenes adicionales
            </h2>
            <div className="space-y-4">
              {extraImages.map((imageSrc, index) => (
                <div
                  key={`${imageSrc}-${index}`}
                  className="rounded-2xl overflow-hidden border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] p-3"
                >
                  <img
                    src={imageSrc}
                    alt=""
                    className="w-full max-h-[520px] object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
