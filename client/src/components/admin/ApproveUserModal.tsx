// client/src/components/admin/ApproveUserModal.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../api/axios';
import type { ClubConfig, MembershipType } from '../../types/config';
import type { ApiResponse } from '../../types/auth';

interface ApproveUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string } | null;
  onConfirm: (userId: string, membershipType: MembershipType, customMessage?: string) => void;
  isLoading?: boolean;
}

export default function ApproveUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
  isLoading = false
}: ApproveUserModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType>('EN_PRUEBAS');

  const { data: config } = useQuery({
    queryKey: ['clubConfig'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ClubConfig>>('/api/config');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const membershipOptions = config?.membershipTypes
    .filter(mt => mt.type !== 'BAJA')
    .map(mt => ({
      value: mt.type,
      label: mt.price > 0
        ? `${mt.displayName} (${mt.price}${config.defaultCurrency === 'EUR' ? '€' : config.defaultCurrency}/mes)`
        : mt.displayName
    })) ?? [
    { value: 'EN_PRUEBAS', label: 'En Pruebas' },
    { value: 'COLABORADOR', label: 'Colaborador' },
    { value: 'SOCIO', label: 'Socio' },
    { value: 'FAMILIAR', label: 'Familiar' },
  ];

  const handleConfirm = () => {
    if (user) {
      onConfirm(user.id, membershipType, customMessage.trim() || undefined);
      setCustomMessage('');
      setMembershipType('EN_PRUEBAS');
      onClose();
    }
  };

  const handleClose = () => {
    setCustomMessage('');
    setMembershipType('EN_PRUEBAS');
    onClose();
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Aprobar Usuario" size="md">
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-green-900">
                ¿Estás seguro de aprobar este usuario?
              </p>
              <p className="text-sm text-green-700 mt-1">
                El usuario recibirá un email de confirmación y podrá acceder a la plataforma.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-1">Usuario:</p>
          <div className="bg-[var(--color-tableRowHover)] rounded-lg p-3">
            <p className="font-medium text-[var(--color-text)]">{user.name}</p>
            <p className="text-sm text-[var(--color-textSecondary)]">{user.email}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
            Tipo de membresía <span className="text-red-500">*</span>
          </label>
          <select
            value={membershipType}
            onChange={(e) => setMembershipType(e.target.value as MembershipType)}
            className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-[var(--color-surface)] text-[var(--color-text)]"
            disabled={isLoading}
          >
            {membershipOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
            Mensaje personalizado (opcional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            rows={3}
            placeholder="Escribe un mensaje de bienvenida..."
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-[var(--color-textSecondary)]">
            Este mensaje se incluirá en el email de aprobación
          </p>
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isLoading={isLoading}
          className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        >
          Aprobar Usuario
        </Button>
      </ModalFooter>
    </Modal>
  );
}
