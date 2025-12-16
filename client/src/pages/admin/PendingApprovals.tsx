// client/src/pages/admin/PendingApprovals.tsx
import { useState } from 'react';
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

export default function PendingApprovals() {
  const { pendingUsers, isLoading, error, refetch, approveUser, rejectUser, isApproving, isRejecting } = useAdminUsers();
  const { success, error: showError } = useToast();
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const handleApprove = (user: SelectedUser) => {
    setSelectedUser(user);
    setApproveModalOpen(true);
  };

  const handleReject = (user: SelectedUser) => {
    setSelectedUser(user);
    setRejectModalOpen(true);
  };

  const handleConfirmApprove = async (userId: string, customMessage?: string) => {
    try {
      await approveUser({ userId, customMessage });
      success('Usuario aprobado exitosamente');
      setApproveModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      showError('Error al aprobar usuario');
    }
  };

  const handleConfirmReject = async (userId: string, reason?: string, customMessage?: string) => {
    try {
      await rejectUser({ userId, reason, customMessage });
      success('Usuario rechazado');
      setRejectModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      showError('Error al rechazar usuario');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Solicitudes Pendientes
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona las solicitudes de registro de nuevos usuarios
            </p>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isLoading}
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </Button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Usuarios Pendientes de Aprobación
              </h2>
              {!isLoading && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-800)]">
                  {pendingUsers.length} {pendingUsers.length === 1 ? 'usuario' : 'usuarios'}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando solicitudes...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Error al cargar solicitudes
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No se pudieron cargar las solicitudes pendientes. Por favor, intenta de nuevo.
                  </p>
                  <Button onClick={() => refetch()} variant="primary">
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay solicitudes pendientes
                  </h3>
                  <p className="text-gray-600">
                    Todas las solicitudes han sido procesadas
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Registro
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center">
                                <span className="text-[var(--color-primary)] font-semibold text-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleApprove({ id: user.id, name: user.name, email: user.email })}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                              disabled={isApproving || isRejecting}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Aprobar
                            </Button>
                            <Button
                              onClick={() => handleReject({ id: user.id, name: user.name, email: user.email })}
                              variant="danger"
                              size="sm"
                              disabled={isApproving || isRejecting}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Rechazar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
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
