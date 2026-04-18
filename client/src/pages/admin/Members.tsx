// client/src/pages/admin/Members.tsx
import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import InfoTooltip from '../../components/ui/InfoTooltip';
import { useMembers } from '../../hooks/useMembers';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/axios';
import type { MemberData, MemberFilters, MemberProfileResponse } from '../../types/members';
import type { ApiResponse } from '../../types/auth';

const EMPTY_PROFILE_FORM = {
  firstName: '', lastName: '', dni: '',
  phone: '', address: '', city: '', province: '', postalCode: '', iban: '',
  avatar: '', imageConsentActivities: false, imageConsentSocial: false, membershipType: '',
  notes: '', startDate: ''
};

const formatTrialPromotionMessage = (date: string | null) => {
  if (!date) return 'Este miembro pasó de "en pruebas" a "colaborador" este mes.';

  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));

  return `Este miembro pasó de "en pruebas" a "colaborador" el día ${formattedDate}.`;
};

export default function Members() {
  const { success, error } = useToast();
  const { user: currentUser, impersonate } = useAuth();
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
    sortBy: 'lastName',
    sortDir: 'asc',
  });

  // Modal states
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [membershipChangeModalOpen, setMembershipChangeModalOpen] = useState(false);
  const [membershipChangeReason, setMembershipChangeReason] = useState('');
  const [originalMembershipType, setOriginalMembershipType] = useState('');
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);

  // Create user modal
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dni: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    iban: '',
    imageConsentActivities: false,
    imageConsentSocial: false,
  });
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof typeof createForm, string>>>({});

  const createMemberMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const response = await api.post('/api/admin/members', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      success('Usuario creado correctamente');
      setCreateModalOpen(false);
      setCreateForm({
        firstName: '', lastName: '', email: '', dni: '', phone: '',
        address: '', city: '', province: '', postalCode: '', iban: '',
        imageConsentActivities: false, imageConsentSocial: false,
      });
      setCreateErrors({});
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Error al crear el usuario');
    }
  });

  const handleCreateSubmit = () => {
    const e: Partial<Record<keyof typeof createForm, string>> = {};
    if (!createForm.firstName.trim()) e.firstName = 'Campo obligatorio';
    if (!createForm.lastName.trim()) e.lastName = 'Campo obligatorio';
    setCreateErrors(e);
    if (Object.keys(e).length > 0) return;
    createMemberMutation.mutate(createForm);
  };

  // Fetch members data
  const { data, isLoading, refetch, markAsBaja, isMarkingBaja, reactivateMember, isReactivating, exportCSV } = useMembers(filters);

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
        phone: string;
        address: string;
        city: string;
        province: string;
        postalCode: string;
        iban: string;
        avatar: string;
        imageConsentActivities: boolean;
        imageConsentSocial: boolean;
        membershipType?: string;
        membershipChangeReason?: string;
        notes?: string;
        startDate?: string;
      } = {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        dni: profileForm.dni.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        province: profileForm.province.trim(),
        postalCode: profileForm.postalCode.trim(),
        iban: profileForm.iban.trim(),
        avatar: profileForm.avatar,
        imageConsentActivities: profileForm.imageConsentActivities,
        imageConsentSocial: profileForm.imageConsentSocial,
        notes: profileForm.notes.trim() || undefined,
        startDate: profileForm.startDate || undefined
      };
      // Incluir membershipType si hay cambio o es nuevo
      if (profileForm.membershipType) {
        payload.membershipType = profileForm.membershipType;
        // Si es un cambio de tipo, incluir el motivo
        if (originalMembershipType && originalMembershipType !== profileForm.membershipType) {
          payload.membershipChangeReason = membershipChangeReason;
        }
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
    const p = memberProfile.member.profile;
    setProfileForm({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      dni: p.dni || '',
      phone: p.phone || '',
      address: p.address || '',
      city: p.city || '',
      province: p.province || '',
      postalCode: p.postalCode || '',
      iban: p.iban || '',
      avatar: p.avatar || '',
      imageConsentActivities: p.imageConsentActivities,
      imageConsentSocial: p.imageConsentSocial,
      membershipType: memberProfile.member.membershipType || '',
      notes: memberProfile.member.notes || '',
      startDate: memberProfile.member.startDate ? memberProfile.member.startDate.slice(0, 10) : ''
    });
    setOriginalMembershipType(memberProfile.member.membershipType || '');
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

  const handleSort = (col: MemberFilters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      sortBy: col,
      sortDir: prev.sortBy === col && prev.sortDir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ col }: { col: MemberFilters['sortBy'] }) => {
    if (filters.sortBy !== col) return null;
    return <span className="ml-1">{filters.sortDir === 'asc' ? '▲' : '▼'}</span>;
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
    setProfileForm(EMPTY_PROFILE_FORM);
    setViewModalOpen(true);
  };

  const handleMarkAsBaja = (member: MemberData) => {
    setSelectedMember(member);
    setBajaModalOpen(true);
  };

  const handleReactivate = (member: MemberData) => {
    reactivateMember(
      { memberId: member.id },
      {
        onSuccess: () => {
          success('Miembro reactivado exitosamente');
        },
        onError: () => {
          error('Error al reactivar miembro');
        },
      }
    );
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

    // Si hay cambio de tipo de membresía, mostrar modal para pedir motivo
    if (originalMembershipType && profileForm.membershipType && originalMembershipType !== profileForm.membershipType) {
      setMembershipChangeModalOpen(true);
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
    if (!type) return <span className="text-[var(--color-textSecondary)]">-</span>;

    const styles = {
      SOCIO: 'bg-[var(--color-primary-100)] text-[var(--color-primary-800)]',
      COLABORADOR: 'bg-blue-100 text-blue-800',
      FAMILIAR: 'bg-purple-100 text-purple-800',
      EN_PRUEBAS: 'bg-yellow-100 text-yellow-800',
      BAJA: 'bg-[var(--color-cardBorder)] text-[var(--color-textSecondary)]',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[type]}`}>
        {type}
      </span>
    );
  };

  // Payment status badge helper
  const getPaymentStatusBadge = (status: 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO' | null) => {
    if (!status) return null;

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
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Directorio de Miembros</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            Gestiona y consulta la información de todos los miembros del club
          </p>
          <div className="flex gap-2 mt-3 justify-end">
            <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
            <Button onClick={exportCSV} variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </Button>
            <Button onClick={() => setCreateModalOpen(true)} variant="primary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Usuario
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center justify-between" onClick={() => setFiltersOpen(o => !o)}>
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Filtros</h2>
              <svg
                className={`w-5 h-5 text-[var(--color-textSecondary)] transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </CardHeader>
          {filtersOpen && <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Buscar por nombre o email
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Buscar por nombre, apellidos, nick o email..."
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Membership Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Tipo de membresía
                </label>
                <select
                  value={filters.membershipType}
                  onChange={(e) =>
                    updateFilter('membershipType', e.target.value as MemberFilters['membershipType'])
                  }
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)]"
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
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Estado de pago
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) =>
                    updateFilter('paymentStatus', e.target.value as MemberFilters['paymentStatus'])
                  }
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)]"
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
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Registros por página
                </label>
                <select
                  value={filters.pageSize}
                  onChange={(e) => changePageSize(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)]"
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
                      sortBy: 'lastName',
                      sortDir: 'asc',
                    })
                  }
                  className="w-full"
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>}
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Miembros</h2>
              {data && (
                <span className="text-sm text-[var(--color-textSecondary)]">
                  Mostrando {data.members.length} de {data.pagination.totalMembers} miembros
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                <p className="text-[var(--color-textSecondary)] mt-4">Cargando miembros...</p>
              </div>
            ) : !data || data.members.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-textSecondary)]">
                <svg className="mx-auto h-12 w-12 text-[var(--color-textSecondary)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                No se encontraron miembros con los filtros seleccionados
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[var(--color-tableRowHover)]">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)]"
                          onClick={() => handleSort('firstName')}
                        >
                          Nombre<SortIcon col="firstName" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)]"
                          onClick={() => handleSort('lastName')}
                        >
                          Apellidos{filters.sortBy === 'lastName' ? <span className="ml-1">{filters.sortDir === 'asc' ? '▲' : '▼'}</span> : <span className="ml-1 opacity-0">▲</span>}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)]"
                          onClick={() => handleSort('email')}
                        >
                          Email<SortIcon col="email" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                          Tipo
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)]"
                          onClick={() => handleSort('startDate')}
                        >
                          Fecha Incorporación<SortIcon col="startDate" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)]"
                          onClick={() => handleSort('paymentStatus')}
                        >
                          Estado de Pago<SortIcon col="paymentStatus" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-[var(--color-cardBackground)] divide-y divide-gray-200">
                      {data.members.map((member) => (
                        <tr key={member.id} className="hover:bg-[var(--color-tableRowHover)] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-sm font-medium text-[var(--color-text)] hover:underline"
                            >
                              {member.firstName || member.name.split(' ')[0]}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-sm font-medium text-[var(--color-text)] hover:underline"
                            >
                              {member.lastName || member.name.split(' ').slice(1).join(' ')}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewMember(member)}
                              className="text-sm text-[var(--color-textSecondary)] hover:underline"
                            >
                              {member.email}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              {member.showTrialPromotionWarning && (
                                <InfoTooltip
                                  content={formatTrialPromotionMessage(member.trialPromotionWarningDate)}
                                  ariaLabel="Información sobre promoción reciente"
                                >
                                  <span className="text-sm leading-none">⚠️</span>
                                </InfoTooltip>
                              )}
                              {getMembershipBadge(member.membershipType)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                            {formatDate(member.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPaymentStatusBadge(member.paymentStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {member.membershipType === 'BAJA'
                              ? <span className="px-2 py-1 text-xs font-semibold rounded bg-[var(--color-cardBorder)] text-[var(--color-textSecondary)]">BAJA</span>
                              : <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">ACTIVO</span>
                            }
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
                              {member.membershipType === 'BAJA' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReactivate(member)}
                                  disabled={isReactivating}
                                >
                                  Reactivar
                                </Button>
                              )}
                              {currentUser?.role === 'SUPER_ADMIN' && member.id !== currentUser.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => impersonate(member.id).catch(() => error('Error al impersonar usuario'))}
                                >
                                  Login as
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
                  <div className="px-6 py-4 border-t border-[var(--color-cardBorder)] flex items-center justify-between">
                    <div className="text-sm text-[var(--color-textSecondary)]">
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
          setProfileForm(EMPTY_PROFILE_FORM);
        }}
        title="Ficha del miembro"
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-6">
            {isProfileLoading ? (
              <div className="py-6 text-center text-[var(--color-textSecondary)]">Cargando ficha...</div>
            ) : isProfileError || !memberProfile?.member ? (
              <div className="py-6 text-center text-[var(--color-textSecondary)]">No se pudo cargar la ficha.</div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className="relative group">
                    {profileForm.avatar ? (
                      <img
                        src={profileForm.avatar}
                        alt={memberProfile.member.name}
                        className="w-20 h-20 rounded-full object-cover border border-[var(--color-cardBorder)]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center border border-[var(--color-cardBorder)]">
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
                    <p className="text-lg font-semibold text-[var(--color-text)]">{memberProfile.member.name}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">{memberProfile.member.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {memberProfile.member.showTrialPromotionWarning && (
                        <InfoTooltip
                          content={formatTrialPromotionMessage(memberProfile.member.trialPromotionWarningDate)}
                          ariaLabel="Información sobre promoción reciente"
                        >
                          <span className="text-sm leading-none">⚠️</span>
                        </InfoTooltip>
                      )}
                      {getMembershipBadge(memberProfile.member.membershipType)}
                      {getPaymentStatusBadge(memberProfile.member.paymentStatus)}
                    </div>
                  </div>
                </div>

                {/* Selector de tipo de membresía */}
                <div className="rounded-lg p-4 bg-[var(--color-tableRowHover)] border border-[var(--color-cardBorder)]">
                  <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                    Tipo de Membresía {!memberProfile.member.membershipType && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={profileForm.membershipType}
                    onChange={(e) => setProfileForm({ ...profileForm, membershipType: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)]"
                    required={!memberProfile.member.membershipType}
                  >
                    <option value="" disabled>Elige un tipo</option>
                    <option value="SOCIO">SOCIO</option>
                    <option value="COLABORADOR">COLABORADOR</option>
                    <option value="FAMILIAR">FAMILIAR</option>
                    <option value="EN_PRUEBAS">EN PRUEBAS</option>
                  </select>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    {!memberProfile.member.membershipType
                      ? 'Este miembro no tiene un tipo de membresía asignado. Selecciona uno antes de guardar.'
                      : originalMembershipType !== profileForm.membershipType
                        ? '⚠️ Has cambiado el tipo de membresía. Se te pedirá el motivo al guardar.'
                        : 'Puedes cambiar el tipo de membresía si es necesario.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Fecha de incorporación</label>
                  <input
                    type="date"
                    value={profileForm.startDate}
                    onChange={(e) => setProfileForm({ ...profileForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Apellidos</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">DNI</label>
                    <input
                      type="text"
                      value={profileForm.dni}
                      onChange={(e) => setProfileForm({ ...profileForm, dni: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Dirección</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Ciudad</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Provincia</label>
                    <input
                      type="text"
                      value={profileForm.province}
                      onChange={(e) => setProfileForm({ ...profileForm, province: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Código Postal</label>
                    <input
                      type="text"
                      value={profileForm.postalCode}
                      onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">IBAN</label>
                  <input
                    type="text"
                    value={profileForm.iban}
                    onChange={(e) => setProfileForm({ ...profileForm, iban: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Observaciones</label>
                  <textarea
                    value={profileForm.notes}
                    onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Notas internas visibles solo para administradores..."
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)] resize-none"
                  />
                </div>

                <div className="text-sm text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)] border border-[var(--color-cardBorder)] rounded-lg p-3">
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
                      className="w-5 h-5 shrink-0 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)] mt-0.5"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">
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
                      className="w-5 h-5 shrink-0 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)] mt-0.5"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">
                      Autorización expresa para la publicación de la imagen del colaborador en las redes
                      sociales de la asociación.
                    </span>
                  </label>
                </div>

                {/* Fidelidad */}
                <div className="border-t border-[var(--color-cardBorder)] pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Fidelidad</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--color-tableRowHover)] rounded-lg p-3">
                      <p className="text-xs text-[var(--color-textSecondary)] mb-1">Tasa de respuesta</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">
                        {memberProfile.member.reliability.responseRate !== null
                          ? `${memberProfile.member.reliability.responseRate}%`
                          : '—'}
                      </p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                        {memberProfile.member.reliability.organizedAnswered} de {memberProfile.member.reliability.organizedAsked} partidas organizadas confirmadas
                      </p>
                    </div>
                    <div className="bg-[var(--color-tableRowHover)] rounded-lg p-3">
                      <p className="text-xs text-[var(--color-textSecondary)] mb-1">Tasa de asistencia</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">
                        {memberProfile.member.reliability.attendanceRate !== null
                          ? `${memberProfile.member.reliability.attendanceRate}%`
                          : '—'}
                      </p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                        {memberProfile.member.reliability.confirmedRegistrations} asistencias · {memberProfile.member.reliability.lateCancellations} cancelaciones
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewModalOpen(false);
                      setSelectedMember(null);
                      setProfileForm(EMPTY_PROFILE_FORM);
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

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateErrors({});
        }}
        title="Crear Usuario"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-textSecondary)]">
            Crea un usuario directamente desde el panel de administración. El nombre y apellidos son obligatorios; el resto de campos son opcionales.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)] ${createErrors.firstName ? 'border-red-500' : 'border-[var(--color-inputBorder)]'}`}
              />
              {createErrors.firstName && <p className="text-xs text-red-500 mt-1">{createErrors.firstName}</p>}
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)] ${createErrors.lastName ? 'border-red-500' : 'border-[var(--color-inputBorder)]'}`}
              />
              {createErrors.lastName && <p className="text-xs text-red-500 mt-1">{createErrors.lastName}</p>}
            </div>

            {/* Email */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                placeholder="Si no tiene email, se generará uno interno"
              />
            </div>

            {/* DNI */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">DNI / NIE</label>
              <input
                type="text"
                value={createForm.dni}
                onChange={(e) => setCreateForm(f => ({ ...f, dni: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Teléfono</label>
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>

            {/* Dirección */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Dirección</label>
              <input
                type="text"
                value={createForm.address}
                onChange={(e) => setCreateForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Ciudad</label>
              <input
                type="text"
                value={createForm.city}
                onChange={(e) => setCreateForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Provincia</label>
              <input
                type="text"
                value={createForm.province}
                onChange={(e) => setCreateForm(f => ({ ...f, province: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>

            {/* Código Postal */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Código Postal</label>
              <input
                type="text"
                value={createForm.postalCode}
                onChange={(e) => setCreateForm(f => ({ ...f, postalCode: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>

            {/* IBAN */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">IBAN</label>
              <input
                type="text"
                value={createForm.iban}
                onChange={(e) => setCreateForm(f => ({ ...f, iban: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-cardBackground)] text-[var(--color-text)]"
              />
            </div>
          </div>

          {/* Consentimientos */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-[var(--color-text)]">Consentimientos de imagen</p>
            <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 bg-[var(--color-tableRowHover)]">
              <input
                type="checkbox"
                checked={createForm.imageConsentActivities}
                onChange={(e) => setCreateForm(f => ({ ...f, imageConsentActivities: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-textSecondary)]">
                Autorización para captación y publicación de imagen en fotografías y videos de actividades.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 bg-[var(--color-tableRowHover)]">
              <input
                type="checkbox"
                checked={createForm.imageConsentSocial}
                onChange={(e) => setCreateForm(f => ({ ...f, imageConsentSocial: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-textSecondary)]">
                Autorización para publicación de imagen en redes sociales de la asociación.
              </span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setCreateErrors({});
              }}
              disabled={createMemberMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSubmit}
              isLoading={createMemberMutation.isPending}
              disabled={createMemberMutation.isPending}
            >
              {createMemberMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </div>
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
            <p className="text-[var(--color-textSecondary)]">
              ¿Estás seguro que deseas dar de baja al siguiente miembro?
            </p>
            <div className="bg-[var(--color-tableRowHover)] p-4 rounded-lg">
              <p className="font-medium text-[var(--color-text)]">{selectedMember.name}</p>
              <p className="text-sm text-[var(--color-textSecondary)]">{selectedMember.email}</p>
              <p className="text-sm text-[var(--color-textSecondary)] mt-2">
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

      {/* Modal de confirmación de cambio de membresía */}
      <Modal
        isOpen={membershipChangeModalOpen}
        onClose={() => {
          setMembershipChangeModalOpen(false);
          setMembershipChangeReason('');
        }}
        title="Confirmar Cambio de Tipo de Membresía"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-textSecondary)]">
            Estás a punto de cambiar el tipo de membresía de:
          </p>
          <div className="bg-[var(--color-tableRowHover)] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{originalMembershipType}</span>
              <svg className="w-6 h-6 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="font-semibold text-[var(--color-primary)]">{profileForm.membershipType}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
              Motivo del cambio <span className="text-red-500">*</span>
            </label>
            <textarea
              value={membershipChangeReason}
              onChange={(e) => setMembershipChangeReason(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px]"
              placeholder="Explica brevemente por qué se cambia el tipo de membresía..."
              required
            />
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">
              Este cambio quedará registrado en el historial del miembro
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMembershipChangeModalOpen(false);
                setMembershipChangeReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!membershipChangeReason.trim()) {
                  error('El motivo del cambio es obligatorio');
                  return;
                }
                setMembershipChangeModalOpen(false);
                updateProfileMutation.mutate();
              }}
              disabled={!membershipChangeReason.trim()}
            >
              Confirmar Cambio
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

