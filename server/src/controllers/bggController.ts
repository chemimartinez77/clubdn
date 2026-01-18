// server/src/controllers/bggController.ts
import { Request, Response } from 'express';
import { searchBGGGames, getBGGGame } from '../services/bggService';

/**
 * GET /api/bgg/search?query=catan&page=1&pageSize=10
 */
export const searchGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, page, pageSize } = req.query;
    console.log('[BGG SEARCH] Query recibida:', query);

    if (!query || typeof query !== 'string') {
      console.log('[BGG SEARCH] Query inválida');
      res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
      return;
    }

    const pageNumber = typeof page === 'string' ? Number.parseInt(page, 10) : undefined;
    const pageSizeNumber = typeof pageSize === 'string' ? Number.parseInt(pageSize, 10) : undefined;

    console.log('[BGG SEARCH] Buscando en BGG:', query);
    const searchResult = await searchBGGGames(query, pageNumber, pageSizeNumber);
    console.log('[BGG SEARCH] Resultados:', searchResult.games.length, 'juegos encontrados');

    res.status(200).json({
      success: true,
      data: {
        games: searchResult.games,
        total: searchResult.total,
        page: searchResult.page,
        pageSize: searchResult.pageSize,
        totalPages: searchResult.pageSize > 0 ? Math.ceil(searchResult.total / searchResult.pageSize) : 0
      }
    });
  } catch (error) {
    console.error('[BGG SEARCH] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar juegos'
    });
  }
};

/**
 * GET /api/bgg/game/:id
 */
export const getGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Se requiere el identificador del juego'
      });
      return;
    }

    const game = await getBGGGame(id);

    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Juego no encontrado'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { game }
    });
  } catch (error) {
    console.error('Error getting BGG game:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener juego'
    });
  }
};
