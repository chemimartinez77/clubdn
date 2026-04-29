// server/src/controllers/bggController.ts
import { Request, Response } from 'express';
import { searchBGGGames, getBGGGame, searchRPGGeekGames, type BGGGame } from '../services/bggService';

// Juegos que siempre deben aparecer primero si la búsqueda coincide con su alias
const PINNED_GAMES: { keywords: string[]; game: BGGGame }[] = [
  {
    keywords: ['magic', 'mtg', 'gathering'],
    game: { id: '463', name: 'Magic: The Gathering', yearPublished: '1993', image: '', thumbnail: '', itemType: 'boardgame' },
  },
  {
    keywords: ['heroclix'],
    game: { id: '3439', name: 'HeroClix', yearPublished: '2002', image: '', thumbnail: '', itemType: 'boardgame' },
  },
];

function applyPinnedGames(query: string, games: BGGGame[]): BGGGame[] {
  const q = query.toLowerCase();
  const toPin: BGGGame[] = [];

  for (const pinned of PINNED_GAMES) {
    if (pinned.keywords.some(k => q.includes(k))) {
      // Buscar si ya viene en los resultados para usar sus imágenes
      const existing = games.find(g => g.id === pinned.game.id);
      toPin.push(existing ?? pinned.game);
    }
  }

  if (toPin.length === 0) return games;

  const pinnedIds = new Set(toPin.map(g => g.id));
  return [...toPin, ...games.filter(g => !pinnedIds.has(g.id))];
}

/**
 * GET /api/bgg/search?query=catan&page=1&pageSize=10
 */
export const searchGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, page, pageSize, expansionOnly } = req.query;
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
    const expansionOnlyBool = expansionOnly === 'true';

    console.log('[BGG SEARCH] Buscando en BGG:', query);
    const searchResult = await searchBGGGames(query, pageNumber, pageSizeNumber, expansionOnlyBool);
    console.log('[BGG SEARCH] Resultados:', searchResult.games.length, 'juegos encontrados');

    const games = applyPinnedGames(query, searchResult.games);

    res.status(200).json({
      success: true,
      data: {
        games,
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
 * GET /api/bgg/rpgg/search?query=...&page=1&pageSize=10
 */
export const searchRPGGGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, page, pageSize } = req.query;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, message: 'Query parameter is required' });
      return;
    }
    const pageNumber = typeof page === 'string' ? Number.parseInt(page, 10) : undefined;
    const pageSizeNumber = typeof pageSize === 'string' ? Number.parseInt(pageSize, 10) : undefined;
    const searchResult = await searchRPGGeekGames(query, pageNumber, pageSizeNumber);
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
    console.error('[RPGG SEARCH] Error:', error);
    res.status(500).json({ success: false, message: 'Error al buscar juegos de rol' });
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
