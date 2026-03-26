// client/src/types/badge.ts

export type BadgeCategory =
  | 'EUROGAMES'
  | 'TEMATICOS'
  | 'WARGAMES'
  | 'ROL'
  | 'MINIATURAS'
  | 'WARHAMMER'
  | 'FILLERS_PARTY'
  | 'CATALOGADOR'
  | 'ORGANIZADOR'
  | 'REPETIDOR';

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
    CATALOGADOR: 'Catalogador',
    ORGANIZADOR: 'Organizador',
    REPETIDOR: 'Repetidor'
  };
  return categoryNames[category];
};

// Helper para obtener descripción de categoría
export const getCategoryDescription = (category: BadgeCategory): string | undefined => {
  const descriptions: Partial<Record<BadgeCategory, string>> = {
    CATALOGADOR: 'Se obtiene jugando partidas en las que hayas seleccionado el género del juego al crearlas.'
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
    REPETIDOR: '#ec4899'        // Rosa
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
    CATALOGADOR: '📚',
    ORGANIZADOR: '🏛️',
    REPETIDOR: '🔁'
  };
  return categoryIcons[category];
};
