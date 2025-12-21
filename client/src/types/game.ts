// client/src/types/game.ts

export interface Game {
  id: string;
  name: string;
  alternateNames: string[];
  description: string;
  yearPublished: number | null;
  image: string;
  thumbnail: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  minAge: number | null;
  usersRated: number | null;
  averageRating: number | null;
  bayesAverage: number | null;
  rank: number | null;
  strategyRank: number | null;
  complexityRating: number | null;
  numOwned: number | null;
  numWanting: number | null;
  numWishing: number | null;
  numComments: number | null;
  categories: string[];
  mechanics: string[];
  families: string[];
  designers: string[];
  artists: string[];
  publishers: string[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

export interface GameListItem {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  averageRating: number | null;
  rank: number | null;
  complexityRating: number | null;
}

export interface GamesResponse {
  games: GameListItem[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalGames: number;
    totalPages: number;
  };
}
