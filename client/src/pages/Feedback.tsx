// client/src/pages/Feedback.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type ReportType = 'BUG' | 'MEJORA';
type ReportStatus = 'NUEVO' | 'EN_REVISION' | 'EN_PROGRESO' | 'HECHO';
type ReportPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
type ReportSeverity = 'NO_URGE' | 'ME_MOLESTA' | 'BLOQUEANTE';

interface Report {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  screenshotUrl?: string | null;
  originUrl?: string | null;
  status: ReportStatus;
  internalPriority: ReportPriority;
  perceivedSeverity: ReportSeverity;
  devResponse?: string | null;
  votesCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  hasVoted: boolean;
  assignedToId?: string | null;
}

interface ReportComment {
  id: string;
  reportId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

const statusLabels: Record<ReportStatus, string> = {
  NUEVO: 'Nuevo',
  EN_REVISION: 'En revisión',
  EN_PROGRESO: 'En progreso',
  HECHO: 'Hecho'
};

const statusColors: Record<ReportStatus, string> = {
  NUEVO: 'bg-gray-100 text-gray-700',
  EN_REVISION: 'bg-blue-100 text-blue-700',
  EN_PROGRESO: 'bg-indigo-100 text-indigo-700',
  HECHO: 'bg-green-100 text-green-700'
};

const severityLabels: Record<ReportSeverity, string> = {
  NO_URGE: 'No urge',
  ME_MOLESTA: 'Me molesta',
  BLOQUEANTE: 'Bloqueante'
};

const typeLabels: Record<ReportType, string> = {
  BUG: 'Bug',
  MEJORA: 'Mejora'
};

const priorityLabels: Record<ReportPriority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica'
};

function ReportAdminControls({ report }: { report: Report }) {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [priority, setPriority] = useState<ReportPriority>(report.internalPriority);
  const [devResponse, setDevResponse] = useState<string>(report.devResponse || '');

  useEffect(() => {
    setStatus(report.status);
    setPriority(report.internalPriority);
    setDevResponse(report.devResponse || '');
  }, [report.status, report.internalPriority, report.devResponse]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/api/admin/reports/${report.id}`, {
        status,
        internalPriority: priority,
        devResponse
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      success('Reporte actualizado');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al actualizar reporte');
    }
  });

  return (
    <div className="mt-4 border-t border-[var(--color-cardBorder)] pt-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--color-textSecondary)]">Gestión interna</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
            className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {Object.keys(statusLabels).map((value) => (
              <option key={value} value={value}>{statusLabels[value as ReportStatus]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Prioridad interna</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ReportPriority)}
            className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {Object.keys(priorityLabels).map((value) => (
              <option key={value} value={value}>{priorityLabels[value as ReportPriority]}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Respuesta del desarrollador</label>
          <textarea
            value={devResponse}
            onChange={(e) => setDevResponse(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Comparte el estado o la solución..."
          />
        </div>
      </div>
      <Button
        onClick={() => updateMutation.mutate()}
        variant="primary"
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </div>
  );
}

export default function Feedback() {
  const { user, isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [type, setType] = useState<ReportType>('BUG');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ReportSeverity>('ME_MOLESTA');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [filterMine, setFilterMine] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'ALL' | 'ALL_EXCEPT_HECHO'>('ALL_EXCEPT_HECHO');
  const [sortByVotes, setSortByVotes] = useState(false);

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const [searchParams] = useSearchParams();
  const scrolledRef = useRef(false);

  const filtersKey = useMemo(
    () => ({ filterMine, filterStatus, sortByVotes }),
    [filterMine, filterStatus, sortByVotes]
  );

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', filtersKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterMine) params.append('mine', 'true');
      if (filterStatus !== 'ALL' && filterStatus !== 'ALL_EXCEPT_HECHO') params.append('status', filterStatus);
      if (sortByVotes) params.append('sort', 'votes');
      const response = await api.get(`/api/reports?${params.toString()}`);
      return response.data.data as Report[];
    }
  });

  const visibleReports = useMemo(() => {
    if (filterStatus === 'ALL_EXCEPT_HECHO') return reports.filter(r => r.status !== 'HECHO');
    return reports;
  }, [reports, filterStatus]);

  useEffect(() => {
    const reportId = searchParams.get('report');
    if (!reportId || isLoading || scrolledRef.current) return;
    const el = document.getElementById(reportId);
    if (el) {
      scrolledRef.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchParams, isLoading, reports]);

  const createMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await api.post('/api/reports', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      success('Reporte enviado. ¡Gracias por el feedback!');
      setTitle('');
      setDescription('');
      setSeverity('ME_MOLESTA');
      setType('BUG');
      setScreenshot(null);
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al enviar reporte');
    }
  });

  const voteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await api.post(`/api/reports/${reportId}/votes`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al votar');
    }
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['report-comments', selectedReport],
    queryFn: async () => {
      if (!selectedReport) return [];
      const response = await api.get(`/api/reports/${selectedReport}/comments`);
      return response.data.data || [];
    },
    enabled: !!selectedReport
  });

  const createCommentMutation = useMutation({
    mutationFn: async (payload: { reportId: string; content: string }) => {
      return await api.post(`/api/reports/${payload.reportId}/comments`, { content: payload.content });
    },
    onSuccess: () => {
      refetchComments();
      setCommentText('');
      success('Comentario añadido');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al añadir comentario');
    }
  });

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      showError('Completa el título y la descripción');
      return;
    }
    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('perceivedSeverity', severity);
    formData.append('originUrl', window.location.href);
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }
    createMutation.mutate(formData);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Feedback y Reporte de Bugs</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">
              Comparte mejoras, reporta fallos y vota lo que más importa.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enviar reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ReportType)}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="BUG">Bug</option>
                  <option value="MEJORA">Mejora</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Gravedad percibida</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as ReportSeverity)}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="NO_URGE">No urge</option>
                  <option value="ME_MOLESTA">Me molesta</option>
                  <option value="BLOQUEANTE">Bloqueante</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: No puedo subir una foto del evento"
                className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Cuéntanos qué ocurrió, pasos y contexto."
                className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Captura (opcional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="w-full text-sm text-[var(--color-textSecondary)]"
              />
              {screenshot && (
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Archivo seleccionado: {screenshot.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              variant="primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Enviando...' : 'Enviar reporte'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tablero público</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <Button
                onClick={() => setFilterMine((prev) => !prev)}
                variant={filterMine ? 'primary' : 'outline'}
              >
                Mis reportes
              </Button>
              <Button
                onClick={() => setSortByVotes((prev) => !prev)}
                variant={sortByVotes ? 'primary' : 'outline'}
              >
                Más votados
              </Button>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReportStatus | 'ALL' | 'ALL_EXCEPT_HECHO')}
                className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="ALL_EXCEPT_HECHO">Todos (menos &apos;Hecho&apos;)</option>
                <option value="ALL">Estado (todos)</option>
                <option value="NUEVO">Nuevo</option>
                <option value="EN_REVISION">En revisión</option>
                <option value="EN_PROGRESO">En progreso</option>
                <option value="HECHO">Hecho</option>
              </select>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]"></div>
              </div>
            ) : visibleReports.length === 0 ? (
              <div className="text-center text-[var(--color-textSecondary)] py-10">
                No hay reportes aún. Sé el primero en dejar feedback.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visibleReports.map((report) => (
                  <div key={report.id} id={report.id} className="border border-[var(--color-cardBorder)] rounded-lg p-5 bg-[var(--color-cardBackground)]">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[report.status]}`}>
                            {statusLabels[report.status]}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]">
                            {typeLabels[report.type]}
                          </span>
                          <span className="text-xs text-[var(--color-textSecondary)]">
                            {severityLabels[report.perceivedSeverity]}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-text)] mt-2">{report.title}</h3>
                        <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                          Reportado por {report.user.name} · {new Date(report.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => voteMutation.mutate(report.id)}
                          variant={report.hasVoted ? 'primary' : 'outline'}
                          disabled={voteMutation.isPending}
                        >
                          👍 {report.votesCount}
                        </Button>
                      </div>
                    </div>

                    <p className="text-[var(--color-textSecondary)] mt-4 whitespace-pre-wrap">
                      {report.description}
                    </p>

                    {report.screenshotUrl && (
                      <div className="mt-4">
                        <a href={report.screenshotUrl} target="_blank" rel="noreferrer">
                          <img
                            src={report.screenshotUrl}
                            alt={report.title}
                            className="max-h-64 rounded-lg border border-[var(--color-cardBorder)]"
                          />
                        </a>
                      </div>
                    )}

                    {report.devResponse && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-800">Respuesta del desarrollador</p>
                        <p className="text-sm text-green-900 mt-1 whitespace-pre-wrap">{report.devResponse}</p>
                      </div>
                    )}

                    {isAdmin && <ReportAdminControls report={report} />}

                    <div className="border-t border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] mt-4">
                      <button
                        onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}
                        className="w-full px-6 py-3 text-left flex items-center justify-between hover:bg-[var(--color-cardHover)] transition-colors"
                      >
                        <span className="text-sm font-medium text-[var(--color-text)]">
                          💬 Comentarios {selectedReport === report.id ? '▼' : '▶'}
                        </span>
                      </button>

                      {selectedReport === report.id && (
                        <div className="px-6 pb-6 space-y-4">
                          {/* Lista de comentarios */}
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {comments.length === 0 ? (
                              <p className="text-sm text-[var(--color-textSecondary)] text-center py-4">
                                No hay comentarios aún. Sé el primero en comentar.
                              </p>
                            ) : (
                              comments.map((comment: ReportComment) => (
                                <div
                                  key={comment.id}
                                  className={`p-4 rounded-lg ${
                                    comment.user.role === 'ADMIN' || comment.user.role === 'SUPER_ADMIN'
                                      ? 'bg-blue-50 border-l-4 border-blue-500'
                                      : 'bg-white border border-[var(--color-cardBorder)]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <span className="font-medium text-sm text-[var(--color-text)]">
                                      {comment.user.name}
                                      {(comment.user.role === 'ADMIN' || comment.user.role === 'SUPER_ADMIN') && (
                                        <span className="ml-2 text-xs px-2 py-1 bg-blue-500 text-white rounded">Admin</span>
                                      )}
                                    </span>
                                    <span className="text-xs text-[var(--color-textSecondary)]">
                                      {new Date(comment.createdAt).toLocaleString('es-ES')}
                                    </span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap text-[var(--color-textSecondary)]">{comment.content}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Input de comentario */}
                          {(isAdmin || report.user.id === user?.id) && (
                            <div className="flex gap-2">
                              <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Añadir comentario..."
                                rows={2}
                                className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                              />
                              <Button
                                onClick={() => {
                                  if (commentText.trim()) {
                                    createCommentMutation.mutate({
                                      reportId: report.id,
                                      content: commentText.trim()
                                    });
                                  }
                                }}
                                disabled={!commentText.trim() || createCommentMutation.isPending}
                                variant="primary"
                              >
                                {createCommentMutation.isPending ? 'Enviando...' : 'Enviar'}
                              </Button>
                            </div>
                          )}

                          {/* Indicador de asignación */}
                          {report.assignedToId && (
                            <p className="text-xs text-[var(--color-textSecondary)] mt-2">
                              📌 Un administrador está trabajando en este reporte
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {user && (
          <Card>
            <CardContent className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">Gracias por ayudarnos a mejorar</h4>
                    <p className="text-sm text-blue-800">
                      Cada reporte ayuda a priorizar lo que más impacta al club. Vota lo que te parezca más urgente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
