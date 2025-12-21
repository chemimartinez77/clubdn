// server/src/services/bggService.ts
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { parseStringPromise } from 'xml2js';

const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';
const MAX_RESULTS = 10;
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;

const userAgent =
  process.env.BGG_USER_AGENT ??
  'ClubDN Events/1.0 (+https://clubdn.app/contact)';

const buildAuthHeaders = () => {
  const headers: Record<string, string> = {};

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
  console.warn(
    '[BGG] No se configuraron credenciales (BGG_API_BEARER_TOKEN o BGG_API_USERNAME/BGG_API_PASSWORD). ' +
    'Las peticiones pueden fallar con 401.'
  );
}

const bggClient: AxiosInstance = axios.create({
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function requestWithRetry(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<string> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await bggClient.get(path, { params });

      if (response.status !== 202) {
        return response.data as string;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('BGG API request unauthorized. Check API token or credentials.');
      }
      throw error;
    }

    attempt += 1;
    await sleep(RETRY_DELAY_MS * attempt);
  }

  throw new Error('BGG API request timed out');
}

function normalizeItems(items: any): any[] {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function extractPrimaryName(item: any): string {
  const names = normalizeItems(item?.name);
  const primary = names.find((n: any) => n?.$?.type === 'primary');
  return primary?.$?.value || names[0]?.$?.value || 'Unknown';
}

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

/**
 * Buscar juegos en BoardGameGeek
 */
export async function searchBGGGames(query: string): Promise<BGGGame[]> {
  try {
    console.log('[BGG SERVICE] Iniciando búsqueda para:', query);
    if (!query || query.trim().length < 2) {
      console.log('[BGG SERVICE] Query muy corta');
      return [];
    }
    const trimmedQuery = query.trim();

    console.log('[BGG SERVICE] Llamando a BGG API search...');
    const rawSearch = await requestWithRetry('/search', {
      query: trimmedQuery,
      type: 'boardgame,boardgameexpansion',
      exact: 0
    });

    console.log('[BGG SERVICE] Parseando resultados de búsqueda...');
    const searchResult = await parseStringPromise(rawSearch);

    if (!searchResult.items?.item) {
      return [];
    }

    const items = normalizeItems(searchResult.items.item);

    // Obtener IDs de los primeros 10 resultados
    const ids = items.slice(0, MAX_RESULTS).map((item: any) => item.$.id);

    if (ids.length === 0) {
      return [];
    }

    const rawDetails = await requestWithRetry('/thing', {
      id: ids.join(','),
      type: 'boardgame,boardgameexpansion',
      stats: 0
    });

    const detailsResult = await parseStringPromise(rawDetails);

    if (!detailsResult.items || !detailsResult.items.item) {
      return [];
    }

    const detailItems = normalizeItems(detailsResult.items.item);

    // Mapear resultados
    const games: BGGGame[] = detailItems.map((item: any) => {
      return {
        id: item.$.id,
        name: extractPrimaryName(item),
        yearPublished: item.yearpublished?.[0]?.$.value || '',
        image: item.image?.[0] || '',
        thumbnail: item.thumbnail?.[0] || ''
      };
    });

    return games;
  } catch (error) {
    console.error('Error al buscar en BGG:', error);
    return [];
  }
}

/**
 * Obtener detalles de un juego específico
 */
export async function getBGGGame(gameId: string): Promise<BGGGame | null> {
  try {
    const rawDetails = await requestWithRetry('/thing', {
      id: gameId,
      type: 'boardgame,boardgameexpansion',
      stats: 0
    });

    const result = await parseStringPromise(rawDetails);

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
  } catch (error) {
    console.error('Error al obtener juego de BGG:', error);
    return null;
  }
}

/**
 * Obtener detalles completos de un juego específico con estadísticas
 */
export async function getBGGGameFull(gameId: string): Promise<BGGGameFull | null> {
  try {
    const rawDetails = await requestWithRetry('/thing', {
      id: gameId,
      type: 'boardgame,boardgameexpansion',
      stats: 1
    });

    const result = await parseStringPromise(rawDetails);

    if (!result.items || !result.items.item) {
      return null;
    }

    const item = normalizeItems(result.items.item)[0];

    // Extraer nombres alternativos
    const names = normalizeItems(item?.name);
    const alternateNames = names
      .filter((n: any) => n?.$?.type === 'alternate')
      .map((n: any) => n?.$?.value || '')
      .filter(Boolean);

    // Extraer categorías
    const categories = normalizeItems(item?.link)
      .filter((l: any) => l?.$?.type === 'boardgamecategory')
      .map((l: any) => l?.$?.value || '')
      .filter(Boolean);

    // Extraer mecánicas
    const mechanics = normalizeItems(item?.link)
      .filter((l: any) => l?.$?.type === 'boardgamemechanic')
      .map((l: any) => l?.$?.value || '')
      .filter(Boolean);

    // Extraer familias
    const families = normalizeItems(item?.link)
      .filter((l: any) => l?.$?.type === 'boardgamefamily')
      .map((l: any) => l?.$?.value || '')
      .filter(Boolean);

    // Extraer diseñadores
    const designers = normalizeItems(item?.link)
      .filter((l: any) => l?.$?.type === 'boardgamedesigner')
      .map((l: any) => l?.$?.value || '')
      .filter(Boolean);

    // Extraer artistas
    const artists = normalizeItems(item?.link)
      .filter((l: any) => l?.$?.type === 'boardgameartist')
      .map((l: any) => l?.$?.value || '')
      .filter(Boolean);

    // Extraer publishers
    const publishers = normalizeItems(item?.link)
      .filter((l: any) => l?.$?.type === 'boardgamepublisher')
      .map((l: any) => l?.$?.value || '')
      .filter(Boolean);

    // Extraer estadísticas
    const stats = item?.statistics?.[0]?.ratings?.[0];
    const ranks = normalizeItems(stats?.ranks?.[0]?.rank);
    const boardgameRank = ranks.find((r: any) => r?.$?.name === 'boardgame');
    const strategyRank = ranks.find((r: any) => r?.$?.name === 'strategygames');

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
  } catch (error) {
    console.error('Error al obtener detalles completos de BGG:', error);
    return null;
  }
}
