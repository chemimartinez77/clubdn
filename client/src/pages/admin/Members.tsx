// client/src/pages/admin/Members.tsx
import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useMembers } from '../../hooks/useMembers';
import { useToast } from '../../hooks/useToast';
import { api } from '../../api/axios';
import type { MemberData, MemberFilters, MemberProfileResponse } from '../../types/members';
import type { ApiResponse } from '../../types/auth';

export default function Members() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    membershipType: 'all',
    dateFrom: '',
    dateTo: '',
    paymentStatus: 'all',
    page: 1,
    pageSize: 25,
  });

  // Modal states
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    avatar: '',
    imageConsentActivities: false,
    imageConsentSocial: false,
    membershipType: ''
  });

  // Fetch members data
  const { data, isLoading, refetch, markAsBaja, isMarkingBaja, exportCSV } = useMembers(filters);

  const { data: memberProfile, isLoading: isProfileLoading, isError: isProfileError } = useQuery({
    queryKey: ['memberProfile', selectedMember?.id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MemberProfileResponse>>(
        `/api/admin/members/${selectedMember?.id}/profile`
      );
      return response.data.data || null;
    },
    enabled: !!selectedMember?.id && viewModalOpen
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember?.id) return null;
      const payload: {
        firstName: string;
        lastName: string;
        dni: string;
        imageConsentActivities: boolean;
        imageConsentSocial: boolean;
        membershipType?: string;
      } = {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        dni: profileForm.dni.trim(),
        imageConsentActivities: profileForm.imageConsentActivities,
        imageConsentSocial: profileForm.imageConsentSocial
      };
      // Solo incluir membershipType si el usuario no tiene uno asignado y se proporcionó uno nuevo
      if (!memberProfile?.member.membershipType && profileForm.membershipType) {
        payload.membershipType = profileForm.membershipType;
      }
      const response = await api.put<ApiResponse<MemberProfileResponse>>(
        `/api/admin/members/${selectedMember.id}/profile`,
        payload
      );
      return response.data.data || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberProfile', selectedMember?.id] });
      success('Ficha actualizada');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Error al guardar la ficha');
    }
  });

  useEffect(() => {
    if (!memberProfile?.member) return;
    setProfileForm({
      firstName: memberProfile.member.profile.firstName || '',
      lastName: memberProfile.member.profile.lastName || '',
      dni: memberProfile.member.profile.dni || '',
      avatar: memberProfile.member.profile.avatar || '',
      imageConsentActivities: memberProfile.member.profile.imageConsentActivities,
      imageConsentSocial: memberProfile.member.profile.imageConsentSocial,
      membershipType: memberProfile.member.membershipType || ''
    });
  }, [memberProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMember?.id) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      error('Tipo de archivo no permitido. Solo JPG, PNG, GIF o WebP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('La imagen no puede superar 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post<ApiResponse<{ avatarUrl: string }>>(
        `/api/admin/members/${selectedMember.id}/avatar`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.data?.avatarUrl) {
        setProfileForm(prev => ({ ...prev, avatar: response.data.data!.avatarUrl }));
        queryClient.invalidateQueries({ queryKey: ['members'] });
        queryClient.invalidateQueries({ queryKey: ['memberProfile', selectedMember.id] });
        success('Avatar actualizado correctamente');
      }
    } catch (err) {
      error('Error al subir avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Update filter and reset to page 1
  const updateFilter = <K extends keyof MemberFilters>(key: K, value: MemberFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const changePageSize = (pageSize: number) => {
    setFilters(prev => ({ ...prev, pageSize, page: 1 }));
  };

  // Action handlers
  const handleViewMember = (member: MemberData) => {
    setSelectedMember(member);
    setProfileForm({
      firstName: '',
      lastName: '',
      dni: '',
      avatar: '',
      imageConsentActivities: false,
      imageConsentSocial: false,
      membershipType: ''
    });
    setViewModalOpen(true);
  };

  const handleMarkAsBaja = (member: MemberData) => {
    setSelectedMember(member);
    setBajaModalOpen(true);
  };

  const confirmMarkAsBaja = () => {
    if (!selectedMember) return;

    markAsBaja(
      { memberId: selectedMember.id },
      {
        onSuccess: () => {
          success('Miembro marcado como BAJA exitosamente');
          setBajaModalOpen(false);
          setSelectedMember(null);
        },
        onError: () => {
          error('Error al marcar miembro como BAJA');
        },
      }
    );
  };

  const handleSaveProfile = () => {
    if (!profileForm.firstName.trim()) {
      error('Nombre requerido');
      return;
    }
    if (!profileForm.lastName.trim()) {
      error('Apellidos requeridos');
      return;
    }
    if (!profileForm.dni.trim()) {
      error('DNI requerido');
      return;
    }
    // Validar membershipType si el miembro no tiene uno asignado
    if (!memberProfile?.member.membershipType && !profileForm.membershipType) {
      error('Tipo de membresía requerido');
      return;
    }
    updateProfileMutation.mutate();
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  // Membership badge helper
  const getMembershipBadge = (
    type: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | null
  ) => {
    if (!type) return <span className="text-gray-500">-</span>;

    const styles = {
      SOCIO: 'bg-[var(--color-primary-100)] text-[var(--color-primary-800)]',
      COLABORADOR: 'bg-blue-100 text-blue-800',
      FAMILIAR: 'bg-purple-100 text-purple-800',
      EN_PRUEBAS: 'bg-yellow-100 text-yellow-800',
      BAJA: 'bg-gray-200 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[type]}`}>
        {type}
      </span>
    );
  };

  // Payment status badge helper
  const getPaymentStatusBadge = (status: 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO') => {
    const styles = {
      NUEVO: 'bg-blue-100 text-blue-800',
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      IMPAGADO: 'bg-red-100 text-red-800',
      PAGADO: 'bg-green-100 text-green-800',
      ANO_COMPLETO: 'bg-[var(--color-primary-100)] text-[var(--color-primary-800)]',
    };

    const labels = {
      NUEVO: 'Nuevo',
      PENDIENTE: 'Pendiente',
      IMPAGADO: 'Impagado',
      PAGADO: 'Pagado',
      ANO_COMPLETO: 'Año completo',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-full mx-auto space-y-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Directorio de Miembros</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y consulta la información de todos los miembros del club
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
            <Button onClick={exportCSV} variant="primary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Filtros</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar por nombre o email
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Membership Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de membresía
                </label>
                <select
                  value={filters.membershipType}
                  onChange={(e) =>
                    updateFilter('membershipType', e.target.value as MemberFilters['membershipType'])
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="SOCIO">SOCIO</option>
                  <option value="COLABORADOR">COLABORADOR</option>
                  <option value="FAMILIAR">FAMILIAR</option>
                  <option value="EN_PRUEBAS">EN PRUEBAS</option>
                  <option value="BAJA">BAJA</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado de pago
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) =>
                    updateFilter('paymentStatus', e.target.value as MemberFilters['paymentStatus'])
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="NUEVO">Nuevo</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="IMPAGADO">Impagado</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="ANO_COMPLETO">Año completo</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registros por página
                </label>
                <select
                  value={filters.pageSize}
                  onChange={(e) => changePageSize(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      search: '',
                      membershipType: 'all',
                      dateFrom: '',
                      dateTo: '',
                      paymentStatus: 'all',
                      page: 1,
                      pageSize: 25,
                    })
                  }
                  className="w-full"
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Miembros</h2>
              {data && (
                <span className="text-sm text-gray-600">
                  Mostrando {data.members.length} de {data.pagination.totalMembers} miembros
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando miembros...</p>
              </div>
            ) : !data || data.members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                No se encontraron miembros con los filtros seleccionados
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Incorporación
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado de Pago
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-sm font-medium text-gray-900 hover:underline"
                            >
                              {member.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-sm text-gray-500 hover:underline"
                            >
                              {member.email}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getMembershipBadge(member.membershipType)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(member.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPaymentStatusBadge(member.paymentStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewMember(member)}
                              >
                                Ver
                              </Button>
                              {member.membershipType !== 'BAJA' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleMarkAsBaja(member)}
                                >
                                  Dar de baja
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Página {data.pagination.currentPage} de {data.pagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(data.pagination.currentPage - 1)}
                        disabled={data.pagination.currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(data.pagination.currentPage + 1)}
                        disabled={data.pagination.currentPage === data.pagination.totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member Profile Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedMember(null);
          setProfileForm({
            firstName: '',
            lastName: '',
            dni: '',
            avatar: '',
            imageConsentActivities: false,
            imageConsentSocial: false,
            membershipType: ''
          });
        }}
        title="Ficha del miembro"
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-6">
            {isProfileLoading ? (
              <div className="py-6 text-center text-gray-500">Cargando ficha...</div>
            ) : isProfileError || !memberProfile?.member ? (
              <div className="py-6 text-center text-gray-500">No se pudo cargar la ficha.</div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className="relative group">
                    {profileForm.avatar ? (
                      <img
                        src={profileForm.avatar}
                        alt={memberProfile.member.name}
                        className="w-20 h-20 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center border border-gray-200">
                        <span className="text-2xl font-semibold text-[var(--color-primary)]">
                          {memberProfile.member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Overlay para cambiar foto */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      title="Cambiar foto"
                    >
                      {isUploadingAvatar ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                    {/* Input oculto para selección de archivo */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">{memberProfile.member.name}</p>
                    <p className="text-sm text-gray-600">{memberProfile.member.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getMembershipBadge(memberProfile.member.membershipType)}
                      {getPaymentStatusBadge(memberProfile.member.paymentStatus)}
                    </div>
                  </div>
                </div>

                {/* Selector de tipo de membresía si el miembro no tiene uno asignado */}
                {!memberProfile.member.membershipType && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Membresía <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={profileForm.membershipType}
                      onChange={(e) => setProfileForm({ ...profileForm, membershipType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                      required
                    >
                      <option value="" disabled>Elige un tipo</option>
                      <option value="SOCIO">SOCIO</option>
                      <option value="COLABORADOR">COLABORADOR</option>
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Este miembro no tiene un tipo de membresía asignado. Selecciona uno antes de guardar.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                    <input
                      type="text"
                      value={profileForm.dni}
                      onChange={(e) => setProfileForm({ ...profileForm, dni: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <strong>Cambiar foto:</strong> Pasa el cursor sobre el avatar y haz clic en el icono de cámara para subir una nueva imagen desde tu dispositivo.
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={profileForm.imageConsentActivities}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, imageConsentActivities: e.target.checked })
                      }
                      className="w-5 h-5 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)] mt-0.5"
                    />
                    <span className="text-sm text-gray-700">
                      Autorización expresa para la captación y publicación de la imagen del colaborador en
                      fotografías y videos tomados durante las actividades organizadas por la asociación.
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={profileForm.imageConsentSocial}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, imageConsentSocial: e.target.checked })
                      }
                      className="w-5 h-5 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)] mt-0.5"
                    />
                    <span className="text-sm text-gray-700">
                      Autorización expresa para la publicación de la imagen del colaborador en las redes
                      sociales de la asociación.
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewModalOpen(false);
                      setSelectedMember(null);
                      setProfileForm({
                        firstName: '',
                        lastName: '',
                        dni: '',
                        avatar: '',
                        imageConsentActivities: false,
                        imageConsentSocial: false,
                        membershipType: ''
                      });
                    }}
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Mark as BAJA Confirmation Modal */}
      <Modal
        isOpen={bajaModalOpen}
        onClose={() => {
          setBajaModalOpen(false);
          setSelectedMember(null);
        }}
        title="Confirmar Baja de Miembro"
      >
        {selectedMember && (
          <div className="space-y-4">
            <p className="text-gray-700">
              ¿Estás seguro que deseas dar de baja al siguiente miembro?
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{selectedMember.name}</p>
              <p className="text-sm text-gray-600">{selectedMember.email}</p>
              <p className="text-sm text-gray-600 mt-2">
                Tipo: {getMembershipBadge(selectedMember.membershipType)}
              </p>
            </div>
            <p className="text-sm text-red-600">
              Esta acción marcará al miembro como BAJA. El registro se conservará pero el miembro
              no aparecerá en las listas activas.
            </p>
            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBajaModalOpen(false);
                  setSelectedMember(null);
                }}
                disabled={isMarkingBaja}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmMarkAsBaja}
                isLoading={isMarkingBaja}
                disabled={isMarkingBaja}
              >
                {isMarkingBaja ? 'Procesando...' : 'Confirmar Baja'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
