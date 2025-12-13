// client/src/components/admin/ApproveUserModal.tsx
import { useState } from 'react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';

interface ApproveUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string } | null;
  onConfirm: (userId: string, customMessage?: string) => void;
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

  const handleConfirm = () => {
    if (user) {
      onConfirm(user.id, customMessage.trim() || undefined);
      setCustomMessage('');
      onClose();
    }
  };

  const handleClose = () => {
    setCustomMessage('');
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
          <p className="text-sm font-medium text-gray-700 mb-1">Usuario:</p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje personalizado (opcional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            rows={3}
            placeholder="Escribe un mensaje de bienvenida..."
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
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
