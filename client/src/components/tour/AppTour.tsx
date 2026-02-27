// client/src/components/tour/AppTour.tsx
import { useEffect, useRef, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface AppTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function AppTour({ onDismiss }: AppTourProps) {
  const [neverShow, setNeverShow] = useState(false);
  // Ref para que los callbacks del driver siempre lean el valor más reciente
  const neverShowRef = useRef(false);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    neverShowRef.current = neverShow;
  }, [neverShow]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const handleFinish = () => {
      onDismissRef.current(neverShowRef.current);
    };

    const driverObj = driver({
      showProgress: true,
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar',
      animate: true,
      overlayOpacity: 0.6,
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'clubdn-tour-popover',
      onDestroyStarted: () => {
        driverObj.destroy();
        handleFinish();
      },
      steps: [
        {
          element: '#dashboard-welcome',
          popover: {
            title: '¡Bienvenido al Club DN! 👋',
            description:
              'Esta es tu página de inicio. Aquí verás un resumen de tu actividad y podrás acceder rápidamente a todo lo que necesitas.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#nav-inicio',
          popover: {
            title: 'Inicio',
            description:
              'Vuelve siempre a esta pantalla pulsando en "Inicio" en la barra de navegación.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#nav-calendario',
          popover: {
            title: 'Calendario de Eventos',
            description:
              'Aquí encontrarás todas las partidas y eventos organizados por el club. Puedes apuntarte, ver detalles y estar al día de todo.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#nav-feedback',
          popover: {
            title: 'Feedback',
            description:
              '¿Tienes alguna sugerencia o encontraste un problema? Cuéntanoslo aquí. Valoramos mucho tu opinión.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#nav-user-menu',
          popover: {
            title: 'Tu Perfil y Logros',
            description:
              'Pulsa aquí para acceder a tu perfil, personalizar tu cuenta y ver los logros que has conseguido jugando en el club.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#dashboard-quick-actions',
          popover: {
            title: '¡Listo para jugar! 🎲',
            description:
              'Desde aquí puedes organizar una partida, ver eventos próximos o explorar la ludoteca del club. ¡Bienvenido!',
            side: 'left',
            align: 'start'
          }
        }
      ]
    });

    driverObj.drive();

    return () => {
      driverObj.destroy();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100000,
        background: 'var(--color-cardBackground)',
        border: '1px solid var(--color-cardBorder)',
        borderRadius: '8px',
        padding: '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '0.85rem',
        color: 'var(--color-text)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap'
      }}
      onClick={() => setNeverShow(prev => !prev)}
    >
      <input
        type="checkbox"
        checked={neverShow}
        onChange={e => setNeverShow(e.target.checked)}
        onClick={e => e.stopPropagation()}
        style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
      />
      No volver a mostrar este tour
    </div>
  );
}
