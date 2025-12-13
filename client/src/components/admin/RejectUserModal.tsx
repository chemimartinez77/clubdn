// client/src/components/admin/RejectUserModal.tsx
import { useState } from 'react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';

interface RejectUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string } | null;
  onConfirm: (userId: string, reason?: string, customMessage?: string) => void;
  isLoading?: boolean;
}

const REJECTION_REASONS = [
  { value: '', label: 'Seleccionar motivo...' },
  { value: 'incomplete_info', label: 'Información incompleta' },
  { value: 'duplicate', label: 'Usuario duplicado' },
  { value: 'suspicious', label: 'Actividad sospechosa' },
  { value: 'other', label: 'Otro motivo' },
];

export default function RejectUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
  isLoading = false
}: RejectUserModalProps) {
  const [reason, setReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const handleConfirm = () => {
    if (user) {
      onConfirm(
        user.id,
        reason || undefined,
        customMessage.trim() || undefined
      );
      setReason('');
      setCustomMessage('');
      onClose();
    }
  };

  const handleClose = () => {
    setReason('');
    setCustomMessage('');
    onClose();
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rechazar Usuario" size="md">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-red-900">
                ¿Estás seguro de rechazar este usuario?
              </p>
              <p className="text-sm text-red-700 mt-1">
                El usuario recibirá un email informando sobre el rechazo.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Usuario:</p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Motivo del rechazo (opcional)
          </label>
          <select
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={isLoading}
          >
            {REJECTION_REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje adicional (opcional)
          </label>
          <textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            rows={3}
            placeholder="Escribe información adicional si es necesario..."
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Este mensaje se incluirá en el email de rechazo
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
          variant="danger"
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          Rechazar Usuario
        </Button>
      </ModalFooter>
    </Modal>
  );
}
