// client/src/logic/ViernesImages.ts
// Mapa de nombre de carta → imagen en /viernes/
// Las imágenes viven en client/public/viernes/

// ─── Cartas de Robinson (inicio + habilidades ganadas) ────────────────────────
// Deck 04-05: cartas de inicio de Robinson
// Deck 01, 06, 07: cartas de habilidad (lado superviviente de peligros ganados)

const ROBINSON_IMAGES: Record<string, string> = {
  // Cartas iniciales Robinson (valor negativo)
  'Desconcentrado':   '/viernes/carta_04_01.png',
  // Cartas iniciales Robinson (valor 0 — "Normal" / "Verhängnis")
  'Normal':           '/viernes/carta_04_02.png',
  // Cartas iniciales Robinson (valor 1 — "Concentrado" / "Satt")
  'Concentrado':      '/viernes/carta_05_05.png',
  // Cartas iniciales Robinson (valor 4 — "Genial" / "Genie")
  'Genial':           '/viernes/carta_05_04.png',
  // Carta especial inicial: Comilón / +2 vida
  'Comilón':          '/viernes/carta_05_08.png',

  // Habilidades ganadas al superar peligros
  'Repetición':       '/viernes/carta_07_06.png',
  'Nutrición':        '/viernes/carta_01_02.png',
  'Estrategia':       '/viernes/carta_01_03.png',
  'Arma':             '/viernes/carta_01_04.png',
  'Equipamiento':     '/viernes/carta_01_08.png',
  'Conocimiento':     '/viernes/carta_07_02.png',
  'Mimetismo':        '/viernes/carta_06_03.png',
  'Truco':            '/viernes/carta_02_01.png',
  'Visión':           '/viernes/carta_07_01.png',
  'Experiencia':      '/viernes/carta_07_03.png',
  'Lectura':          '/viernes/carta_02_02.png',
};

// ─── Cartas de envejecimiento ─────────────────────────────────────────────────
// Deck 03: Muy hambriento(-2), Hambriento(+1vida), Desconcentrado(-1), Asustado(carta alta=0)
//          Estúpido(-2), Suicida(-5), Idiota(-4), Muy Estúpido(-3)
// Deck 06: Estúpido(-2) — envejecimiento leve

const AGING_IMAGES: Record<string, string> = {
  'Hambre leve':       '/viernes/carta_04_07.png',   // Desconcentrado / -1 (aging leve)
  'Enfermedad leve':   '/viernes/carta_05_10.png',   // Stop (aging leve)
  'Agotamiento leve':  '/viernes/carta_06_01.png',   // Estúpido -2 (aging leve)
  'Enfermedad grave':  '/viernes/carta_03_06.png',   // Asustado stop (aging severo)
  'Hambre grave (-2)': '/viernes/carta_03_03.png',   // Muy hambriento -2 vida
  'Hambre grave (-3)': '/viernes/carta_03_10.png',   // Muy estúpido -3
  'Agotamiento grave': '/viernes/carta_03_09.png',   // Idiota -4
  'Muerte':            '/viernes/carta_03_08.png',   // Suicida -5
};

// ─── Cartas de peligro (reverso = hazard, anverso = habilidad ganada) ─────────
// Las cartas de peligro NO tienen imagen individual distinta por nombre —
// mostramos el reverso genérico. Cuando se gana, la carta pasa a ser una
// carta de habilidad con el survivorValue.

export const HAZARD_BACK_IMAGE  = '/viernes/traseranormal.jpg';
export const PIRATE_BACK_IMAGE  = '/viernes/traserapiratas.png';
export const ROBINSON_BACK_IMAGE = '/viernes/traseranormal.jpg';

// ─── Cartas de piratas ────────────────────────────────────────────────────────
// Deck 02: 10 cartas de piratas (fightValue visible en la imagen)
// Las asignamos por orden de definición en el engine (fightValue 20 y 25)

const PIRATE_IMAGES: Record<string, string> = {
  'Pirata Viejo':   '/viernes/carta_03_01.png',   // Pirata simple (barco negro, fightValue 20)
  'Capitán Pirata': '/viernes/carta_02_04.png',   // Pirata con bandera roja (fightValue ~10+)
};

// ─── API pública ──────────────────────────────────────────────────────────────

export function getRobinsonCardImage(name: string): string {
  return ROBINSON_IMAGES[name] ?? ROBINSON_BACK_IMAGE;
}

export function getAgingCardImage(name: string): string {
  return AGING_IMAGES[name] ?? ROBINSON_BACK_IMAGE;
}

export function getPirateCardImage(name: string): string {
  return PIRATE_IMAGES[name] ?? PIRATE_BACK_IMAGE;
}

// Mapa del nombre del peligro → imagen de habilidad ganada
// Cada carta de peligro tiene una habilidad al ser conquistada (lado superviviente)
const HAZARD_WON_IMAGES: Record<string, string> = {
  'Hambre':      '/viernes/carta_06_05.png',  // Nutrición +1 vida (sv=1)
  'Lluvia':      '/viernes/carta_06_09.png',  // Experiencia +1 carta (sv=2)
  'Fuego':       '/viernes/carta_07_04.png',  // Nutrición +1 vida (sv=2)
  'Enfermedad':  '/viernes/carta_07_03.png',  // Experiencia +1 carta (sv=3)
  'Debilidad':   '/viernes/carta_06_07.png',  // Mimetismo 1x copiar (sv=3)
  'Araña':       '/viernes/carta_07_05.png',  // Truco 1x debajo pila (sv=4)
  'Serpiente':   '/viernes/carta_07_06.png',  // Repetición 1x duplicar (sv=4)
  'Humo':        '/viernes/carta_01_10.png',  // Conocimiento 1x destruir (sv=4)
  'Oso':         '/viernes/carta_07_02.png',  // Conocimiento 1x destruir (sv=5)
  'Jabalí':      '/viernes/carta_01_07.png',  // Estrategia 2x cambiar (sv=5)
  'Gorila':      '/viernes/carta_06_03.png',  // Mimetismo 1x copiar (sv=6)
  'Cocodrilo':   '/viernes/carta_01_08.png',  // Equipamiento +2 cartas (sv=6)
  'Podrido':     '/viernes/carta_07_09.png',  // Estrategia 1x cambiar (sv=6)
  'Caza':        '/viernes/carta_01_04.png',  // Arma (sv=7)
  'Tornado':     '/viernes/carta_07_01.png',  // Visión ordenar 3 cartas (sv=7)
  'Agotamiento': '/viernes/carta_01_03.png',  // Estrategia 1x cambiar (sv=8)
  'Traición':    '/viernes/carta_06_08.png',  // Visión ordenar 3 cartas (sv=8)
  'Catástrofe':  '/viernes/carta_07_07.png',  // Arma (sv=9)
};

export function getHazardWonCardImage(hazardName: string): string {
  return HAZARD_WON_IMAGES[hazardName] ?? ROBINSON_BACK_IMAGE;
}
