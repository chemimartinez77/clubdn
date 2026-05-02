import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { api } from '../api/axios';
import { useDebounce } from '../hooks/useDebounce';
import { displayName } from '../utils/displayName';
import type { ApiResponse } from '../types/auth';
import type {
  PhotoLibraryParticipantOption,
  PhotoLibraryPhoto,
  PhotoLibraryResponse
} from '../types/photoLibrary';

const PAGE_SIZE = 24;

function formatEventDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatUploadDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function buildSearchParams(next: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();

  Object.entries(next).forEach(([key, value]) => {
    if (value && value.trim()) {
      params.set(key, value);
    }
  });

  return params;
}

export default function PhotoLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [dateFromInput, setDateFromInput] = useState(searchParams.get('dateFrom') ?? '');
  const [dateToInput, setDateToInput] = useState(searchParams.get('dateTo') ?? '');
  const [participantInput, setParticipantInput] = useState(searchParams.get('participantName') ?? '');
  const [selectedParticipant, setSelectedParticipant] = useState<PhotoLibraryParticipantOption | null>(
    searchParams.get('participantUserId')
      ? {
          id: searchParams.get('participantUserId') ?? '',
          name: searchParams.get('participantName') ?? '',
          nick: null,
          avatar: null
        }
      : null
  );
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoLibraryPhoto | null>(null);

  const currentPage = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1);
  const debouncedParticipantInput = useDebounce(participantInput, 250);
  const canSearchParticipants =
    debouncedParticipantInput.trim().length >= 2 &&
    (!selectedParticipant || debouncedParticipantInput !== displayName(selectedParticipant.name, selectedParticipant.nick));

  useEffect(() => {
    setSearchInput(searchParams.get('search') ?? '');
    setDateFromInput(searchParams.get('dateFrom') ?? '');
    setDateToInput(searchParams.get('dateTo') ?? '');
    setParticipantInput(searchParams.get('participantName') ?? '');

    const participantUserId = searchParams.get('participantUserId');
    const participantName = searchParams.get('participantName') ?? '';
    setSelectedParticipant(
      participantUserId
        ? {
            id: participantUserId,
            name: participantName,
            nick: null,
            avatar: null
          }
        : null
      );
    }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['photoLibrary', searchParams.toString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('pageSize', String(PAGE_SIZE));

      const search = searchParams.get('search');
      const bggId = searchParams.get('bggId');
      const participantUserId = searchParams.get('participantUserId');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');

      if (search) params.set('search', search);
      if (bggId) params.set('bggId', bggId);
      if (participantUserId) params.set('participantUserId', participantUserId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await api.get<ApiResponse<PhotoLibraryResponse>>(`/api/event-photos?${params.toString()}`);
      return response.data.data;
    }
  });

  const { data: participantOptions = [] } = useQuery({
    queryKey: ['photoLibraryParticipants', debouncedParticipantInput],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PhotoLibraryParticipantOption[]>>(
        `/api/event-photos/participants/search?q=${encodeURIComponent(debouncedParticipantInput.trim())}`
      );
      return response.data.data || [];
    },
    enabled: canSearchParticipants,
    staleTime: 5 * 60 * 1000
  });

  const photos = data?.photos ?? [];
  const pagination = data?.pagination;
  const hasActiveFilters = ['search', 'participantUserId', 'dateFrom', 'dateTo'].some((key) => !!searchParams.get(key));

  const applyFilters = () => {
    const trimmedSearch = searchInput.trim();
    const trimmedParticipantInput = participantInput.trim();
    const participantLabel = selectedParticipant ? displayName(selectedParticipant.name, selectedParticipant.nick) : '';
    const participantFilter = selectedParticipant && trimmedParticipantInput === participantLabel ? selectedParticipant : null;

    setSearchParams(
      buildSearchParams({
        page: '1',
        search: trimmedSearch || null,
        participantUserId: participantFilter?.id ?? null,
        participantName: participantFilter ? participantLabel : null,
        dateFrom: dateFromInput || null,
        dateTo: dateToInput || null
      })
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setDateFromInput('');
    setDateToInput('');
    setParticipantInput('');
    setSelectedParticipant(null);
    setSearchParams(new URLSearchParams());
  };

  const goToPage = (page: number) => {
    setSearchParams(
      buildSearchParams({
        page: String(page),
        search: searchParams.get('search'),
        participantUserId: searchParams.get('participantUserId'),
        participantName: searchParams.get('participantName'),
        dateFrom: searchParams.get('dateFrom'),
        dateTo: searchParams.get('dateTo')
      })
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Fototeca</h1>
            <p className="mt-1 text-[var(--color-textSecondary)]">
              Explora las fotos compartidas en las partidas del club por juego, participante y fecha.
            </p>
          </div>
          {pagination && (
            <div className="text-sm text-[var(--color-textSecondary)]">
              {pagination.total} {pagination.total === 1 ? 'foto' : 'fotos'} en la fototeca
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <label htmlFor="photo-search" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Buscar
                </label>
                <input
                  id="photo-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Juego, partida o texto de la foto"
                  className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-cardBackground)] px-4 py-2 text-[var(--color-text)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="relative">
                <label htmlFor="photo-participant-filter" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Participante
                </label>
                <input
                  id="photo-participant-filter"
                  type="text"
                  value={participantInput}
                  onChange={(e) => {
                    setParticipantInput(e.target.value);
                    setSelectedParticipant(null);
                  }}
                  placeholder="Busca un miembro"
                  autoComplete="off"
                  className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-cardBackground)] px-4 py-2 text-[var(--color-text)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {canSearchParticipants && participantOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-lg">
                    {participantOptions.map((participant) => (
                      <button
                        key={participant.id}
                        type="button"
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setParticipantInput(displayName(participant.name, participant.nick));
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-tableRowHover)]"
                      >
                        {participant.avatar ? (
                          <img
                            src={participant.avatar}
                            alt={displayName(participant.name, participant.nick)}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-sm font-semibold text-[var(--color-primary)]">
                            {displayName(participant.name, participant.nick).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--color-text)]">
                            {displayName(participant.name, participant.nick)}
                          </p>
                          {participant.nick && (
                            <p className="truncate text-xs text-[var(--color-textSecondary)]">{participant.name}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="photo-date-from" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Fecha desde
                </label>
                <input
                  id="photo-date-from"
                  type="date"
                  value={dateFromInput}
                  onChange={(e) => setDateFromInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-cardBackground)] px-4 py-2 text-[var(--color-text)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="photo-date-to" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Fecha hasta
                </label>
                <input
                  id="photo-date-to"
                  type="date"
                  value={dateToInput}
                  onChange={(e) => setDateToInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-cardBackground)] px-4 py-2 text-[var(--color-text)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {selectedParticipant && (
                  <span className="rounded-full bg-[var(--color-primary-50)] px-3 py-1 text-sm text-[var(--color-primary)]">
                    Participante: {displayName(selectedParticipant.name, selectedParticipant.nick)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={applyFilters}>
                  Aplicar filtros
                </Button>
                <Button variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters && !searchInput && !participantInput && !dateFromInput && !dateToInput}>
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : photos.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <svg className="mx-auto mb-4 h-16 w-16 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg text-[var(--color-text)]">
                {hasActiveFilters ? 'No hay fotos que coincidan con esos filtros.' : 'Aún no hay fotos en la fototeca.'}
              </p>
              <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
                {hasActiveFilters ? 'Prueba con otro juego, participante o rango de fechas.' : 'Las fotos aparecerán aquí cuando se suban desde las partidas.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => {
                const title = photo.event.gameName || photo.event.title;

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhoto(photo)}
                    className="group overflow-hidden rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[var(--color-tableRowHover)]">
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt={photo.caption || title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-2 p-3">
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{title}</p>
                        {photo.event.gameName && (
                          <p className="mt-1 line-clamp-1 text-xs text-[var(--color-textSecondary)]">{photo.event.title}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-textSecondary)]">
                        <span>{formatEventDate(photo.event.date)}</span>
                        <span className="truncate">Abrir</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Página {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title="" size="xl">
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg bg-black">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.event.gameName || selectedPhoto.event.title}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {selectedPhoto.event.gameName || selectedPhoto.event.title}
                </p>
                {selectedPhoto.event.gameName && (
                  <p className="text-sm text-[var(--color-textSecondary)]">{selectedPhoto.event.title}</p>
                )}
                {selectedPhoto.caption && (
                  <p className="text-sm text-[var(--color-text)]">{selectedPhoto.caption}</p>
                )}
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Partida del {formatEventDate(selectedPhoto.event.date)}
                </p>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Subida por {selectedPhoto.uploadedBy.name} el {formatUploadDate(selectedPhoto.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-[var(--color-cardBorder)] px-4 py-2 text-sm font-semibold text-[var(--color-textSecondary)] transition-colors hover:bg-[var(--color-tableRowHover)] hover:text-[var(--color-text)]"
                >
                  Abrir original
                </a>
                <Link
                  to={`/events/${selectedPhoto.event.id}`}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primaryDark)]"
                  onClick={() => setSelectedPhoto(null)}
                >
                  Ir a la partida
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
