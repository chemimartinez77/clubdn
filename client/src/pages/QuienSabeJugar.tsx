import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import UserPopover from '../components/ui/UserPopover';
import { api } from '../api/axios';

interface Expert {
  userId: string;
  displayName: string;
  avatar: string | null;
  ludotecaPublica: boolean;
  ownsGame: boolean;
  playCount: number;
  hasAttended: boolean;
}

interface ExpertResponse {
  gameName: string;
  players: Expert[];
}

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)] border border-[var(--color-cardBorder)]">
      {label}
    </span>
  );
}

export default function QuienSabeJugar() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<ExpertResponse>({
    queryKey: ['quienSabeJugar', search],
    queryFn: () => api.get('/api/quien-sabe-jugar', { params: { q: search } }).then((r) => r.data.data),
    enabled: search.length >= 2,
    staleTime: 3 * 60 * 1000,
  });

  const players = data?.players ?? [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">¿Quién sabe jugar?</h1>
        <p className="text-sm text-[var(--color-textSecondary)] mb-6">
          Busca un juego y descubre qué miembros del club lo tienen en su colección o han jugado a él en alguna partida del club.
        </p>

        <div className="mb-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ej: Imperial Steam, Wingspan, Azul..."
            className="w-full px-4 py-2 rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            autoFocus
          />
          {searchInput.length > 0 && searchInput.length < 2 && (
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">Escribe al menos 2 caracteres</p>
          )}
        </div>

        {search.length < 2 && (
          <div className="text-center text-[var(--color-textSecondary)] py-16">
            <p className="text-4xl mb-3">🎲</p>
            <p>Busca un juego para ver quién lo conoce</p>
          </div>
        )}

        {search.length >= 2 && isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {search.length >= 2 && !isLoading && players.length === 0 && (
          <p className="text-center text-[var(--color-textSecondary)] py-12">
            Nadie en el club tiene o ha jugado a un juego llamado "{search}".
          </p>
        )}

        {search.length >= 2 && !isLoading && players.length > 0 && (
          <>
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">
              {players.length} {players.length === 1 ? 'jugador conoce' : 'jugadores conocen'} "{data?.gameName}"
            </p>
            <div className="space-y-2">
              {players.map((player) => {
                const nameEl = (
                  <p className="font-semibold text-[var(--color-text)]">{player.displayName}</p>
                );
                const inner = (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] hover:bg-[var(--color-tableRowHover)] transition-colors">
                    <Avatar name={player.displayName} avatar={player.avatar} />
                    <div className="min-w-0 flex-1">
                      {nameEl}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge label="Tiene el juego" active={player.ownsGame} />
                        <Badge label={`${player.playCount} ${player.playCount === 1 ? 'partida' : 'partidas'} en el club`} active={player.playCount > 0} />
                        <Badge label="Ha asistido a un evento" active={player.hasAttended && player.playCount === 0} />
                      </div>
                    </div>
                  </div>
                );

                return player.ludotecaPublica ? (
                  <UserPopover key={player.userId} userId={player.userId} name={player.displayName} avatar={player.avatar}>
                    <Link to={`/ludotecas-jugadores/${player.userId}`} className="block">
                      {inner}
                    </Link>
                  </UserPopover>
                ) : (
                  <UserPopover key={player.userId} userId={player.userId} name={player.displayName} avatar={player.avatar}>
                    <div className="cursor-pointer">{inner}</div>
                  </UserPopover>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
