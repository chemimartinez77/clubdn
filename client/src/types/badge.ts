// client/src/types/badge.ts

export type BadgeCategory =
  | 'EUROGAMES'
  | 'TEMATICOS'
  | 'WARGAMES'
  | 'ROL'
  | 'MINIATURAS'
  | 'WARHAMMER'
  | 'FILLERS_PARTY'
  | 'CARTAS_LCG_TCG'
  | 'ABSTRACTOS'
  | 'CATALOGADOR'
  | 'ORGANIZADOR'
  | 'REPETIDOR'
  | 'INVITADOR'
  | 'VALIDADOR'
  | 'TESTIGO_MESA'
  | 'AUDITOR_LUDICO'
  | 'CONOCEDOR_GENEROS'
  | 'FOTOGRAFO'
  | 'PRIMER_JUGADOR'
  | 'GIRADOR_RULETA';

export interface BadgeDefinition {
  id: string;
  category: BadgeCategory;
  level: number;
  name: string;
  description?: string;
  iconUrl?: string;
  requiredCount: number;
  createdAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeDefinitionId: string;
  badgeDefinition: BadgeDefinition;
  unlockedAt: string;
  revealedAt?: string | null;
}

export interface BadgeProgress {
  count: number;
  nextBadge?: BadgeDefinition;
}

export interface BadgeStats {
  [key: string]: {
    category: BadgeCategory;
    count: number;
  };
}

export interface UserBadgesResponse {
  success: boolean;
  data: {
    unlockedBadges: UserBadge[];
    allBadges: BadgeDefinition[];
    progress: Record<BadgeCategory, BadgeProgress>;
  };
}

export interface GamePlayHistoryEntry {
  id: string;
  userId: string;
  eventId: string;
  gameName: string;
  gameCategory: BadgeCategory | null;
  playedAt: string;
  createdAt: string;
}

export interface GamePlayHistoryResponse {
  success: boolean;
  data: GamePlayHistoryEntry[];
}

export interface GameStatsResponse {
  success: boolean;
  data: BadgeStats;
}

export interface TrackGameRequest {
  userId: string;
  eventId: string;
  gameName: string;
  gameCategory?: BadgeCategory;
}

export const getCategoryDisplayName = (category: BadgeCategory): string => {
  const categoryNames: Record<BadgeCategory, string> = {
    EUROGAMES: 'Eurogames',
    TEMATICOS: 'Tematicos',
    WARGAMES: 'Wargames',
    ROL: 'Rol',
    MINIATURAS: 'Miniaturas',
    WARHAMMER: 'Warhammer',
    FILLERS_PARTY: 'Fillers / Party',
    CARTAS_LCG_TCG: 'Cartas / LCG / TCG',
    ABSTRACTOS: 'Abstractos',
    CATALOGADOR: 'Catalogador',
    CONOCEDOR_GENEROS: 'Conocedor de Generos',
    FOTOGRAFO: 'Fotografo',
    ORGANIZADOR: 'Organizador',
    REPETIDOR: 'Repetidor',
    INVITADOR: 'Invitador',
    VALIDADOR: 'Validador',
    TESTIGO_MESA: 'Testigo de Mesa',
    AUDITOR_LUDICO: 'Auditor Ludico',
    PRIMER_JUGADOR: 'Primer Jugador',
    GIRADOR_RULETA: 'Girador de Ruleta'
  };
  return categoryNames[category];
};

export const getCategoryDescription = (category: BadgeCategory): string => {
  const descriptions: Record<BadgeCategory, string> = {
    EUROGAMES: 'Se obtiene jugando partidas de juegos de estilo eurogame: gestion de recursos, optimizacion y poco azar.',
    TEMATICOS: 'Se obtiene jugando partidas de juegos tematicos: aventura, narrativa y ambientacion por encima de la mecanica.',
    WARGAMES: 'Se obtiene jugando partidas de wargames: simulacion de conflictos historicos o ficticios con mapas y unidades.',
    ROL: 'Se obtiene jugando partidas de juegos de rol de mesa, tanto de sistema como narrativos.',
    MINIATURAS: 'Se obtiene jugando partidas de juegos de miniaturas (excepto Warhammer, que tiene su propio logro).',
    WARHAMMER: 'Se obtiene jugando partidas de cualquier juego del universo Warhammer (40K, Age of Sigmar, etc.).',
    FILLERS_PARTY: 'Se obtiene jugando partidas de fillers o juegos de fiesta: rapidos, sencillos y para animar cualquier reunion.',
    CARTAS_LCG_TCG: 'Se obtiene jugando partidas de juegos de cartas: LCG, TCG, juegos de cartas coleccionables o similares.',
    ABSTRACTOS: 'Se obtiene jugando partidas de juegos abstractos: informacion perfecta o casi perfecta, reglas elegantes y poca dependencia del tema.',
    CATALOGADOR: 'Se obtiene jugando partidas en las que hayas seleccionado el genero del juego al crearlas.',
    ORGANIZADOR: 'Se obtiene organizando partidas. Cuenta cada partida que hayas creado y que haya llegado a celebrarse.',
    REPETIDOR: 'Se obtiene cuando juegas al mismo juego 3 o mas veces. Cuenta el numero de juegos distintos con al menos 3 partidas.',
    INVITADOR: 'Se obtiene cuando validas a tus invitados y confirmas su asistencia a la partida. Solo cuenta una vez por invitacion usada desde el despliegue del badge.',
    VALIDADOR: 'Se obtiene mostrando tu QR a otro jugador al terminar una partida. Tu eres quien ensena el codigo.',
    CONOCEDOR_GENEROS: 'Se obtiene cuando otro miembro coincide en la categoria que asignaste a un juego. El juego queda fijado con esa categoria para todos.',
    FOTOGRAFO: 'Se obtiene subiendo al menos una foto a una partida. Solo cuenta una vez por partida.',
    TESTIGO_MESA: 'Se obtiene escaneando el QR de otro jugador al terminar una partida. Tu eres el testigo con la camara.',
    AUDITOR_LUDICO: 'Se obtiene cuando confirmas como organizador que una de tus partidas no validadas se celebro.',
    PRIMER_JUGADOR: 'Se obtiene cada vez que la ruleta te elige como primer jugador en una partida.',
    GIRADOR_RULETA: 'Se obtiene cada vez que giras la ruleta de primer jugador en una partida.'
  };
  return descriptions[category];
};

export const getCategoryColor = (category: BadgeCategory): string => {
  const categoryColors: Record<BadgeCategory, string> = {
    EUROGAMES: '#3b82f6',
    TEMATICOS: '#ef4444',
    WARGAMES: '#78350f',
    ROL: '#9333ea',
    MINIATURAS: '#059669',
    WARHAMMER: '#18181b',
    FILLERS_PARTY: '#fbbf24',
    ABSTRACTOS: '#14b8a6',
    CATALOGADOR: '#06b6d4',
    ORGANIZADOR: '#f97316',
    REPETIDOR: '#ec4899',
    INVITADOR: '#8b5cf6',
    VALIDADOR: '#10b981',
    CARTAS_LCG_TCG: '#dc2626',
    CONOCEDOR_GENEROS: '#7c3aed',
    FOTOGRAFO: '#0891b2',
    TESTIGO_MESA: '#0d9488',
    AUDITOR_LUDICO: '#b45309',
    PRIMER_JUGADOR: '#f59e0b',
    GIRADOR_RULETA: '#6366f1'
  };
  return categoryColors[category];
};

export const getCategoryIcon = (category: BadgeCategory): string => {
  const categoryIcons: Record<BadgeCategory, string> = {
    EUROGAMES: '\uD83C\uDFAF',
    TEMATICOS: '\uD83C\uDFAD',
    WARGAMES: '\u2694\uFE0F',
    ROL: '\uD83C\uDFB2',
    MINIATURAS: '\uD83D\uDDFF',
    WARHAMMER: '\u26A1',
    FILLERS_PARTY: '\uD83C\uDF89',
    CARTAS_LCG_TCG: '\uD83C\uDCCF',
    ABSTRACTOS: '\u265F',
    CATALOGADOR: '\uD83D\uDCDA',
    CONOCEDOR_GENEROS: '\uD83C\uDF93',
    FOTOGRAFO: '\uD83D\uDCF8',
    ORGANIZADOR: '\uD83C\uDFDB\uFE0F',
    REPETIDOR: '\uD83D\uDD01',
    INVITADOR: '\uD83E\uDD1D',
    VALIDADOR: '\u2705',
    TESTIGO_MESA: '\uD83D\uDC41\uFE0F',
    AUDITOR_LUDICO: '\uD83D\uDD0D',
    PRIMER_JUGADOR: '\uD83C\uDFC6',
    GIRADOR_RULETA: '\uD83C\uDF9A'
  };
  return categoryIcons[category];
};
