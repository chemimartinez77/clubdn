// client/src/components/events/EventPhotoGallery.tsx
import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axios';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { ApiResponse } from '../../types/auth';

interface EventPhoto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
  };
}

interface EventPhotoGalleryProps {
  eventId: string;
  canUpload: boolean; // true si el usuario es SOCIO/COLABORADOR registrado
  currentUserId?: string;
  isAdmin?: boolean;
}

const MAX_PHOTOS = 8;

export default function EventPhotoGallery({
  eventId,
  canUpload,
  currentUserId,
  isAdmin = false
}: EventPhotoGalleryProps) {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');

  // Fetch photos
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['eventPhotos', eventId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<EventPhoto[]>>(`/api/events/${eventId}/photos`);
      return response.data.data || [];
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      const response = await api.post(`/api/events/${eventId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventPhotos', eventId] });
      setCaption('');
      success('Foto subida correctamente');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al subir la foto');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const response = await api.delete(`/api/events/${eventId}/photos/${photoId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventPhotos', eventId] });
      setSelectedPhoto(null);
      success('Foto eliminada');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al eliminar la foto');
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Solo se permiten imágenes JPG, PNG, GIF o WebP');
      return;
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('La imagen no puede superar los 10MB');
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canDeletePhoto = (photo: EventPhoto) => {
    return isAdmin || photo.uploadedBy.id === currentUserId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const canUploadMore = canUpload && photos.length < MAX_PHOTOS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Fotos ({photos.length}/{MAX_PHOTOS})
        </h3>
        {canUploadMore && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload">
              <Button
                as="span"
                variant="outline"
                disabled={isUploading}
                className="cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Subir foto
                  </>
                )}
              </Button>
            </label>
          </div>
        )}
      </div>

      {!canUpload && photos.length === 0 && (
        <p className="text-sm text-gray-500">
          Solo los socios o colaboradores inscritos en el evento pueden subir fotos.
        </p>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No hay fotos del evento</p>
          {canUploadMore && (
            <p className="text-sm text-gray-400 mt-1">
              Sube la primera foto
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100"
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt={photo.caption || 'Foto del evento'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title=""
        size="xl"
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Foto del evento'}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                {selectedPhoto.caption && (
                  <p className="text-gray-700 mb-1">{selectedPhoto.caption}</p>
                )}
                <p className="text-sm text-gray-500">
                  Por {selectedPhoto.uploadedBy.name} • {formatDate(selectedPhoto.createdAt)}
                </p>
              </div>

              {canDeletePhoto(selectedPhoto) && (
                <Button
                  onClick={() => deleteMutation.mutate(selectedPhoto.id)}
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
