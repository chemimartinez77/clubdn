// client/src/components/tour/CreatePartidaTour.tsx
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import TourDismissBar from './TourDismissBar';

interface CreatePartidaTourProps {
  onDismiss: (permanent: boolean) => void;
}

export default function CreatePartidaTour({ onDismiss }: CreatePartidaTourProps) {
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
          element: '#create-partida-header',
          popover: {
            title: 'Organizar una Partida 🎲',
            description:
              'Desde aquí puedes crear una partida para jugar con otros miembros del club. Rellena los campos y en un momento estará lista.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#create-partida-game',
          popover: {
            title: 'Elige el juego',
            description:
              'Busca el juego en BoardGameGeek para añadir imagen y título automáticamente. También puedes elegir la categoría manualmente para que los demás miembros ganen badges al participar.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#create-partida-title',
          popover: {
            title: 'Título y descripción',
            description:
              'El título se rellena solo si seleccionas un juego, pero puedes cambiarlo. La descripción es opcional: úsala para dar contexto, nivel de experiencia requerido, etc.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#create-partida-datetime',
          popover: {
            title: 'Fecha y hora',
            description:
              'Elige cuándo se jugará la partida. Si vienes desde el calendario, la fecha ya estará preseleccionada.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#create-partida-attendees',
          popover: {
            title: 'Número de jugadores',
            description:
              'Indica el máximo de jugadores que caben en la partida, incluyéndote a ti. Una vez se alcance el límite, los demás entrarán en lista de espera.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#create-partida-submit',
          popover: {
            title: '¡A jugar!',
            description:
              'Cuando lo tengas todo listo, pulsa "Guardar" para publicar la partida. Aparecerá en el calendario y los demás miembros podrán apuntarse.',
            side: 'top',
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
