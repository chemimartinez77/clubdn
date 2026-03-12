// client/src/data/tips.ts

export interface Tip {
  id: number;
  text: string;
}

export const TIPS: Tip[] = [
  { id: 1,  text: 'Pulsa sobre el nick de un usuario para ver su perfil y sus partidas jugadas.' },
  { id: 2,  text: 'Puedes compartir una partida en WhatsApp directamente desde la página del evento.' },
  { id: 3,  text: 'Los logros se desbloquean automáticamente al completar una partida, no al apuntarte.' },
  { id: 4,  text: 'Si una partida requiere aprobación, el organizador recibe una notificación cuando alguien solicita unirse.' },
  { id: 5,  text: 'Puedes cambiar entre modo claro y oscuro desde tu perfil.' },
  { id: 6,  text: 'El QR de una invitación es válido hasta que se use, se cancele o expire.' },
  { id: 7,  text: 'Desde la página de una partida puedes añadir el evento directamente a tu calendario.' },
  { id: 8,  text: 'Si te has apuntado a una partida pero no puedes ir, avisa al organizador usando "No asistiré" para que otra persona pueda entrar.' },
  { id: 9,  text: 'Los socios y colaboradores pueden invitar a externos mediante un enlace personalizado de WhatsApp.' },
  { id: 10, text: 'El logro "Repetidor" se consigue jugando al mismo juego de mesa 3 veces o más.' },
  { id: 11, text: 'Puedes ver el historial completo de partidas jugadas en el perfil de cualquier miembro.' },
  { id: 12, text: 'El calendario de partidas filtra automáticamente por estado: próximas, en curso y finalizadas.' },
  { id: 13, text: 'Las partidas con lista de espera te notifican si se libera una plaza.' },
  { id: 14, text: 'Puedes dejar feedback sobre la app desde el menú principal; lo leeremos encantados.' },
  { id: 15, text: 'El logro "Organizador" se desbloquea organizando partidas para el club. ¡Anímate a crear la tuya!' },
];

export const getRandomTip = (): Tip => {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
};

export const getRandomTipExcluding = (excludeId: number): Tip => {
  const others = TIPS.filter(t => t.id !== excludeId);
  return others[Math.floor(Math.random() * others.length)];
};

const TIP_STORAGE_KEY = 'lastTipShown';

export const shouldShowTip = (): boolean => {
  const last = localStorage.getItem(TIP_STORAGE_KEY);
  if (!last) return true;
  const lastDate = new Date(last);
  const now = new Date();
  // Diferencia en horas
  const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  return diffHours >= 24;
};

export const markTipShown = (): void => {
  localStorage.setItem(TIP_STORAGE_KEY, new Date().toISOString());
};
