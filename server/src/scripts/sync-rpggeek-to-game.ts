/**
 * Importa en la tabla Game los ítems ROL de RPGGeek que aún no tienen entrada,
 * y restaura el bggId en LibraryItem enlazando cada ítem con su Game.
 *
 * Los IDs numéricos se obtuvieron de producción (donde aún existen antes de migrar).
 * El script es idempotente: si el Game ya existe lo omite.
 *
 * Uso:
 *   # Contra local (DATABASE_URL del .env):
 *   npx ts-node src/scripts/sync-rpggeek-to-game.ts
 *
 *   # Contra staging:
 *   DATABASE_URL="postgresql://..." npx ts-node src/scripts/sync-rpggeek-to-game.ts
 */

import 'dotenv/config';
import { prisma } from '../config/database';
import { getRPGGeekItem } from '../services/bggService';

const RPGG_IDS = [
  '103200','138552','176555','204868','227148','241220','330201',
  '43359','43360','43596','43601','43646','43674','43711','43903',
  '43907','43931','44022','44037','44079','44081','44117','44288',
  '44732','44882','44966','44967','44968','45805','45806','45906',
  '45910','45914','45952','46077','46168','46281','46421','46444',
  '46526','46967','47792','47803','47806','47933','47938','48028',
  '48371','48614','48845','48916','48918','48923','48927','48934',
  '49012','49192','49194','49198','49201','49205','49207','49781',
  '49783','49789','50019','50071','50218','50308','50856','50948',
  '51018','51208','51210','51810','52101','54155','54259','55182',
  '55534','56076','56086','56398','56617','58670','60443','60499',
  '60555','60556','60630','61925','62141','64750','66702','72539',
  '73147','74452','80846','85397','86059','90394',
];

const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n=== sync-rpggeek-to-game ===`);
  console.log(`Procesando ${RPGG_IDS.length} IDs de RPGGeek...\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const numericId of RPGG_IDS) {
    const gameId = `rpgg-${numericId}`;

    const existing = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (existing) {
      console.log(`  [skip]  ${gameId} ya existe en Game`);
      skipped++;
      continue;
    }

    process.stdout.write(`  [fetch] ${gameId} ... `);
    const item = await getRPGGeekItem(numericId);
    await sleep(DELAY_MS);

    if (!item) {
      console.log('no encontrado en RPGGeek');
      failed++;
      continue;
    }

    await prisma.game.create({
      data: {
        id: item.id,
        name: item.name,
        alternateNames: item.alternateNames,
        description: item.description || null,
        yearPublished: item.yearPublished ?? null,
        image: item.image || null,
        thumbnail: item.thumbnail || null,
        minPlayers: item.minPlayers ?? null,
        maxPlayers: item.maxPlayers ?? null,
        playingTime: item.playingTime ?? null,
        minPlaytime: item.minPlaytime ?? null,
        maxPlaytime: item.maxPlaytime ?? null,
        minAge: item.minAge ?? null,
        usersRated: item.usersRated ?? null,
        averageRating: item.averageRating ?? null,
        bayesAverage: item.bayesAverage ?? null,
        rank: item.rank ?? null,
        complexityRating: item.complexityRating ?? null,
        numOwned: item.numOwned ?? null,
        numWanting: item.numWanting ?? null,
        numWishing: item.numWishing ?? null,
        numComments: item.numComments ?? null,
        categories: item.categories,
        mechanics: item.mechanics,
        families: item.families,
        designers: item.designers,
        artists: item.artists,
        publishers: item.publishers,
        lastSyncedAt: new Date(),
      },
    });

    console.log(`OK → "${item.name}"`);
    inserted++;
  }

  // Restaurar bggId en LibraryItem para cada Game que ya existe en BD
  // Enlaza por thumbnail (cacheado en LibraryItem al importar) o por ID numérico
  // comparando con el campo bggId original via el thumbnail de RPGGeek.
  // Estrategia: para cada ID, buscar LibraryItem ROL con bggId NULL cuyo thumbnail
  // coincide con el del Game recién insertado (o ya existente).
  console.log('\nRestaurando bggId en LibraryItem ROL...\n');
  let restored = 0;

  for (const numericId of RPGG_IDS) {
    const gameId = `rpgg-${numericId}`;
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, thumbnail: true, image: true },
    });
    if (!game) continue;

    // Buscar LibraryItems ROL que tienen el thumbnail o imagen de este game pero bggId NULL
    const candidates = await prisma.libraryItem.findMany({
      where: {
        gameType: 'ROL',
        bggId: null,
        OR: [
          ...(game.thumbnail ? [{ thumbnail: game.thumbnail }] : []),
          ...(game.image ? [{ image: game.image }] : []),
        ],
      },
      select: { id: true, name: true },
    });

    for (const item of candidates) {
      await prisma.libraryItem.update({
        where: { id: item.id },
        data: { bggId: gameId },
      });
      console.log(`  [link]  "${item.name}" → ${gameId}`);
      restored++;
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`  Games insertados : ${inserted}`);
  console.log(`  Games omitidos   : ${skipped}`);
  console.log(`  Games fallidos   : ${failed}`);
  console.log(`  LibraryItems restaurados: ${restored}`);

  if (restored === 0 && inserted > 0) {
    console.log('\n  AVISO: ningún LibraryItem restaurado por thumbnail.');
    console.log('  Si los thumbnails no estaban cacheados, restaura manualmente con:');
    console.log('  UPDATE "LibraryItem" SET "bggId" = \'<numericId>\' WHERE name = \'...\' AND "gameType" = \'ROL\'');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
