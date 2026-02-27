// client/src/components/tour/TourDismissBar.tsx
// Barra flotante que aparece durante cualquier tour.
// - La ✕ cierra el tour sin guardar preferencia (volverá a aparecer)
// - "No volver a mostrar" cierra y guarda la preferencia permanente

interface TourDismissBarProps {
  onClose: () => void;        // cerrar sin guardar
  onDismiss: () => void;      // cerrar y guardar permanente
}

export default function TourDismissBar({ onClose, onDismiss }: TourDismissBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100001,
        background: 'var(--color-cardBackground)',
        border: '1px solid var(--color-cardBorder)',
        borderRadius: '999px',
        padding: '0.45rem 0.75rem 0.45rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        fontSize: '0.8rem',
        color: 'var(--color-textSecondary)',
        whiteSpace: 'nowrap',
        userSelect: 'none'
      }}
    >
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--color-textSecondary)',
          fontSize: '0.8rem',
          textDecoration: 'underline',
          textUnderlineOffset: '2px'
        }}
      >
        No volver a mostrar
      </button>

      <span style={{ color: 'var(--color-cardBorder)', fontSize: '1rem', lineHeight: 1 }}>|</span>

      <button
        onClick={onClose}
        aria-label="Cerrar tour"
        style={{
          background: 'none',
          border: 'none',
          padding: '0.1rem 0.2rem',
          cursor: 'pointer',
          color: 'var(--color-textSecondary)',
          fontSize: '1rem',
          lineHeight: 1,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ✕
      </button>
    </div>
  );
}
