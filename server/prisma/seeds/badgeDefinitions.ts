// server/prisma/seeds/badgeDefinitions.ts
import { PrismaClient, BadgeCategory } from '@prisma/client';

const prisma = new PrismaClient();

const badgeDefinitions = [
  // EUROGAMES
  { category: BadgeCategory.EUROGAMES, level: 1, name: 'Euro-turista', requiredCount: 5 },
  { category: BadgeCategory.EUROGAMES, level: 2, name: 'Capataz de Recursos', requiredCount: 10 },
  { category: BadgeCategory.EUROGAMES, level: 3, name: 'Magnate del Meeple', requiredCount: 20 },
  { category: BadgeCategory.EUROGAMES, level: 4, name: 'Arquitecto de Optimización', requiredCount: 40 },
  { category: BadgeCategory.EUROGAMES, level: 5, name: 'Gran Canciller del Cartón', requiredCount: 70 },
  { category: BadgeCategory.EUROGAMES, level: 6, name: 'Deidad de la Eficiencia', requiredCount: 100 },

  // TEMÁTICOS
  { category: BadgeCategory.TEMATICOS, level: 1, name: 'Turista Norteamericano', requiredCount: 5 },
  { category: BadgeCategory.TEMATICOS, level: 2, name: 'Superviviente de Épicas', requiredCount: 10 },
  { category: BadgeCategory.TEMATICOS, level: 3, name: 'Héroe de la Pantalla', requiredCount: 20 },
  { category: BadgeCategory.TEMATICOS, level: 4, name: 'Guionista de Destinos', requiredCount: 40 },
  { category: BadgeCategory.TEMATICOS, level: 5, name: 'Señor de las Crónicas', requiredCount: 70 },
  { category: BadgeCategory.TEMATICOS, level: 6, name: 'Avatar de la Épica', requiredCount: 100 },

  // WARGAMES
  { category: BadgeCategory.WARGAMES, level: 1, name: 'Cadete de Simulación', requiredCount: 5 },
  { category: BadgeCategory.WARGAMES, level: 2, name: 'Oficial de Logística', requiredCount: 10 },
  { category: BadgeCategory.WARGAMES, level: 3, name: 'Gran Estratega Histórico', requiredCount: 20 },
  { category: BadgeCategory.WARGAMES, level: 4, name: 'Mariscal de Campo', requiredCount: 40 },
  { category: BadgeCategory.WARGAMES, level: 5, name: 'Teórico de la Victoria', requiredCount: 70 },
  { category: BadgeCategory.WARGAMES, level: 6, name: 'Genio de la Guerra Total', requiredCount: 100 },

  // ROL
  { category: BadgeCategory.ROL, level: 1, name: 'Iniciado del Velo', requiredCount: 5 },
  { category: BadgeCategory.ROL, level: 2, name: 'Bardo de Mil Historias', requiredCount: 10 },
  { category: BadgeCategory.ROL, level: 3, name: 'Archimago del Canon', requiredCount: 20 },
  { category: BadgeCategory.ROL, level: 4, name: 'Tejedor de Realidades', requiredCount: 40 },
  { category: BadgeCategory.ROL, level: 5, name: 'Semidiós del Lore', requiredCount: 70 },
  { category: BadgeCategory.ROL, level: 6, name: 'El Hacedor de Mundos', requiredCount: 100 },

  // MINIATURAS
  { category: BadgeCategory.MINIATURAS, level: 1, name: 'Pintor de Batallas', requiredCount: 5 },
  { category: BadgeCategory.MINIATURAS, level: 2, name: 'Capitán de Escuadra', requiredCount: 10 },
  { category: BadgeCategory.MINIATURAS, level: 3, name: 'Señor de las Falanges', requiredCount: 20 },
  { category: BadgeCategory.MINIATURAS, level: 4, name: 'Comandante de Falange', requiredCount: 40 },
  { category: BadgeCategory.MINIATURAS, level: 5, name: 'Gran Maestro de Escuadras', requiredCount: 70 },
  { category: BadgeCategory.MINIATURAS, level: 6, name: 'Soberano del Acero Fiel', requiredCount: 100 },

  // WARHAMMER
  { category: BadgeCategory.WARHAMMER, level: 1, name: 'Recluta de la Disformidad', requiredCount: 5 },
  { category: BadgeCategory.WARHAMMER, level: 2, name: 'Veterano del Capítulo', requiredCount: 10 },
  { category: BadgeCategory.WARHAMMER, level: 3, name: 'Primarca del Tablero', requiredCount: 20 },
  { category: BadgeCategory.WARHAMMER, level: 4, name: 'Heraldo del Trono', requiredCount: 40 },
  { category: BadgeCategory.WARHAMMER, level: 5, name: 'Estratega de Sector', requiredCount: 70 },
  { category: BadgeCategory.WARHAMMER, level: 6, name: 'Omnissiah del Tablero', requiredCount: 100 },

  // FILLERS / PARTY
  { category: BadgeCategory.FILLERS_PARTY, level: 1, name: 'Rey de la Pista', requiredCount: 5 },
  { category: BadgeCategory.FILLERS_PARTY, level: 2, name: 'Gurú de la Sobremesa', requiredCount: 10 },
  { category: BadgeCategory.FILLERS_PARTY, level: 3, name: 'Leyenda del Socialize', requiredCount: 20 },
  { category: BadgeCategory.FILLERS_PARTY, level: 4, name: 'Alma de la Convención', requiredCount: 40 },
  { category: BadgeCategory.FILLERS_PARTY, level: 5, name: 'Embajador del Caos Alegre', requiredCount: 70 },
  { category: BadgeCategory.FILLERS_PARTY, level: 6, name: 'Espíritu de la Ludoteca', requiredCount: 100 },

  // CATALOGADOR (por categorizar juegos en partidas)
  { category: BadgeCategory.CATALOGADOR, level: 1, name: 'Aprendiz de Biblioteca', requiredCount: 5 },
  { category: BadgeCategory.CATALOGADOR, level: 2, name: 'Archivero Dedicado', requiredCount: 10 },
  { category: BadgeCategory.CATALOGADOR, level: 3, name: 'Curador de Colecciones', requiredCount: 20 },
  { category: BadgeCategory.CATALOGADOR, level: 4, name: 'Maestro Taxonomista', requiredCount: 40 },
  { category: BadgeCategory.CATALOGADOR, level: 5, name: 'Gran Bibliotecario', requiredCount: 70 },
  { category: BadgeCategory.CATALOGADOR, level: 6, name: 'Guardián del Saber Lúdico', requiredCount: 100 },

  // ORGANIZADOR (por partidas organizadas)
  { category: BadgeCategory.ORGANIZADOR, level: 1, name: 'Anfitrión Improvisado', requiredCount: 5 },
  { category: BadgeCategory.ORGANIZADOR, level: 2, name: 'Convocador de Dados', requiredCount: 10 },
  { category: BadgeCategory.ORGANIZADOR, level: 3, name: 'Maestro de Ceremonias', requiredCount: 20 },
  { category: BadgeCategory.ORGANIZADOR, level: 4, name: 'Gran Coordinador del Tablero', requiredCount: 40 },
  { category: BadgeCategory.ORGANIZADOR, level: 5, name: 'Arquitecto de Sesiones', requiredCount: 70 },
  { category: BadgeCategory.ORGANIZADOR, level: 6, name: 'El que Siempre Pone la Mesa', requiredCount: 100 },

  // REPETIDOR (por juegos distintos jugados 3+ veces)
  { category: BadgeCategory.REPETIDOR, level: 1, name: 'Repite Plato', requiredCount: 5 },
  { category: BadgeCategory.REPETIDOR, level: 2, name: 'Fiel a sus Dados', requiredCount: 10 },
  { category: BadgeCategory.REPETIDOR, level: 3, name: 'Coleccionista de Clásicos', requiredCount: 20 },
  { category: BadgeCategory.REPETIDOR, level: 4, name: 'Devoto del Tablero', requiredCount: 40 },
  { category: BadgeCategory.REPETIDOR, level: 5, name: 'El que no Necesita Novedades', requiredCount: 70 },
  { category: BadgeCategory.REPETIDOR, level: 6, name: 'Maestro de sus Obsesiones', requiredCount: 100 },
];

export async function seedBadges() {
  console.log('🏆 Seeding badge definitions...');

  for (const badge of badgeDefinitions) {
    await prisma.badgeDefinition.upsert({
      where: {
        category_level: {
          category: badge.category,
          level: badge.level
        }
      },
      update: {
        name: badge.name,
        requiredCount: badge.requiredCount
      },
      create: badge
    });
  }

  console.log(`✅ Created/updated ${badgeDefinitions.length} badge definitions`);
}

// Si se ejecuta directamente
if (require.main === module) {
  seedBadges()
    .then(() => {
      console.log('✅ Badges seeded successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error seeding badges:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
