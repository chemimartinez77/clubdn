// client/src/components/tour/AppTour.tsx
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface AppTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function AppTour({ onDismiss }: AppTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const onDismissRef = useRef(onDismiss);
  const handledRef = useRef(false);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    const desktopNavSteps = [
      {
        element: '#nav-inicio',
        popover: {
          title: 'Inicio',
          description:
            'Vuelve siempre a esta pantalla pulsando en "Inicio" en la barra de navegación.',
          side: 'bottom' as const,
          align: 'start' as const
        }
      },
      {
        element: '#nav-calendario',
        popover: {
          title: 'Calendario de Eventos',
          description:
            'Aquí encontrarás todas las partidas y eventos organizados por el club. Puedes apuntarte, ver detalles y estar al día de todo.',
          side: 'bottom' as const,
          align: 'start' as const
        }
      },
      {
        element: '#nav-feedback',
        popover: {
          title: 'Feedback',
          description:
            '¿Tienes alguna sugerencia o encontraste un problema? Cuéntanoslo aquí. Valoramos mucho tu opinión.',
          side: 'bottom' as const,
          align: 'start' as const
        }
      },
      {
        element: '#nav-user-menu',
        popover: {
          title: 'Tu Perfil y Logros',
          description:
            'Pulsa aquí para acceder a tu perfil, personalizar tu cuenta y ver los logros que has conseguido jugando en el club.',
          side: 'bottom' as const,
          align: 'end' as const
        }
      },
    ];

    const mobileNavStep = [
      {
        element: '#mobile-menu-button',
        popover: {
          title: 'Menú de navegación',
          description:
            'Pulsa aquí para abrir el menú. Desde ahí puedes acceder al Calendario, Feedback, tu Perfil y todo lo demás.',
          side: 'bottom' as const,
          align: 'end' as const
        }
      },
    ];

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
      onPopoverRender: (popover) => {
        const btn = document.createElement('button');
        btn.innerText = 'No volver a mostrar';
        btn.className = 'tour-dismiss-btn';
        btn.addEventListener('click', () => {
          handledRef.current = true;
          driverObj.destroy();
          onDismissRef.current(true);
        });
        popover.footerButtons.prepend(btn);
      },
      onDestroyStarted: () => {
        driverObj.destroy();
        if (!handledRef.current) {
          handledRef.current = true;
          onDismissRef.current(false);
        }
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
        ...(isMobile ? mobileNavStep : desktopNavSteps),
        {
          element: '#dashboard-quick-actions',
          popover: {
            title: '¡Listo para jugar! 🎲',
            description:
              'Desde aquí puedes organizar una partida, ver eventos próximos o explorar la ludoteca del club. ¡Bienvenido!',
            side: isMobile ? 'bottom' : 'left',
            align: 'start'
          }
        }
      ]
    });

    driverRef.current = driverObj;
    driverObj.drive();

    return () => { driverObj.destroy(); };
  }, []);

  return null;
}
