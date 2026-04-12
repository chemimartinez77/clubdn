// client/src/pages/marketplace/MarketplaceChat.tsx
import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_LABELS, CANCELLATION_REASONS } from '../../types/marketplace';
import type { MarketplaceConversationDetail, MarketplaceMessage, MarketplaceOffer, CancellationReason } from '../../types/marketplace';
import type { ApiResponse } from '../../types/auth';

interface ConversationResponse {
  conversation: MarketplaceConversationDetail & {
    listing: MarketplaceConversationDetail['listing'] & { authorId: string };
  };
  isSeller: boolean;
  isBuyer: boolean;
}

export default function MarketplaceChat() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [msgBody, setMsgBody] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason | ''>('');
  const [cancelNote, setCancelNote] = useState('');
  const [actionError, setActionError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<ConversationResponse>({
    queryKey: ['marketplace', 'conversation', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ConversationResponse>>(`/api/marketplace/conversations/${id}`);
      return res.data.data!;
    },
    refetchInterval: 15000,
  });

  // Marcar como leído al entrar y cuando llegan mensajes nuevos
  useEffect(() => {
    if (!id) return;
    api.post(`/api/marketplace/conversations/${id}/read`).catch(() => {});
    // Invalidar la lista de conversaciones para actualizar el globo
    queryClient.invalidateQueries({ queryKey: ['marketplace', 'conversations'] });
  }, [id, data?.conversation.messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.conversation.messages.length]);

  const sendMsgMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/marketplace/conversations/${id}/messages`, { body: msgBody.trim() });
    },
    onSuccess: () => {
      setMsgBody('');
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'conversation', id] });
    },
  });

  const offerMutation = useMutation({
    mutationFn: async (amount: string) => {
      await api.post(`/api/marketplace/conversations/${id}/offers`, { amount: parseFloat(amount) });
    },
    onSuccess: () => {
      setOfferAmount('');
      setShowOfferForm(false);
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'conversation', id] });
    },
    onError: (err: any) => setActionError(err?.response?.data?.message || 'Error al enviar oferta'),
  });

  const respondOfferMutation = useMutation({
    mutationFn: async ({ offerId, action, counterAmount }: { offerId: string; action: string; counterAmount?: string }) => {
      await api.patch(`/api/marketplace/conversations/${id}/offers/${offerId}`, {
        action,
        ...(counterAmount ? { counterAmount: parseFloat(counterAmount) } : {}),
      });
    },
    onSuccess: () => {
      setShowCounterForm(false);
      setCounterAmount('');
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'conversation', id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing'] });
    },
    onError: (err: any) => setActionError(err?.response?.data?.message || 'Error al responder oferta'),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/marketplace/conversations/${id}/cancel`, {
        reason: cancelReason,
        note: cancelNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      setShowCancelForm(false);
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'conversation', id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing'] });
    },
    onError: (err: any) => setActionError(err?.response?.data?.message || 'Error al cancelar'),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-16 text-[var(--color-textSecondary)]">Cargando conversación...</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-16 text-[var(--color-textSecondary)]">Conversación no disponible</div>
      </Layout>
    );
  }

  const { conversation, isSeller, isBuyer } = data;
  const { listing } = conversation;
  const otherParty = isSeller ? conversation.buyer : listing.author;
  const pendingOffer = conversation.offers.find(o => o.status === 'PENDIENTE');
  const isReserved = listing.status === 'RESERVADO';
  const canMakeOffer = isBuyer && listing.status === 'PUBLICADO' && !listing.isArchived && !pendingOffer;
  const canRespondOffer = isSeller && pendingOffer;
  const canCancelReservation = isReserved && (isSeller || isBuyer);
  const canChat = !listing.isArchived && listing.status !== 'VENDIDO';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-8rem)]">
        {/* Cabecera */}
        <div className="bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-xl p-4 mb-4 flex gap-3 items-center shrink-0">
          {listing.images[0] && (
            <img src={listing.images[0]} alt={listing.title} className="w-14 h-14 object-cover rounded-lg shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <Link
              to={`/mercadillo/${listing.id}`}
              className="font-semibold text-[var(--color-text)] hover:underline line-clamp-1"
            >
              {listing.title}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-[var(--color-primary)]">{Number(listing.price).toFixed(2)} €</span>
              <span className="text-xs text-[var(--color-textSecondary)]">{STATUS_LABELS[listing.status]}</span>
              {listing.isArchived && <span className="text-xs text-amber-600">· Retirado</span>}
            </div>
            <p className="text-xs text-[var(--color-textSecondary)]">
              {isSeller ? 'Comprador:' : 'Vendedor:'} <span className="font-medium">{otherParty.name}</span>
            </p>
          </div>
        </div>

        {/* Mensajes y ofertas */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {[...conversation.messages, ...conversation.offers]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(item => 'body' in item
              ? <MessageBubble key={`msg-${item.id}`} msg={item as MarketplaceMessage} userId={userId} />
              : <OfferBubble key={`offer-${item.id}`} offer={item as MarketplaceOffer} userId={userId} />
            )
          }
          <div ref={bottomRef} />
        </div>

        {/* Acciones sobre oferta pendiente (vendedor) */}
        {canRespondOffer && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 shrink-0">
            <p className="text-sm font-medium text-amber-900 mb-2">
              Oferta recibida: <span className="font-bold">{Number(pendingOffer.amount).toFixed(2)} €</span>
            </p>
            {actionError && <p className="text-xs text-red-600 mb-2">{actionError}</p>}
            {!showCounterForm ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setActionError(''); respondOfferMutation.mutate({ offerId: pendingOffer.id, action: 'ACEPTADA' }); }}
                  disabled={respondOfferMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => { setActionError(''); respondOfferMutation.mutate({ offerId: pendingOffer.id, action: 'RECHAZADA' }); }}
                  disabled={respondOfferMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => setShowCounterForm(true)}
                  className="px-3 py-1.5 text-sm border border-amber-400 text-amber-800 rounded-lg hover:bg-amber-100"
                >
                  Contraoferta
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={counterAmount}
                  onChange={e => setCounterAmount(e.target.value)}
                  placeholder="Importe contraoferta..."
                  min="0.01"
                  step="0.01"
                  className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg bg-white"
                />
                <button
                  onClick={() => respondOfferMutation.mutate({ offerId: pendingOffer.id, action: 'CONTRAOFERTA', counterAmount })}
                  disabled={!counterAmount || respondOfferMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg disabled:opacity-50"
                >
                  Enviar
                </button>
                <button onClick={() => { setShowCounterForm(false); setCounterAmount(''); }} className="text-sm text-[var(--color-textSecondary)]">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancelar reserva */}
        {canCancelReservation && !showCancelForm && (
          <div className="mb-3 shrink-0">
            <button
              onClick={() => { setShowCancelForm(true); setActionError(''); }}
              className="w-full px-4 py-2 text-sm border border-amber-400 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors"
            >
              Cancelar reserva
            </button>
          </div>
        )}
        {showCancelForm && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 shrink-0">
            <p className="text-sm font-medium text-amber-900 mb-2">Motivo de cancelación</p>
            {actionError && <p className="text-xs text-red-600 mb-2">{actionError}</p>}
            <select
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value as CancellationReason)}
              className="w-full px-3 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg bg-white mb-2"
            >
              <option value="">Seleccionar motivo...</option>
              {CANCELLATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder="Nota adicional (opcional)..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg bg-white resize-none mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCancelForm(false); setCancelReason(''); setCancelNote(''); }}
                className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)]"
              >
                Volver
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={!cancelReason || cancelMutation.isPending}
                className="flex-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        )}

        {/* Hacer oferta (comprador) */}
        {canMakeOffer && (
          <div className="mb-3 shrink-0">
            {!showOfferForm ? (
              <button
                onClick={() => setShowOfferForm(true)}
                className="w-full px-4 py-2 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                Hacer oferta
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={offerAmount}
                  onChange={e => setOfferAmount(e.target.value)}
                  placeholder="Importe de la oferta..."
                  min="0.01"
                  step="0.01"
                  className="flex-1 px-3 py-2 text-sm border border-[var(--color-inputBorder)] rounded-xl bg-[var(--color-cardBackground)]"
                />
                <button
                  onClick={() => offerMutation.mutate(offerAmount)}
                  disabled={!offerAmount || offerMutation.isPending}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-xl disabled:opacity-50"
                >
                  Enviar
                </button>
                <button
                  onClick={() => { setShowOfferForm(false); setOfferAmount(''); }}
                  className="px-3 py-2 text-sm border border-[var(--color-inputBorder)] rounded-xl text-[var(--color-textSecondary)]"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {/* Caja de mensaje */}
        {canChat && (
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && msgBody.trim()) { e.preventDefault(); sendMsgMutation.mutate(); } }}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 border border-[var(--color-inputBorder)] rounded-xl bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
            />
            <button
              onClick={() => sendMsgMutation.mutate()}
              disabled={!msgBody.trim() || sendMsgMutation.isPending}
              className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              Enviar
            </button>
          </div>
        )}
        {!canChat && (
          <p className="text-center text-sm text-[var(--color-textSecondary)] py-2 shrink-0">
            {listing.isArchived ? 'El anuncio ha sido retirado.' : 'Esta venta ha concluido.'}
          </p>
        )}
      </div>
    </Layout>
  );
}

function MessageBubble({ msg, userId }: { msg: MarketplaceMessage; userId?: string }) {
  const isMe = msg.sender.id === userId;
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[var(--color-primary)] text-white rounded-tr-sm' : 'bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] text-[var(--color-text)] rounded-tl-sm'}`}>
        {!isMe && <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender.name}</p>}
        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-[var(--color-textSecondary)]'}`}>
          {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {new Date(msg.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </p>
      </div>
    </div>
  );
}

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  CONTRAOFERTA: 'Contraoferta',
};

const OFFER_STATUS_COLOR: Record<string, string> = {
  PENDIENTE: 'border-amber-300 bg-amber-50 text-amber-900',
  ACEPTADA: 'border-green-300 bg-green-50 text-green-900',
  RECHAZADA: 'border-red-200 bg-red-50 text-red-900',
  CANCELADA: 'border-gray-200 bg-gray-50 text-gray-600',
  CONTRAOFERTA: 'border-blue-200 bg-blue-50 text-blue-900',
};

function OfferBubble({ offer, userId }: { offer: MarketplaceOffer; userId?: string }) {
  const isMe = offer.proposedBy.id === userId;
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl border px-4 py-2.5 ${OFFER_STATUS_COLOR[offer.status] ?? 'border-gray-200 bg-gray-50'}`}>
        <p className="text-xs font-semibold mb-0.5">
          {isMe ? 'Tu oferta' : `Oferta de ${offer.proposedBy.name}`}
        </p>
        <p className="text-base font-bold">{Number(offer.amount).toFixed(2)} €</p>
        <p className="text-xs mt-0.5">{OFFER_STATUS_LABEL[offer.status]}</p>
      </div>
    </div>
  );
}
