import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useToast } from '../../hooks/useToast';
import ApproveUserModal from '../../components/admin/ApproveUserModal';
import RejectUserModal from '../../components/admin/RejectUserModal';

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

type RegistrationUser = ReturnType<typeof useAdminUsers>['pendingUsers'][number];

const statusLabels: Record<string, string> = {
  PENDING_VERIFICATION: 'Pendiente de verificación',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const statusClasses: Record<string, string> = {
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function buildVerificationLabel(user: RegistrationUser) {
  if (user.status === 'PENDING_APPROVAL' || user.emailVerified) {
    return 'Correo verificado';
  }

  if (user.verificationEmailSentAt) {
    return `Enviado ${formatDate(user.verificationEmailSentAt)}`;
  }

  return 'No consta envío';
}

function buildResolutionLabel(user: RegistrationUser) {
  if (user.status === 'APPROVED') {
    return `Aprobado por ${user.approvedByName || 'Administrador'} · ${formatDate(user.approvedAt)}`;
  }

  if (user.status === 'REJECTED') {
    const reasonSuffix = user.rejectionReason ? ` · ${user.rejectionReason}` : '';
    return `Rechazado por ${user.rejectedByName || 'Administrador'} · ${formatDate(user.rejectedAt)}${reasonSuffix}`;
  }

  if (user.status === 'PENDING_APPROVAL') {
    return 'Pendiente de revisión administrativa';
  }

  return user.tokenExpiry
    ? `Token válido hasta ${formatDate(user.tokenExpiry)}`
    : 'Pendiente de verificar email';
}

export default function PendingApprovals() {
  const {
    pendingUsers,
    isLoading,
    error,
    refetch,
    approveUser,
    rejectUser,
    revokeRegistration,
    resendVerification,
    isApproving,
    isRejecting,
    isRevoking,
    isResendingVerification,
  } = useAdminUsers();
  const { success, error: showError } = useToast();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  useEffect(() => {
    if (location.state && typeof location.state === 'object' && 'refreshPending' in location.state) {
      refetch();
    }
  }, [location.state, refetch]);

  const counters = useMemo(() => ({
    pendingVerification: pendingUsers.filter((user) => user.status === 'PENDING_VERIFICATION').length,
    pendingApproval: pendingUsers.filter((user) => user.status === 'PENDING_APPROVAL').length,
    approved: pendingUsers.filter((user) => user.status === 'APPROVED').length,
    rejected: pendingUsers.filter((user) => user.status === 'REJECTED').length,
  }), [pendingUsers]);

  const handleApprove = (user: SelectedUser) => {
    setSelectedUser(user);
    setApproveModalOpen(true);
  };

  const handleReject = (user: SelectedUser) => {
    setSelectedUser(user);
    setRejectModalOpen(true);
  };

  const handleConfirmApprove = async (userId: string, membershipType: string, customMessage?: string) => {
    try {
      await approveUser({ userId, membershipType, customMessage });
      success('Usuario aprobado exitosamente');
      setApproveModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al aprobar usuario';
      showError(msg);
    }
  };

  const handleConfirmReject = async (userId: string, reason?: string, customMessage?: string) => {
    try {
      await rejectUser({ userId, reason, customMessage });
      success('Usuario rechazado');
      setRejectModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al rechazar usuario';
      showError(msg);
    }
  };

  const handleRevoke = async (user: SelectedUser) => {
    const confirmed = window.confirm(
      `Se revocará el registro de ${user.name}. Esto eliminará la solicitud pendiente y permitirá volver a registrarse con ese email.`
    );
    if (!confirmed) return;

    try {
      await revokeRegistration({ userId: user.id });
      success('Registro revocado correctamente');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al revocar el registro';
      showError(msg);
    }
  };

  const handleResendVerification = async (user: SelectedUser) => {
    try {
      await resendVerification({ userId: user.id });
      success('Correo de verificación reenviado');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al reenviar el correo de verificación';
      showError(msg);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              Seguimiento de registros
            </h1>
            <p className="mt-1 text-[var(--color-textSecondary)]">
              Supervisa altas pendientes, verifica correos enviados y revoca solicitudes atascadas.
            </p>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isLoading}
            size="sm"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-sm text-[var(--color-textSecondary)]">Pend. verificación</p><p className="text-2xl font-bold text-amber-700">{counters.pendingVerification}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-[var(--color-textSecondary)]">Pend. aprobación</p><p className="text-2xl font-bold text-blue-700">{counters.pendingApproval}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-[var(--color-textSecondary)]">Aprobados</p><p className="text-2xl font-bold text-green-700">{counters.approved}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-[var(--color-textSecondary)]">Rechazados</p><p className="text-2xl font-bold text-red-700">{counters.rejected}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                Registro de solicitudes
              </h2>
              {!isLoading && (
                <span className="inline-flex items-center rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-sm font-medium text-[var(--color-primary-800)]">
                  {pendingUsers.length} {pendingUsers.length === 1 ? 'registro' : 'registros'}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-primary)]"></div>
                  <p className="text-[var(--color-textSecondary)]">Cargando registros...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="max-w-md text-center">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Error al cargar registros</h3>
                  <p className="mb-4 text-[var(--color-textSecondary)]">No se pudo obtener el seguimiento de registros.</p>
                  <Button onClick={() => refetch()} variant="primary">Reintentar</Button>
                </div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">No hay registros</h3>
                  <p className="text-[var(--color-textSecondary)]">Todavía no hay solicitudes de alta en el sistema.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[var(--color-tableRowHover)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-textSecondary)]">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-textSecondary)]">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-textSecondary)]">Registrado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-textSecondary)]">Verificación email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-textSecondary)]">Seguimiento</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-textSecondary)]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-[var(--color-cardBackground)]">
                    {pendingUsers.map((user) => {
                      const isPendingApproval = user.status === 'PENDING_APPROVAL';
                      const isPendingVerification = user.status === 'PENDING_VERIFICATION';
                      const canRevoke = isPendingApproval || isPendingVerification;

                      return (
                        <tr key={user.id} className="transition-colors hover:bg-[var(--color-tableRowHover)]">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${statusClasses[user.status] || 'bg-slate-100 text-slate-700'}`}>
                                <span className="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="ml-4 min-w-0">
                                <div className="text-sm font-medium text-[var(--color-text)]">{user.name}</div>
                                <div className="truncate text-sm text-[var(--color-textSecondary)]">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClasses[user.status] || 'bg-slate-100 text-slate-700'}`}>
                              {statusLabels[user.status] || user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text)]">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[var(--color-text)]">{buildVerificationLabel(user)}</p>
                            {user.tokenExpiry && isPendingVerification && (
                              <p className="text-xs text-[var(--color-textSecondary)]">Caduca: {formatDate(user.tokenExpiry)}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[var(--color-text)]">{buildResolutionLabel(user)}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {isPendingApproval && (
                                <>
                                  <Button
                                    onClick={() => handleApprove({ id: user.id, name: user.name, email: user.email })}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                    disabled={isApproving || isRejecting || isRevoking}
                                  >
                                    Aprobar
                                  </Button>
                                  <Button
                                    onClick={() => handleReject({ id: user.id, name: user.name, email: user.email })}
                                    variant="danger"
                                    size="sm"
                                    disabled={isApproving || isRejecting || isRevoking}
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              )}

                              {isPendingVerification && (
                                <Button
                                  onClick={() => handleResendVerification({ id: user.id, name: user.name, email: user.email })}
                                  variant="outline"
                                  size="sm"
                                  disabled={isResendingVerification || isRevoking}
                                >
                                  Reenviar verificación
                                </Button>
                              )}

                              {canRevoke && (
                                <Button
                                  onClick={() => handleRevoke({ id: user.id, name: user.name, email: user.email })}
                                  variant="outline"
                                  size="sm"
                                  disabled={isRevoking || isApproving || isRejecting || isResendingVerification}
                                >
                                  Revocar registro
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ApproveUserModal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={handleConfirmApprove}
        isLoading={isApproving}
      />

      <RejectUserModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={handleConfirmReject}
        isLoading={isRejecting}
      />
    </Layout>
  );
}
