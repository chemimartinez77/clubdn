// client/src/logic/ViernesImages.ts
// Rutas de imágenes para el juego Viernes.
// Las imágenes viven en client/public/viernes/
// Cada carta de peligro/habilidad tiene su imageFile en HazardCard directamente.

// ─── Reversos ─────────────────────────────────────────────────────────────────

export const HAZARD_BACK_IMAGE   = '/viernes/traseranormal.jpg';
export const PIRATE_BACK_IMAGE   = '/viernes/traserapiratas.png';
export const ROBINSON_BACK_IMAGE = '/viernes/traseranormal.jpg';

// ─── Imagen de carta de peligro/habilidad ─────────────────────────────────────
// La carta tiene imageFile (ej: "carta_06_08.png").
// - Cara peligro:   rotar 180° (transform: rotate(180deg))
// - Cara habilidad: sin rotación

export function getHazardCardImage(imageFile: string): string {
  return `/viernes/${imageFile}`;
}

// ─── Cartas de Robinson iniciales y de envejecimiento ────────────────────────
// Deck 04-05: cartas iniciales de Robinson

const ROBINSON_IMAGES: Record<string, string> = {
  'Genial':          '/viernes/carta_05_04.png',
  'Concentrado':     '/viernes/carta_05_05.png',
  'Normal':          '/viernes/carta_04_02.png',
  'Desconcentrado':  '/viernes/carta_04_01.png',
  'Comiendo':        '/viernes/carta_05_08.png',
};

const AGING_IMAGES: Record<string, string> = {
  'Desconcentrado':  '/viernes/carta_04_07.png',
  'Muy Estúpido':    '/viernes/carta_03_07.png',
  'Asustado':        '/viernes/carta_05_09.png',
  'Muy cansado':     '/viernes/carta_05_10.png',
  'Hambriento':      '/viernes/carta_03_05.png',
  'Muy hambriento':  '/viernes/carta_03_03.png',
  'Suicida':         '/viernes/carta_03_08.png',
};

const PIRATE_IMAGES: Record<string, string> = {
  'Pirata Viejo':   '/viernes/carta_03_01.png',
  'Capitán Pirata': '/viernes/carta_02_04.png',
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

// Para cartas HAZARD_WON en el mazo de Robinson: usar imageFile si está disponible,
// o buscar por nombre de habilidad como fallback.
const SKILL_IMAGES: Record<string, string> = {
  'Repetición':   '/viernes/carta_07_06.png',
  'Nutrición':    '/viernes/carta_01_02.png',
  'Estrategia':   '/viernes/carta_01_03.png',
  'Arma':         '/viernes/carta_01_04.png',
  'Equipamiento': '/viernes/carta_01_08.png',
  'Conocimiento': '/viernes/carta_07_02.png',
  'Mimetismo':    '/viernes/carta_06_03.png',
  'Truco':        '/viernes/carta_02_01.png',
  'Visión':       '/viernes/carta_07_01.png',
  'Experiencia':  '/viernes/carta_07_03.png',
  'Lectura':      '/viernes/carta_02_02.png',
};

export function getSkillCardImage(skillName: string): string {
  return SKILL_IMAGES[skillName] ?? ROBINSON_BACK_IMAGE;
}
