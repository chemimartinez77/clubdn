// client/src/components/tour/CalendarTour.tsx
import { useEffect, useRef, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface CalendarTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function CalendarTour({ onDismiss }: CalendarTourProps) {
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
          element: '#events-header',
          popover: {
            title: 'Calendario de Eventos 📅',
            description:
              'Aquí encontrarás todos los eventos y partidas organizados por el club. Puedes verlos en formato calendario o como lista.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#events-view-toggle',
          popover: {
            title: 'Vista Lista o Calendario',
            description:
              'Alterna entre la vista de lista (para buscar y filtrar) y la vista de calendario (para ver los eventos por día, semana o mes).',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#events-calendar-controls',
          popover: {
            title: 'Navegar por el calendario',
            description:
              'Usa las flechas para moverte entre meses, semanas o días. El botón "Hoy" te lleva directamente a la fecha actual.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#events-calendar-view-selector',
          popover: {
            title: 'Mes, Semana o Día',
            description:
              'Elige cómo quieres ver el calendario: vista mensual para una perspectiva amplia, semanal para ver la semana en detalle, o diaria para ver las partidas de un día concreto.',
            side: 'bottom',
            align: 'end'
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
