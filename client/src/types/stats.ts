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
