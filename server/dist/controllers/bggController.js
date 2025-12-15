"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGame = exports.searchGames = void 0;
const bggService_1 = require("../services/bggService");
/**
 * GET /api/bgg/search?query=catan
 */
const searchGames = async (req, res) => {
    try {
        const { query } = req.query;
        console.log('[BGG SEARCH] Query recibida:', query);
        if (!query || typeof query !== 'string') {
            console.log('[BGG SEARCH] Query inválida');
            res.status(400).json({
                success: false,
                message: 'Query parameter is required'
            });
            return;
        }
        console.log('[BGG SEARCH] Buscando en BGG:', query);
        const games = await (0, bggService_1.searchBGGGames)(query);
        console.log('[BGG SEARCH] Resultados:', games.length, 'juegos encontrados');
        res.status(200).json({
            success: true,
            data: { games }
        });
    }
    catch (error) {
        console.error('[BGG SEARCH] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar juegos'
        });
    }
};
exports.searchGames = searchGames;
/**
 * GET /api/bgg/game/:id
 */
const getGame = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Se requiere el identificador del juego'
            });
            return;
        }
        const game = await (0, bggService_1.getBGGGame)(id);
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
    }
    catch (error) {
        console.error('Error getting BGG game:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener juego'
        });
    }
};
exports.getGame = getGame;
//# sourceMappingURL=bggController.js.map