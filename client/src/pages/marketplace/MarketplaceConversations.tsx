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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Conversaciones</h1>
          <Link
            to="/mercadillo"
            className="px-4 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
          >
            Volver al mercadillo
          </Link>
        </div>

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
  const hasUnread = conv.unreadCount > 0;

  return (
    <Link
      to={`/mercadillo/conversaciones/${conv.id}`}
      className={`flex gap-4 bg-[var(--color-cardBackground)] border rounded-xl p-4 hover:shadow-md transition-shadow ${hasUnread ? 'border-[var(--color-primary)]' : 'border-[var(--color-cardBorder)]'}`}
    >
      {/* Thumb del anuncio */}
      <div className="relative shrink-0">
        {thumb ? (
          <img src={thumb} alt={conv.listing.title} className="w-14 h-14 object-cover rounded-lg" />
        ) : (
          <div className="w-14 h-14 bg-[var(--color-tableRowHover)] rounded-lg flex items-center justify-center text-[var(--color-textSecondary)] text-xs">
            Sin foto
          </div>
        )}
        {hasUnread && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded-full flex items-center justify-center">
            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm line-clamp-1 ${hasUnread ? 'font-bold text-[var(--color-text)]' : 'font-semibold text-[var(--color-text)]'}`}>
            {conv.listing.title}
          </p>
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
          <p className={`text-xs mt-1 line-clamp-1 ${hasUnread ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-textSecondary)]'}`}>
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
