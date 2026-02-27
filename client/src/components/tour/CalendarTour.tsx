// client/src/components/tour/CalendarTour.tsx
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import TourDismissBar from './TourDismissBar';

interface CalendarTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function CalendarTour({ onDismiss }: CalendarTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const onDismissRef = useRef(onDismiss);
  const handledRef = useRef(false);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
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
        if (!handledRef.current) {
          handledRef.current = true;
          onDismissRef.current(false);
        }
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
              'Elige cómo quieres ver el calendario: mensual para una perspectiva amplia, semanal para el detalle de la semana, o diaria para ver las partidas de un día concreto.',
            side: 'bottom',
            align: 'end'
          }
        }
      ]
    });

    driverRef.current = driverObj;
    driverObj.drive();

    return () => { driverObj.destroy(); };
  }, []);

  const handleClose = () => {
    handledRef.current = true;
    driverRef.current?.destroy();
    onDismissRef.current(false);
  };

  const handleDismiss = () => {
    handledRef.current = true;
    driverRef.current?.destroy();
    onDismissRef.current(true);
  };

  return <TourDismissBar onClose={handleClose} onDismiss={handleDismiss} />;
}
