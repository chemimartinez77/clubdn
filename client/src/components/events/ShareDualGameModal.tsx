import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import GameSearchModal from './GameSearchModal';
import type { BGGGame } from '../../types/event';

interface ShareDualGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  primaryGame: { id: string; name: string; thumbnail?: string | null };
}

export default function ShareDualGameModal({ isOpen, onClose, eventId, primaryGame }: ShareDualGameModalProps) {
  const [game2, setGame2] = useState<BGGGame | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setGame2(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleShare = async () => {
    if (!game2) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Mensaje 1: solo la imagen de la alternativa (sin texto, WhatsApp genera la preview)
    const msg1 = `${apiBase}/preview/events-bgg/${game2.id}`;

    // Mensaje 2: imagen del juego principal + texto + enlace al detalle
    const eventPreviewUrl = `${apiBase}/preview/events/${eventId}`;
    const msg2 = `*${primaryGame.name} o ${game2.name}*\n\n¿A qué jugamos? Vota tu favorito.\n\nMás info: ${eventPreviewUrl}`;

    // Abrir WhatsApp con el mensaje 1
    window.open(`https://wa.me/?text=${encodeURIComponent(msg1)}`, '_blank');

    // Copiar el mensaje 2 al portapapeles
    try {
      await navigator.clipboard.writeText(msg2);
      setCopied(true);
    } catch {
      // Si falla el clipboard (contexto no seguro), ignorar silenciosamente
    }
  };

  const thumbnailUrl = (url?: string | null) =>
    url ? (url.startsWith('//') ? `https:${url}` : url) : null;

  const whatsappIcon = (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Proponer 2 juegos" size="sm">
        <div className="p-6">
          <div className="space-y-3 mb-5">
            <div>
              <p className="text-xs text-[var(--color-textMuted)] mb-1">Juego principal</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] opacity-70">
                {thumbnailUrl(primaryGame.thumbnail) && (
                  <img src={thumbnailUrl(primaryGame.thumbnail)!} alt="" className="w-8 h-8 object-contain rounded" />
                )}
                {primaryGame.name}
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--color-textMuted)] mb-1">Alternativa</p>
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full text-left px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
              >
                {game2 ? (
                  <span className="flex items-center gap-2">
                    {thumbnailUrl(game2.thumbnail) && (
                      <img src={thumbnailUrl(game2.thumbnail)!} alt="" className="w-8 h-8 object-contain rounded" />
                    )}
                    {game2.name}
                  </span>
                ) : (
                  <span className="text-[var(--color-textMuted)]">Buscar juego alternativo...</span>
                )}
              </button>
            </div>
          </div>

          {copied && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-green-900/30 border border-green-700/50 text-xs text-green-300">
              WhatsApp abierto con la imagen de <strong>{game2?.name}</strong>. El segundo mensaje ya esta copiado — pegalo despues de enviar el primero.
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-textMuted)] hover:text-[var(--color-text)] transition-colors"
            >
              {copied ? 'Cerrar' : 'Cancelar'}
            </button>
            {!copied && (
              <button
                onClick={handleShare}
                disabled={!game2}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {whatsappIcon}
                Compartir en WhatsApp
              </button>
            )}
          </div>
        </div>
      </Modal>

      <GameSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(game) => { setGame2(game); setSearchOpen(false); }}
        title="Seleccionar juego alternativo"
        allowRPGG={false}
      />
    </>
  );
}
