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
    VALIDADOR: 'Validador'
  };
  return categoryNames[category];
};

// Helper para obtener descripción de categoría
export const getCategoryDescription = (category: BadgeCategory): string | undefined => {
  const descriptions: Partial<Record<BadgeCategory, string>> = {
    CATALOGADOR: 'Se obtiene jugando partidas en las que hayas seleccionado el género del juego al crearlas.',
    CONOCEDOR_GENEROS: 'Se obtiene cuando otro miembro coincide en la categoría que asignaste a un juego. El juego queda fijado con esa categoría para todos.',
    FOTOGRAFO: 'Se obtiene subiendo al menos una foto a una partida. Solo cuenta una vez por partida.'
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
    VALIDADOR: '#10b981'        // Esmeralda
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
    VALIDADOR: '✅'
  };
  return categoryIcons[category];
};
