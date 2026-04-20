/**
 * Sincroniza isExpansion y parentBggId para todos los juegos BGG de la tabla Game.
 *
 * Consulta la API de BGG en lotes de 50 IDs con 3s de delay entre lotes.
 * Los ítems con prefijo "rpgg-" (RPGGeek) se omiten.
 *
 * Uso:
 *   # Contra staging (DATABASE_URL del .env):
 *   npx ts-node src/scripts/sync-expansion-data.ts
 *
 *   # Contra producción:
 *   DATABASE_URL="postgresql://..." npx ts-node src/scripts/sync-expansion-data.ts
 */

import 'dotenv/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { prisma } from '../config/database';

const BGG_API = 'https://boardgamegeek.com/xmlapi2';
const BATCH_SIZE = 50;
const DELAY_MS = 3000;
const USER_AGENT = 'ClubDN Sync/1.0 (+https://clubdreadnought.org)';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeItems(val: unknown): any[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

interface ExpansionInfo {
  id: string;
  isExpansion: boolean;
  parentBggId: string | null;
}

async function fetchBatch(ids: string[]): Promise<ExpansionInfo[]> {
  const url = `${BGG_API}/thing?id=${ids.join(',')}&type=boardgame,boardgameexpansion`;
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 30000,
  });

  const parsed = await parseStringPromise(response.data);
  const rawItems = normalizeItems(parsed?.items?.item);

  return rawItems.map((item: any) => {
    const id = item?.$?.id;
    const isExpansion = item?.$?.type === 'boardgameexpansion';

    // Link con type="boardgameexpansion" e inbound="true" → el juego base
    const parentLink = normalizeItems(item?.link).find(
      (l: any) => l?.$?.type === 'boardgameexpansion' && l?.$?.inbound === 'true'
    );
    const parentBggId = parentLink?.$?.id ?? null;

    return { id, isExpansion, parentBggId };
  });
}

async function main() {
  console.log('Obteniendo IDs de juegos BGG desde la base de datos...');

  const allGames = await prisma.game.findMany({
    select: { id: true },
    where: { id: { not: { startsWith: 'rpgg-' } } },
  });

  const ids: string[] = allGames.map(g => g.id);
  console.log(`Total de juegos BGG a procesar: ${ids.length}`);

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE) as string[]);
  }
  console.log(`Lotes de ${BATCH_SIZE}: ${batches.length} lotes (~${Math.round(batches.length * DELAY_MS / 1000)}s)`);

  let processed = 0;
  let expansions = 0;
  let errors = 0;
  let batchIndex = 0;

  for (const batch of batches) {
    batchIndex++;
    try {
      const results = await fetchBatch(batch);

      for (const { id, isExpansion, parentBggId } of results) {
        if (!id) continue;
        await prisma.game.update({
          where: { id },
          data: { isExpansion, parentBggId },
        });
        if (isExpansion) expansions++;
      }

      processed += batch.length;
      console.log(`[${batchIndex}/${batches.length}] ${processed}/${ids.length} procesados — ${expansions} expansiones detectadas`);
    } catch (err) {
      errors++;
      console.error(`[${batchIndex}/${batches.length}] Error en lote:`, (err as Error).message);
    }

    if (batchIndex < batches.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nFinalizado. ${processed} juegos actualizados, ${expansions} expansiones, ${errors} lotes con error.`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error fatal:', err);
  prisma.$disconnect();
  process.exit(1);
});
