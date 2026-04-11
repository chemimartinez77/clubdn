// client/src/pages/marketplace/MarketplaceConversations.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS } from '../../types/marketplace';
import type { MarketplaceConversationSummary } from '../../types/marketplace';
import type { ApiResponse } from '../../types/auth';

export default function MarketplaceConversations() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery<{ conversations: MarketplaceConversationSummary[] }>({
    queryKey: ['marketplace', 'conversations'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ conversations: MarketplaceConversationSummary[] }>>('/api/marketplace/conversations');
      return res.data.data!;
    },
  });

  const conversations = data?.conversations ?? [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Conversaciones</h1>

        {isLoading ? (
          <div className="text-center py-16 text-[var(--color-textSecondary)]">Cargando...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-textSecondary)]">
            <p className="text-lg font-medium mb-2">Sin conversaciones</p>
            <p className="text-sm">Cuando contactes con un vendedor o alguien contacte contigo, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conv => (
              <ConversationRow key={conv.id} conv={conv} userId={userId} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ConversationRow({ conv, userId }: { conv: MarketplaceConversationSummary; userId?: string }) {
  const isSeller = conv.listing.author.id === userId;
  const otherParty = isSeller ? conv.buyer : conv.listing.author;
  const lastMsg = conv.messages[conv.messages.length - 1];
  const lastOffer = conv.offers[conv.offers.length - 1];
  const thumb = conv.listing.images[0];

  return (
    <Link
      to={`/mercadillo/conversaciones/${conv.id}`}
      className="flex gap-4 bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      {/* Thumb del anuncio */}
      {thumb ? (
        <img src={thumb} alt={conv.listing.title} className="w-14 h-14 object-cover rounded-lg shrink-0" />
      ) : (
        <div className="w-14 h-14 bg-[var(--color-tableRowHover)] rounded-lg shrink-0 flex items-center justify-center text-[var(--color-textSecondary)] text-xs">
          Sin foto
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-[var(--color-text)] text-sm line-clamp-1">{conv.listing.title}</p>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[conv.listing.status]}`}>
            {STATUS_LABELS[conv.listing.status]}
          </span>
        </div>
        <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">
          {isSeller ? 'Comprador:' : 'Vendedor:'} <span className="font-medium">{otherParty.name}</span>
          {' · '}
          {Number(conv.listing.price).toFixed(2)} €
        </p>
        {lastOffer && (
          <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">
            Última oferta: <span className="font-medium">{Number(lastOffer.amount).toFixed(2)} €</span>
          </p>
        )}
        {lastMsg && (
          <p className="text-xs text-[var(--color-textSecondary)] mt-1 line-clamp-1">
            {lastMsg.sender.id === userId ? 'Tú: ' : `${lastMsg.sender.name}: `}
            {lastMsg.body}
          </p>
        )}
        {!lastMsg && !lastOffer && (
          <p className="text-xs text-[var(--color-textSecondary)] italic mt-1">Sin mensajes aún</p>
        )}
      </div>
    </Link>
  );
}
