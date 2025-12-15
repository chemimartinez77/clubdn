export interface BGGGame {
    id: string;
    name: string;
    yearPublished: string;
    image: string;
    thumbnail: string;
}
/**
 * Buscar juegos en BoardGameGeek
 */
export declare function searchBGGGames(query: string): Promise<BGGGame[]>;
/**
 * Obtener detalles de un juego específico
 */
export declare function getBGGGame(gameId: string): Promise<BGGGame | null>;
//# sourceMappingURL=bggService.d.ts.map