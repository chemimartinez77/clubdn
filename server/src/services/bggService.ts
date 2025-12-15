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
