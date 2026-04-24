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
  uniqueGamesPlayed: number;
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

export interface DetailedStatPoint {
  count: number;
}

export interface DetailedYearStat extends DetailedStatPoint {
  year: number;
}

export interface DetailedMonthStat extends DetailedStatPoint {
  key: string;
  year: number;
  month: number;
  label: string;
}

export interface DetailedActivityDay extends DetailedStatPoint {
  date: string;
}

export interface DetailedTimeRange extends DetailedStatPoint {
  key: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown';
  label: string;
}

export interface DetailedGameStat extends DetailedStatPoint {
  name: string;
  image: string | null;
  latestEventId: string;
  latestDate: string;
}

export interface DetailedPlayerStat extends DetailedStatPoint {
  userId: string;
  name: string;
  avatar: string | null;
  latestEventId: string;
  latestDate: string;
}

export interface UserDetailedStats {
  summary: {
    gamesPlayed: number;
    organizedGames: number;
    joinedGames: number;
    uniqueGames: number;
    uniquePlayers: number;
  };
  weeklyStats: {
    bestWeeklyStreak: number;
    currentWeeklyStreak: number;
  };
  byYear: DetailedYearStat[];
  byMonth: DetailedMonthStat[];
  activityByDate: DetailedActivityDay[];
  dayOfWeek: TopDay[];
  timeRanges: DetailedTimeRange[];
  games: DetailedGameStat[];
  players: DetailedPlayerStat[];
}

export interface UserDetailedStatsResponse {
  success: boolean;
  data: UserDetailedStats;
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
  durationHours?: number | null;
  durationMinutes?: number | null;
  maxAttendees?: number;
  registeredCount?: number;
  location: string;
  status: string;
  // Relación con la tabla Game (URLs actualizadas)
  game?: {
    thumbnail: string | null;
    image: string | null;
  } | null;
  expansions?: Array<{
    id: string;
    gameId: string;
    name: string;
    image: string | null;
    thumbnail: string | null;
  }>;
  linkedPreviousEvent?: {
    id: string;
    title: string;
    gameName?: string | null;
    gameImage?: string | null;
    bggId?: string | null;
    startHour?: number | null;
    startMinute?: number | null;
    durationHours?: number | null;
    durationMinutes?: number | null;
    status: string;
    date: string;
  } | null;
}
