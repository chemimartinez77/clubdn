import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axios';
import { displayName } from '../../utils/displayName';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profile?: { nick?: string | null; avatar?: string | null } | null;
  };
}

interface Props {
  eventId: string;
  canWrite: boolean;
  currentUserId: string;
  isChatClosed: boolean;
}

export default function EventChat({ eventId, canWrite, currentUserId, isChatClosed }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['eventMessages', eventId],
    queryFn: async () => {
      const res = await api.get(`/api/events/${eventId}/messages`);
      return res.data.data ?? [];
    },
    enabled: isActive,
    refetchInterval: isActive ? 10_000 : false,
  });

  useEffect(() => {
    if (isActive) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isActive]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/api/events/${eventId}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventMessages', eventId] });
      setText('');
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isActive) {
    return (
      <div className="flex items-center justify-center py-6">
        <button
          onClick={() => setIsActive(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Iniciar chat del evento
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '360px', minHeight: '120px' }}>
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)] text-center py-4">
            Sé el primero en escribir algo
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user.id === currentUserId;
            const name = displayName(msg.user.name, msg.user.profile?.nick);
            const avatar = msg.user.profile?.avatar;
            const time = new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={msg.id} className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {avatar ? (
                  <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isOwn && (
                    <span className="text-xs text-[var(--color-textSecondary)] font-medium">{name}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm break-words ${isOwn ? 'bg-[var(--color-primary)] text-white rounded-tr-sm' : 'bg-[var(--color-tableRowHover)] text-[var(--color-text)] rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-[var(--color-textSecondary)]">{time}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isChatClosed ? (
        <p className="text-xs text-[var(--color-textSecondary)] text-center mt-3 py-2 border-t border-[var(--color-inputBorder)]">
          El chat está cerrado (han pasado más de 3h desde que terminó el evento)
        </p>
      ) : canWrite ? (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-inputBorder)]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            maxLength={500}
            className="flex-1 resize-none px-3 py-2 text-sm rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
            aria-label="Enviar mensaje"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
