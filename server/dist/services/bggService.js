"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchBGGGames = searchBGGGames;
exports.getBGGGame = getBGGGame;
exports.getBGGGameFull = getBGGGameFull;
// server/src/services/bggService.ts
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;
const userAgent = process.env.BGG_USER_AGENT ??
    'ClubDN Events/1.0 (+https://clubdn.app/contact)';
const buildAuthHeaders = () => {
    const headers = {};
    const bearerToken = process.env.BGG_API_BEARER_TOKEN?.trim();
    if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`;
        return headers;
    }
    const basicUser = process.env.BGG_API_USERNAME?.trim();
    const basicPassword = process.env.BGG_API_PASSWORD?.trim();
    if (basicUser && basicPassword) {
        const encoded = Buffer.from(`${basicUser}:${basicPassword}`).toString('base64');
        headers.Authorization = `Basic ${encoded}`;
        return headers;
    }
    return headers;
};
const authHeaders = buildAuthHeaders();
if (!authHeaders.Authorization) {
    console.warn('[BGG] No se configuraron credenciales (BGG_API_BEARER_TOKEN o BGG_API_USERNAME/BGG_API_PASSWORD). ' +
        'Las peticiones pueden fallar con 401.');
}
const bggClient = axios_1.default.create({
    baseURL: BGG_API_BASE,
    timeout: 15000,
    headers: {
        'User-Agent': userAgent,
        'Accept': 'application/xml',
        'Cache-Control': 'no-cache',
        ...authHeaders
    },
    validateStatus(status) {
        // BGG responde 202 Accepted cuando los datos aun no estan listos
        return (status >= 200 && status < 300) || status === 202;
    }
});
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function requestWithRetry(path, params) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const response = await bggClient.get(path, { params });
            if (response.status !== 202) {
                return response.data;
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response?.status === 401) {
                throw new Error('BGG API request unauthorized. Check API token or credentials.');
            }
            throw error;
        }
        attempt += 1;
        await sleep(RETRY_DELAY_MS * attempt);
    }
    throw new Error('BGG API request timed out');
}
function normalizeItems(items) {
    if (!items)
        return [];
    return Array.isArray(items) ? items : [items];
}
function extractPrimaryName(item) {
    const names = normalizeItems(item?.name);
    const primary = names.find((n) => n?.$?.type === 'primary');
    return primary?.$?.value || names[0]?.$?.value || 'Unknown';
}
/**
 * Buscar juegos en BoardGameGeek
 */
async function searchBGGGames(query, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
        console.log('[BGG SERVICE] Iniciando búsqueda para:', query);
        if (!query || query.trim().length < 2) {
            console.log('[BGG SERVICE] Query muy corta');
            return { games: [], total: 0, page, pageSize };
        }
        const trimmedQuery = query.trim();
        const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
        const safePageSize = Number.isFinite(pageSize)
            ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize)))
            : DEFAULT_PAGE_SIZE;
        console.log('[BGG SERVICE] Llamando a BGG API search...');
        const rawSearch = await requestWithRetry('/search', {
            query: trimmedQuery,
            type: 'boardgame,boardgameexpansion',
            exact: 0
        });
        console.log('[BGG SERVICE] Parseando resultados de búsqueda...');
        const searchResult = await (0, xml2js_1.parseStringPromise)(rawSearch);
        if (!searchResult.items?.item) {
            return { games: [], total: 0, page: safePage, pageSize: safePageSize };
        }
        const items = normalizeItems(searchResult.items.item);
        const totalFromApi = Number.parseInt(searchResult.items?.$?.total ?? '', 10);
        const total = Number.isFinite(totalFromApi) && totalFromApi > 0 ? totalFromApi : items.length;
        const startIndex = (safePage - 1) * safePageSize;
        const pagedItems = items.slice(startIndex, startIndex + safePageSize);
        // Obtener IDs de los resultados paginados
        const ids = pagedItems.map((item) => item.$.id);
        if (ids.length === 0) {
            return { games: [], total, page: safePage, pageSize: safePageSize };
        }
        const rawDetails = await requestWithRetry('/thing', {
            id: ids.join(','),
            type: 'boardgame,boardgameexpansion',
            stats: 0
        });
        const detailsResult = await (0, xml2js_1.parseStringPromise)(rawDetails);
        if (!detailsResult.items || !detailsResult.items.item) {
            return { games: [], total, page: safePage, pageSize: safePageSize };
        }
        const detailItems = normalizeItems(detailsResult.items.item);
        // Mapear resultados
        const games = detailItems.map((item) => {
            return {
                id: item.$.id,
                name: extractPrimaryName(item),
                yearPublished: item.yearpublished?.[0]?.$.value || '',
                image: item.image?.[0] || '',
                thumbnail: item.thumbnail?.[0] || ''
            };
        });
        return { games, total, page: safePage, pageSize: safePageSize };
    }
    catch (error) {
        console.error('Error al buscar en BGG:', error);
        return { games: [], total: 0, page, pageSize };
    }
}
/**
 * Obtener detalles de un juego específico
 */
async function getBGGGame(gameId) {
    try {
        const rawDetails = await requestWithRetry('/thing', {
            id: gameId,
            type: 'boardgame,boardgameexpansion',
            stats: 0
        });
        const result = await (0, xml2js_1.parseStringPromise)(rawDetails);
        if (!result.items || !result.items.item) {
            return null;
        }
        const item = normalizeItems(result.items.item)[0];
        return {
            id: item.$.id,
            name: extractPrimaryName(item),
            yearPublished: item.yearpublished?.[0]?.$.value || '',
            image: item.image?.[0] || '',
            thumbnail: item.thumbnail?.[0] || ''
        };
    }
    catch (error) {
        console.error('Error al obtener juego de BGG:', error);
        return null;
    }
}
/**
 * Obtener detalles completos de un juego específico con estadísticas
 */
async function getBGGGameFull(gameId) {
    try {
        const rawDetails = await requestWithRetry('/thing', {
            id: gameId,
            type: 'boardgame,boardgameexpansion',
            stats: 1
        });
        const result = await (0, xml2js_1.parseStringPromise)(rawDetails);
        if (!result.items || !result.items.item) {
            return null;
        }
        const item = normalizeItems(result.items.item)[0];
        // Extraer nombres alternativos
        const names = normalizeItems(item?.name);
        const alternateNames = names
            .filter((n) => n?.$?.type === 'alternate')
            .map((n) => n?.$?.value || '')
            .filter(Boolean);
        // Extraer categorías
        const categories = normalizeItems(item?.link)
            .filter((l) => l?.$?.type === 'boardgamecategory')
            .map((l) => l?.$?.value || '')
            .filter(Boolean);
        // Extraer mecánicas
        const mechanics = normalizeItems(item?.link)
            .filter((l) => l?.$?.type === 'boardgamemechanic')
            .map((l) => l?.$?.value || '')
            .filter(Boolean);
        // Extraer familias
        const families = normalizeItems(item?.link)
            .filter((l) => l?.$?.type === 'boardgamefamily')
            .map((l) => l?.$?.value || '')
            .filter(Boolean);
        // Extraer diseñadores
        const designers = normalizeItems(item?.link)
            .filter((l) => l?.$?.type === 'boardgamedesigner')
            .map((l) => l?.$?.value || '')
            .filter(Boolean);
        // Extraer artistas
        const artists = normalizeItems(item?.link)
            .filter((l) => l?.$?.type === 'boardgameartist')
            .map((l) => l?.$?.value || '')
            .filter(Boolean);
        // Extraer publishers
        const publishers = normalizeItems(item?.link)
            .filter((l) => l?.$?.type === 'boardgamepublisher')
            .map((l) => l?.$?.value || '')
            .filter(Boolean);
        // Extraer estadísticas
        const stats = item?.statistics?.[0]?.ratings?.[0];
        const ranks = normalizeItems(stats?.ranks?.[0]?.rank);
        const boardgameRank = ranks.find((r) => r?.$?.name === 'boardgame');
        const strategyRank = ranks.find((r) => r?.$?.name === 'strategygames');
        return {
            id: item.$.id,
            name: extractPrimaryName(item),
            alternateNames,
            description: item.description?.[0] || '',
            yearPublished: item.yearpublished?.[0]?.$.value ? parseInt(item.yearpublished[0].$.value) : null,
            image: item.image?.[0] || '',
            thumbnail: item.thumbnail?.[0] || '',
            minPlayers: item.minplayers?.[0]?.$.value ? parseInt(item.minplayers[0].$.value) : null,
            maxPlayers: item.maxplayers?.[0]?.$.value ? parseInt(item.maxplayers[0].$.value) : null,
            playingTime: item.playingtime?.[0]?.$.value ? parseInt(item.playingtime[0].$.value) : null,
            minPlaytime: item.minplaytime?.[0]?.$.value ? parseInt(item.minplaytime[0].$.value) : null,
            maxPlaytime: item.maxplaytime?.[0]?.$.value ? parseInt(item.maxplaytime[0].$.value) : null,
            minAge: item.minage?.[0]?.$.value ? parseInt(item.minage[0].$.value) : null,
            usersRated: stats?.usersrated?.[0]?.$.value ? parseInt(stats.usersrated[0].$.value) : null,
            averageRating: stats?.average?.[0]?.$.value ? parseFloat(stats.average[0].$.value) : null,
            bayesAverage: stats?.bayesaverage?.[0]?.$.value ? parseFloat(stats.bayesaverage[0].$.value) : null,
            rank: boardgameRank?.$?.value && boardgameRank.$.value !== 'Not Ranked' ? parseInt(boardgameRank.$.value) : null,
            strategyRank: strategyRank?.$?.value && strategyRank.$.value !== 'Not Ranked' ? parseInt(strategyRank.$.value) : null,
            complexityRating: stats?.averageweight?.[0]?.$.value ? parseFloat(stats.averageweight[0].$.value) : null,
            numOwned: stats?.owned?.[0]?.$.value ? parseInt(stats.owned[0].$.value) : null,
            numWanting: stats?.wanting?.[0]?.$.value ? parseInt(stats.wanting[0].$.value) : null,
            numWishing: stats?.wishing?.[0]?.$.value ? parseInt(stats.wishing[0].$.value) : null,
            numComments: stats?.numcomments?.[0]?.$.value ? parseInt(stats.numcomments[0].$.value) : null,
            categories,
            mechanics,
            families,
            designers,
            artists,
            publishers
        };
    }
    catch (error) {
        console.error('Error al obtener detalles completos de BGG:', error);
        return null;
    }
}
//# sourceMappingURL=bggService.js.map