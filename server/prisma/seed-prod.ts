/**
 * seed-prod.ts — Solo crea datos esenciales sin borrar nada existente.
 * Seguro para ejecutar en producción con datos reales.
 *
 * Ejecutar:
 *   DATABASE_URL="..." npx ts-node prisma/seed-prod.ts
 */
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
  { category: BadgeCategory.ROL, level: 1, name: 'Jugador de Domingo', requiredCount: 5 },
  { category: BadgeCategory.ROL, level: 2, name: 'Animador de Reuniones', requiredCount: 10 },
  { category: BadgeCategory.ROL, level: 3, name: 'Maestro del Rol', requiredCount: 20 },
  { category: BadgeCategory.ROL, level: 4, name: 'Árbitro de la Tarde', requiredCount: 40 },
  { category: BadgeCategory.ROL, level: 5, name: 'Patriarca de los Juegos', requiredCount: 70 },
  { category: BadgeCategory.ROL, level: 6, name: 'Leyenda del Rol', requiredCount: 100 },

  // MINIATURAS
  { category: BadgeCategory.MINIATURAS, level: 1, name: 'Aprendiz de Pincel', requiredCount: 5 },
  { category: BadgeCategory.MINIATURAS, level: 2, name: 'Calculador de Patrones', requiredCount: 10 },
  { category: BadgeCategory.MINIATURAS, level: 3, name: 'Maestro de la Miniatura', requiredCount: 20 },
  { category: BadgeCategory.MINIATURAS, level: 4, name: 'Gran Jugador de Miniaturas', requiredCount: 40 },
  { category: BadgeCategory.MINIATURAS, level: 5, name: 'Mente Táctica Superior', requiredCount: 70 },
  { category: BadgeCategory.MINIATURAS, level: 6, name: 'Oráculo del Campo de Batalla', requiredCount: 100 },

  // WARHAMMER
  { category: BadgeCategory.WARHAMMER, level: 1, name: 'Recluta del Caos', requiredCount: 5 },
  { category: BadgeCategory.WARHAMMER, level: 2, name: 'Coordinador de Regimientos', requiredCount: 10 },
  { category: BadgeCategory.WARHAMMER, level: 3, name: 'Héroe del Imperio', requiredCount: 20 },
  { category: BadgeCategory.WARHAMMER, level: 4, name: 'Estratega del Warp', requiredCount: 40 },
  { category: BadgeCategory.WARHAMMER, level: 5, name: 'Señor de la Guerra', requiredCount: 70 },
  { category: BadgeCategory.WARHAMMER, level: 6, name: 'Primarca Legendario', requiredCount: 100 },

  // FILLERS_PARTY
  { category: BadgeCategory.FILLERS_PARTY, level: 1, name: 'Animador Espontáneo', requiredCount: 5 },
  { category: BadgeCategory.FILLERS_PARTY, level: 2, name: 'Rey de la Pista', requiredCount: 10 },
  { category: BadgeCategory.FILLERS_PARTY, level: 3, name: 'Campeón de las Risas', requiredCount: 20 },
  { category: BadgeCategory.FILLERS_PARTY, level: 4, name: 'Maestro del Caos Controlado', requiredCount: 40 },
  { category: BadgeCategory.FILLERS_PARTY, level: 5, name: 'Leyenda de la Fiesta', requiredCount: 70 },
  { category: BadgeCategory.FILLERS_PARTY, level: 6, name: 'Dios del Party Game', requiredCount: 100 },

  // CATALOGADOR
  { category: BadgeCategory.CATALOGADOR, level: 1, name: 'Curioso del Catálogo', requiredCount: 5 },
  { category: BadgeCategory.CATALOGADOR, level: 2, name: 'Explorador de Géneros', requiredCount: 10 },
  { category: BadgeCategory.CATALOGADOR, level: 3, name: 'Cronista del Tablero', requiredCount: 20 },
  { category: BadgeCategory.CATALOGADOR, level: 4, name: 'Archivero Lúdico', requiredCount: 40 },
  { category: BadgeCategory.CATALOGADOR, level: 5, name: 'Gran Catalogador', requiredCount: 70 },
  { category: BadgeCategory.CATALOGADOR, level: 6, name: 'Enciclopedia Viviente', requiredCount: 100 },

  // ORGANIZADOR
  { category: BadgeCategory.ORGANIZADOR, level: 1, name: 'Anfitrión Improvisado', requiredCount: 5 },
  { category: BadgeCategory.ORGANIZADOR, level: 2, name: 'Convocador de Dados', requiredCount: 10 },
  { category: BadgeCategory.ORGANIZADOR, level: 3, name: 'Maestro de Ceremonias', requiredCount: 20 },
  { category: BadgeCategory.ORGANIZADOR, level: 4, name: 'Gran Coordinador del Tablero', requiredCount: 40 },
  { category: BadgeCategory.ORGANIZADOR, level: 5, name: 'Arquitecto de Sesiones', requiredCount: 70 },
  { category: BadgeCategory.ORGANIZADOR, level: 6, name: 'El que Siempre Pone la Mesa', requiredCount: 100 },

  // REPETIDOR
  { category: BadgeCategory.REPETIDOR, level: 1, name: 'Repite Plato', requiredCount: 5 },
  { category: BadgeCategory.REPETIDOR, level: 2, name: 'Fiel a sus Dados', requiredCount: 10 },
  { category: BadgeCategory.REPETIDOR, level: 3, name: 'Coleccionista de Clásicos', requiredCount: 20 },
  { category: BadgeCategory.REPETIDOR, level: 4, name: 'Devoto del Tablero', requiredCount: 40 },
  { category: BadgeCategory.REPETIDOR, level: 5, name: 'El que no Necesita Novedades', requiredCount: 70 },
  { category: BadgeCategory.REPETIDOR, level: 6, name: 'Maestro de sus Obsesiones', requiredCount: 100 },

  // INVITADOR
  { category: BadgeCategory.INVITADOR, level: 1, name: 'Reclutador Novato', requiredCount: 5 },
  { category: BadgeCategory.INVITADOR, level: 2, name: 'Invocador de Jugadores', requiredCount: 10 },
  { category: BadgeCategory.INVITADOR, level: 3, name: 'Embajador Lúdico', requiredCount: 20 },
  { category: BadgeCategory.INVITADOR, level: 4, name: 'Anfitrión Incomparable', requiredCount: 40 },
  { category: BadgeCategory.INVITADOR, level: 5, name: 'Virtuoso de la Acogida', requiredCount: 70 },
  { category: BadgeCategory.INVITADOR, level: 6, name: 'Leyenda de la Convocatoria', requiredCount: 100 },
];

async function main() {
  console.log('🌱 seed-prod: iniciando (sin borrar datos existentes)...');

  // ClubConfig — upsert seguro
  console.log('⚙️  ClubConfig...');
  await prisma.clubConfig.upsert({
    where: { id: 'club_config' },
    update: {},  // no sobreescribe si ya existe
    create: {
      id: 'club_config',
      clubName: 'Club Dreadnought',
      membershipTypes: [
        { type: 'SOCIO', displayName: 'Socio', price: 19, hasKey: true, description: 'Socio con llave. Requiere 1 año como colaborador + aprobación' },
        { type: 'COLABORADOR', displayName: 'Colaborador', price: 15, hasKey: false, description: 'Colaborador sin llave' },
        { type: 'FAMILIAR', displayName: 'Familiar', price: 10, hasKey: false, description: 'Familiar vinculado a un socio' },
        { type: 'EN_PRUEBAS', displayName: 'En Pruebas', price: 0, hasKey: false, description: 'Periodo de prueba gratuito' },
        { type: 'BAJA', displayName: 'Baja', price: 0, hasKey: false, description: 'Usuario dado de baja' },
      ],
      defaultCurrency: 'EUR',
    },
  });
  console.log('✅ ClubConfig listo');

  // BadgeDefinitions — upsert por category+level
  console.log('🏅 BadgeDefinitions...');
  for (const badge of badgeDefinitions) {
    await prisma.badgeDefinition.upsert({
      where: { category_level: { category: badge.category, level: badge.level } },
      update: { name: badge.name, requiredCount: badge.requiredCount },
      create: badge,
    });
  }
  console.log(`✅ ${badgeDefinitions.length} badges listos`);

  console.log('✅ seed-prod completado. Ningún dato existente fue borrado.');
}

main()
  .catch((e) => {
    console.error('Error en seed-prod:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
