// client/src/pages/marketplace/MarketplaceEdit.tsx
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/axios';
import { CATEGORY_LABELS } from '../../types/marketplace';
import type { MarketplaceListing, MarketplaceCategory } from '../../types/marketplace';
import type { ApiResponse } from '../../types/auth';

const MAX_IMAGES = 4;

export default function MarketplaceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | ''>('');
  const [price, setPrice] = useState('');
  const [contactExtra, setContactExtra] = useState('');
  // URLs de imágenes existentes que se conservan
  const [keepImages, setKeepImages] = useState<string[]>([]);
  // Nuevas imágenes a subir
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data: listing } = useQuery<MarketplaceListing>({
    queryKey: ['marketplace', 'listing', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ listing: MarketplaceListing }>>(`/api/marketplace/listings/${id}`);
      return res.data.data!.listing;
    },
  });

  useEffect(() => {
    if (listing && !loaded) {
      setTitle(listing.title);
      setDescription(listing.description);
      setCategory(listing.category);
      setPrice(String(listing.price));
      setContactExtra(listing.contactExtra || '');
      setKeepImages(listing.images);
      setLoaded(true);
    }
  }, [listing, loaded]);

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('category', category);
      form.append('price', price);
      if (contactExtra.trim()) form.append('contactExtra', contactExtra.trim());
      else form.append('contactExtra', '');
      form.append('keepImages', JSON.stringify(keepImages));
      newImages.forEach(img => form.append('images', img));
      const res = await api.put(`/api/marketplace/listings/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', id] });
      navigate(`/mercadillo/${id}`);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Error al guardar los cambios');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCurrent = keepImages.length + newImages.length;
    const remaining = MAX_IMAGES - totalCurrent;
    const added = files.slice(0, remaining);
    setNewImages(prev => [...prev, ...added]);
    added.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setNewPreviews(prev => [...prev, ev.target!.result as string]);
      reader.readAsDataURL(f);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeKeep = (url: string) => setKeepImages(prev => prev.filter(u => u !== url));
  const removeNew = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const totalImages = keepImages.length + newImages.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('El título es obligatorio');
    if (!category) return setError('Selecciona una categoría');
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return setError('Precio no válido');
    mutation.mutate();
  };

  if (!loaded) {
    return (
      <Layout>
        <div className="text-center py-16 text-[var(--color-textSecondary)]">Cargando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Editar anuncio</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Categoría *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as MarketplaceCategory)}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
              >
                <option value="">Seleccionar...</option>
                {(Object.entries(CATEGORY_LABELS) as [MarketplaceCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Precio (€) *</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Contacto adicional <span className="text-[var(--color-textSecondary)] font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={contactExtra}
              onChange={e => setContactExtra(e.target.value)}
              placeholder="Teléfono, Telegram, email externo..."
              className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-[var(--color-text)] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Fotos <span className="text-[var(--color-textSecondary)] font-normal">(máx. {MAX_IMAGES})</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {keepImages.map((url, i) => (
                <div key={`keep-${i}`} className="relative w-24 h-24">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-[var(--color-cardBorder)]" />
                  <button
                    type="button"
                    onClick={() => removeKeep(url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative w-24 h-24">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-[var(--color-cardBorder)] opacity-80" />
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {totalImages < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed border-[var(--color-inputBorder)] rounded-lg flex items-center justify-center text-[var(--color-textSecondary)] text-2xl hover:border-[var(--color-primary)] transition-colors"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/mercadillo/${id}`)}
              className="px-5 py-2 text-sm border border-[var(--color-inputBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-5 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
