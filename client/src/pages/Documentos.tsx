// client/src/pages/Documentos.tsx
import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../api/axios';

type DocumentVisibility = 'PUBLIC' | 'ADMIN' | 'SUPER_ADMIN';

interface Document {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  visibility: DocumentVisibility;
  url: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
  };
}

interface DocumentStats {
  total: number;
  byVisibility: {
    public: number;
    admin: number;
    superAdmin: number;
  };
  totalSizeBytes: number;
  totalSizeMB: string;
}

const visibilityLabels: Record<DocumentVisibility, string> = {
  PUBLIC: 'Todos los miembros',
  ADMIN: 'Solo administradores',
  SUPER_ADMIN: 'Solo super admins'
};

const visibilityColors: Record<DocumentVisibility, string> = {
  PUBLIC: 'bg-green-100 text-green-800',
  ADMIN: 'bg-yellow-100 text-yellow-800',
  SUPER_ADMIN: 'bg-red-100 text-red-800'
};

// Formatear tamaño de archivo
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Icono según tipo de archivo
const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return (
      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return (
      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (mimeType.startsWith('image/')) {
    return (
      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 bg-[var(--color-tableRowHover)] rounded-lg flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
};

export default function Documentos() {
  const { isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('PUBLIC');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', searchQuery, selectedVisibility],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedVisibility !== 'all' && isAdmin) params.append('visibility', selectedVisibility);

      const response = await api.get(`/api/documents?${params.toString()}`);
      return response.data.data as Document[];
    }
  });

  // Fetch stats (solo admin)
  const { data: stats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: async () => {
      const response = await api.get('/api/documents/stats');
      return response.data.data as DocumentStats;
    },
    enabled: isAdmin
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadProgress(0);
      const response = await api.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      success('Documento subido correctamente');
      closeUploadModal();
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al subir documento');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/documents/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      success('Documento eliminado');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al eliminar documento');
    }
  });

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadTitle('');
    setUploadVisibility('PUBLIC');
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleFileSelect = (file: File) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      showError('El archivo excede el tamaño máximo de 20MB');
      return;
    }
    setSelectedFile(file);
    if (!uploadTitle) {
      // Usar nombre del archivo sin extensión como título por defecto
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleUpload = () => {
    if (!selectedFile || !uploadTitle.trim()) {
      showError('Selecciona un archivo y proporciona un título');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadTitle.trim());
    formData.append('visibility', uploadVisibility);

    uploadMutation.mutate(formData);
  };

  const handleDownload = async (doc: Document) => {
    try {
      // Descargar como blob para forzar el nombre de archivo correcto
      // (el atributo 'download' es ignorado por el navegador en dominios externos)
      const response = await fetch(doc.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: abrir en nueva pestaña si falla el fetch
      window.open(doc.url, '_blank');
    }
  };

  const handleDelete = (doc: Document) => {
    if (confirm(`¿Estás seguro de eliminar "${doc.title}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Documentos del Club</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">
              {isAdmin
                ? 'Gestiona los documentos compartidos con los miembros del club'
                : 'Documentos y recursos disponibles para los miembros del club'
              }
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Subir Documento
            </Button>
          )}
        </div>

        {/* Estadísticas (solo admin) */}
        {isAdmin && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Total Documentos</p>
                    <p className="text-3xl font-bold text-[var(--color-text)]">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Documentos Públicos</p>
                    <p className="text-3xl font-bold text-green-600">{stats.byVisibility.public}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Solo Admins</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.byVisibility.admin}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Espacio Usado</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalSizeMB} MB</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar documentos..."
                  className="w-full px-4 py-2 pl-10 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <svg
                  className="w-5 h-5 text-[var(--color-textSecondary)] absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {isAdmin && (
                <select
                  value={selectedVisibility}
                  onChange={(e) => setSelectedVisibility(e.target.value)}
                  className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Todas las visibilidades</option>
                  <option value="PUBLIC">Todos los miembros</option>
                  <option value="ADMIN">Solo administradores</option>
                  <option value="SUPER_ADMIN">Solo super admins</option>
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de documentos */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-[var(--color-textSecondary)]">
                <svg className="w-20 h-20 mx-auto mb-4 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">No hay documentos</h3>
                <p className="text-[var(--color-textSecondary)] mb-6">
                  {isAdmin
                    ? 'Aún no se han subido documentos. Sube el primero.'
                    : 'No hay documentos disponibles en este momento.'
                  }
                </p>
                {isAdmin && (
                  <Button onClick={() => setIsUploadModalOpen(true)} variant="primary">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Subir primer documento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Documentos ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-4 flex items-center gap-4 hover:bg-[var(--color-tableRowHover)] -mx-6 px-6 transition-colors">
                    {getFileIcon(doc.mimeType)}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[var(--color-text)] truncate">{doc.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-[var(--color-textSecondary)] mt-1">
                        <span>{doc.filename}</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${visibilityColors[doc.visibility]}`}>
                        {visibilityLabels[doc.visibility]}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 hover:bg-[var(--color-tableRowHover)] rounded-lg transition-colors cursor-pointer"
                        title="Descargar"
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información */}
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">Documentos del Club</h4>
                  <p className="text-sm text-blue-800">
                    {isAdmin
                      ? 'Aquí puedes subir estatutos, normativas, actas y otros documentos importantes. Los documentos públicos serán visibles para todos los miembros, mientras que los privados solo para administradores. Tamaño máximo: 20MB por archivo.'
                      : 'En esta sección encontrarás documentos importantes del club como estatutos, normativas y otros recursos.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de subida */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-cardBackground)] rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text)]">Subir Documento</h2>
              <button
                onClick={closeUploadModal}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Zona de arrastre */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-inputBorder)] hover:border-[var(--color-cardBorder)]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(selectedFile.type)}
                    <div className="text-left">
                      <p className="font-medium text-[var(--color-text)]">{selectedFile.name}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto text-[var(--color-textSecondary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-[var(--color-textSecondary)]">Arrastra un archivo aquí o haz clic para seleccionar</p>
                    <p className="text-sm text-[var(--color-textSecondary)] mt-1">PDF, Word, Excel, JPG, PNG, GIF (max 20MB)</p>
                  </>
                )}
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Título del documento *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ej: Estatutos del Club 2024"
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              {/* Visibilidad */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Visibilidad
                </label>
                <select
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value as DocumentVisibility)}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="PUBLIC">Todos los miembros</option>
                  <option value="ADMIN">Solo administradores</option>
                  <option value="SUPER_ADMIN">Solo super admins</option>
                </select>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  {uploadVisibility === 'PUBLIC' && 'Visible para todos los miembros del club'}
                  {uploadVisibility === 'ADMIN' && 'Solo visible para administradores'}
                  {uploadVisibility === 'SUPER_ADMIN' && 'Solo visible para super administradores'}
                </p>
              </div>

              {/* Barra de progreso */}
              {uploadMutation.isPending && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-[var(--color-textSecondary)] mb-1">
                    <span>Subiendo archivo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-tableRowHover)] rounded-full h-2">
                    <div
                      className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpload}
                  variant="primary"
                  disabled={!selectedFile || !uploadTitle.trim() || uploadMutation.isPending}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? `Subiendo... ${uploadProgress}%` : 'Subir documento'}
                </Button>
                <Button
                  onClick={closeUploadModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

