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
  | 'CATALOGADOR'
  | 'ORGANIZADOR'
  | 'REPETIDOR'
  | 'VALIDADOR'
  | 'TESTIGO_MESA'
  | 'AUDITOR_LUDICO'
  | 'CONOCEDOR_GENEROS'
  | 'FOTOGRAFO';

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

// Helper para obtener nombre de categoría en español
export const getCategoryDisplayName = (category: BadgeCategory): string => {
  const categoryNames: Record<BadgeCategory, string> = {
    EUROGAMES: 'Eurogames',
    TEMATICOS: 'Temáticos',
    WARGAMES: 'Wargames',
    ROL: 'Rol',
    MINIATURAS: 'Miniaturas',
    WARHAMMER: 'Warhammer',
    FILLERS_PARTY: 'Fillers / Party',
    CARTAS_LCG_TCG: 'Cartas / LCG / TCG',
    CATALOGADOR: 'Catalogador',
    CONOCEDOR_GENEROS: 'Conocedor de Géneros',
    FOTOGRAFO: 'Fotógrafo',
    ORGANIZADOR: 'Organizador',
    REPETIDOR: 'Repetidor',
    VALIDADOR: 'Validador',
    TESTIGO_MESA: 'Testigo de Mesa',
    AUDITOR_LUDICO: 'Auditor Lúdico'
  };
  return categoryNames[category];
};

// Helper para obtener descripción de categoría
export const getCategoryDescription = (category: BadgeCategory): string => {
  const descriptions: Record<BadgeCategory, string> = {
    EUROGAMES: 'Se obtiene jugando partidas de juegos de estilo eurogame: gestión de recursos, optimización y poco azar.',
    TEMATICOS: 'Se obtiene jugando partidas de juegos temáticos: aventura, narrativa y ambientación por encima de la mecánica.',
    WARGAMES: 'Se obtiene jugando partidas de wargames: simulación de conflictos históricos o ficticios con mapas y unidades.',
    ROL: 'Se obtiene jugando partidas de juegos de rol de mesa, tanto de sistema como narrativos.',
    MINIATURAS: 'Se obtiene jugando partidas de juegos de miniaturas (excepto Warhammer, que tiene su propio logro).',
    WARHAMMER: 'Se obtiene jugando partidas de cualquier juego del universo Warhammer (40K, Age of Sigmar, etc.).',
    FILLERS_PARTY: 'Se obtiene jugando partidas de fillers o juegos de fiesta: rápidos, sencillos y para animar cualquier reunión.',
    CARTAS_LCG_TCG: 'Se obtiene jugando partidas de juegos de cartas: LCG, TCG, juegos de cartas coleccionables o similares.',
    CATALOGADOR: 'Se obtiene jugando partidas en las que hayas seleccionado el género del juego al crearlas.',
    ORGANIZADOR: 'Se obtiene organizando partidas. Cuenta cada partida que hayas creado y que haya llegado a celebrarse.',
    REPETIDOR: 'Se obtiene cuando juegas al mismo juego 3 o más veces. Cuenta el número de juegos distintos con al menos 3 partidas.',
    VALIDADOR: 'Se obtiene mostrando tu QR a otro jugador al terminar una partida. Tú eres quien enseña el código.',
    CONOCEDOR_GENEROS: 'Se obtiene cuando otro miembro coincide en la categoría que asignaste a un juego. El juego queda fijado con esa categoría para todos.',
    FOTOGRAFO: 'Se obtiene subiendo al menos una foto a una partida. Solo cuenta una vez por partida.',
    TESTIGO_MESA: 'Se obtiene escaneando el QR de otro jugador al terminar una partida. Tú eres el testigo con la cámara.',
    AUDITOR_LUDICO: 'Se obtiene cuando confirmas como organizador que una de tus partidas no validadas se celebró.'
  };
  return descriptions[category];
};

// Helper para obtener color de categoría (basado en el tema)
export const getCategoryColor = (category: BadgeCategory): string => {
  const categoryColors: Record<BadgeCategory, string> = {
    EUROGAMES: '#3b82f6',      // Azul
    TEMATICOS: '#ef4444',       // Rojo
    WARGAMES: '#78350f',        // Marrón
    ROL: '#9333ea',             // Púrpura
    MINIATURAS: '#059669',      // Verde
    WARHAMMER: '#18181b',       // Negro/Gris oscuro
    FILLERS_PARTY: '#fbbf24',   // Amarillo/Dorado
    CATALOGADOR: '#06b6d4',     // Cian
    ORGANIZADOR: '#f97316',     // Naranja
    REPETIDOR: '#ec4899',       // Rosa
    VALIDADOR: '#10b981',       // Esmeralda
    CARTAS_LCG_TCG: '#dc2626',  // Rojo oscuro
    CONOCEDOR_GENEROS: '#7c3aed', // Violeta
    FOTOGRAFO: '#0891b2',       // Azul cyan
    TESTIGO_MESA: '#0d9488',    // Teal
    AUDITOR_LUDICO: '#b45309'   // Ámbar oscuro
  };
  return categoryColors[category];
};

// Helper para obtener icono de categoría (emoji por ahora)
export const getCategoryIcon = (category: BadgeCategory): string => {
  const categoryIcons: Record<BadgeCategory, string> = {
    EUROGAMES: '🎯',
    TEMATICOS: '🎭',
    WARGAMES: '⚔️',
    ROL: '🎲',
    MINIATURAS: '🗿',
    WARHAMMER: '⚡',
    FILLERS_PARTY: '🎉',
    CARTAS_LCG_TCG: '🃏',
    CATALOGADOR: '📚',
    CONOCEDOR_GENEROS: '🎓',
    FOTOGRAFO: '📸',
    ORGANIZADOR: '🏛️',
    REPETIDOR: '🔁',
    VALIDADOR: '✅',
    TESTIGO_MESA: '👁️',
    AUDITOR_LUDICO: '🔍'
  };
  return categoryIcons[category];
};
