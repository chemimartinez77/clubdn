// client/src/components/tour/FeedbackTour.tsx
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import TourDismissBar from './TourDismissBar';

interface FeedbackTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function FeedbackTour({ onDismiss }: FeedbackTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const onDismissRef = useRef(onDismiss);
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
        onDismissRef.current(false);
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

    driverRef.current = driverObj;
    driverObj.drive();

    return () => { driverObj.destroy(); };
  }, []);

  const handleClose = () => {
    driverRef.current?.destroy();
    onDismissRef.current(false);
  };

  const handleDismiss = () => {
    driverRef.current?.destroy();
    onDismissRef.current(true);
  };

  return <TourDismissBar onClose={handleClose} onDismiss={handleDismiss} />;
}
