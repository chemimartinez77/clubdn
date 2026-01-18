// client/src/types/stats.ts

export interface TopGame {
  name: string;
  count: number;
  image: string | null;
}

export interface TopPlayer {
  name: string;
  count: number;
}

export interface TopDay {
  day: string;
  count: number;
}

export interface UserStats {
  eventsAttended: number;
  gamesPlayed: number;
  topGames: TopGame[];
  upcomingEvents: number;
  topPlayers: TopPlayer[];
  favoriteTimeRange: string;
  topDays: TopDay[];
}

export interface ClubStats {
  topGames: TopGame[];
}

export interface UserStatsResponse {
  success: boolean;
  data: UserStats;
}

export interface ClubStatsResponse {
  success: boolean;
  data: ClubStats;
}

// Tipos para eventos detallados
export interface EventDetail {
  id: string;
  title: string;
  description: string;
  type: string;
  gameName: string | null;
  gameImage: string | null;
  bggId: string | null;
  date: string;
  startHour: number | null;
  startMinute: number | null;
  location: string;
  status: string;
  // Relación con la tabla Game (URLs actualizadas)
  game?: {
    thumbnail: string | null;
    image: string | null;
  } | null;
}
