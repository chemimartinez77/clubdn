export interface BGGGame {
    id: string;
    name: string;
    yearPublished: string;
    image: string;
    thumbnail: string;
}
export interface BGGGameFull {
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
}
export interface BGGSearchResult {
    games: BGGGame[];
    total: number;
    page: number;
    pageSize: number;
}
/**
 * Buscar juegos en BoardGameGeek
 */
export declare function searchBGGGames(query: string, page?: number, pageSize?: number): Promise<BGGSearchResult>;
/**
 * Obtener detalles de un juego específico
 */
export declare function getBGGGame(gameId: string): Promise<BGGGame | null>;
/**
 * Obtener detalles completos de un juego específico con estadísticas
 */
export declare function getBGGGameFull(gameId: string): Promise<BGGGameFull | null>;
//# sourceMappingURL=bggService.d.ts.map