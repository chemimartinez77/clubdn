// client/src/components/tour/FeedbackTour.tsx
import { useEffect, useRef, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface FeedbackTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function FeedbackTour({ onDismiss }: FeedbackTourProps) {
  const [neverShow, setNeverShow] = useState(false);
  const neverShowRef = useRef(false);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => { neverShowRef.current = neverShow; }, [neverShow]);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    const handleFinish = () => onDismissRef.current(neverShowRef.current);

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
          element: '#feedback-header',
          popover: {
            title: 'Feedback y Bugs 🐛',
            description:
              'Esta sección es tu canal directo con el equipo. Puedes reportar fallos, proponer mejoras y ver en qué está trabajando el equipo.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#feedback-form',
          popover: {
            title: 'Enviar un reporte',
            description:
              'Rellena este formulario para informar de un bug o sugerir una mejora. Puedes adjuntar una captura de pantalla para que sea más fácil entender el problema.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#feedback-submit-btn',
          popover: {
            title: 'Tipos de reporte',
            description:
              'Elige "Bug" si algo no funciona como debería, o "Mejora" si tienes una idea para hacer la web mejor. La gravedad percibida ayuda a priorizar.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#feedback-board',
          popover: {
            title: 'Tablero público',
            description:
              'Aquí puedes ver todos los reportes enviados por la comunidad. Puedes votar los que más te importen para ayudar a priorizarlos.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#feedback-filters',
          popover: {
            title: 'Filtros del tablero',
            description:
              '"Mis reportes" muestra solo los tuyos. "Más votados" los ordena por votos. También puedes filtrar por estado para ver qué está en revisión, en progreso o ya resuelto.',
            side: 'bottom',
            align: 'start'
          }
        }
      ]
    });

    driverObj.drive();

    return () => { driverObj.destroy(); };
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
