/**
 * Script para importar la ludoteca de rol desde el CSV histórico del club.
 *
 * NOTA: Los IDs de rpggeek.com se almacenan en el campo bggId, que originalmente
 * está pensado para BoardGameGeek (boardgamegeek.com). Ambos sitios pertenecen a la
 * misma empresa (BVSS) y comparten estructura de URLs, pero sus IDs NO son
 * intercambiables. Los IDs aquí importados son de RPGGeek.
 * Si en el futuro se integra la API de BGG, habrá que distinguir la fuente del ID.
 *
 * Ejecutar: npx ts-node src/scripts/seed-ludoteca-rol.ts
 */

import { prisma } from '../config/database';

interface RolEntry {
  internalId: string;
  name: string;
  rpggeekId: string | null;
  notes: string | null;
}

// Datos del CSV. Los marcados ERROR? en observ4 se importan con esa nota.
// Los duplicados de Ref usan un ID nuevo >= 19901 (fuera del rango del CSV original).
// Campo observ4 se añade a notes cuando aporta información relevante.
const ROL_DATA: RolEntry[] = [
  { internalId: '10189', name: 'Action Under Sail', rpggeekId: null, notes: 'no parece rol | ERROR?' },
  { internalId: '10107', name: "AD&D Dungeoneer's Survival Guide", rpggeekId: '43931', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a' },
  { internalId: '10127', name: "AD&D Dungeon Master's Guide", rpggeekId: '43360', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a' },
  { internalId: '10111', name: "AD&D Fighter's Handbook", rpggeekId: '45906', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a' },
  { internalId: '10129', name: 'AD&D Forgotten Realms', rpggeekId: '49012', notes: 'Hay muchos libros. Elegí uno. Hay anexos en el club' },
  { internalId: '10109', name: 'AD&D Friend Folio', rpggeekId: null, notes: 'no encontrado en RPGG' },
  { internalId: '10122', name: 'AD&D Guía del Dungeon Master', rpggeekId: '46077', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a' },
  { internalId: '10125', name: 'AD&D Manual del Jugador', rpggeekId: '44117', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a. Hay 7 copias. Español' },
  { internalId: '10104', name: 'AD&D Manual of the Planes 1e', rpggeekId: '43711', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a. Idioma pendiente de confirmar' },
  { internalId: '10105', name: 'AD&D Player Handbook', rpggeekId: '43359', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a. Idioma pendiente de confirmar' },
  { internalId: '10128', name: "AD&D Player's Handbook", rpggeekId: '44117', notes: 'Hay 1ed y 2 ed y 2ed revisada y 3a. Idioma pendiente de confirmar' },
  { internalId: '10114', name: "AD&D Priest's Handbook", rpggeekId: '45910', notes: '2ed' },
  { internalId: '10118', name: 'AD&D Reinos Olvidados. Escenario de Campaña. 2e', rpggeekId: '49012', notes: '2ed. Idioma: español?' },
  { internalId: '10133', name: 'AD&D Reinos Olvidados. Escenario de Campaña. 2e (2ª copia)', rpggeekId: '49012', notes: '2 copias. ID original en CSV: 10133' },
  { internalId: '10108', name: 'AD&D Unearthed Arcana', rpggeekId: '43601', notes: '1e o 3e' },
  { internalId: '10106', name: 'AD&D Wilderness Survival 1e', rpggeekId: '43907', notes: null },
  { internalId: '10113', name: "AD&D The Complete Wizard's Handbook", rpggeekId: '45914', notes: null },
  { internalId: '10142', name: 'RuneQuest Apple Lane', rpggeekId: '58670', notes: '1e o 2e o 3e' },
  { internalId: '10170', name: 'RuneQuest Apple Lane El Sendero del Pomar', rpggeekId: '46526', notes: '1e o 2e o 3e. Idioma: español?' },
  { internalId: '10136', name: 'Ars Magica 1e', rpggeekId: '73147', notes: 'Edición: 1e? Idioma pendiente de confirmar' },
  { internalId: '19901', name: 'Ars Magica 5e', rpggeekId: '45952', notes: 'Edición: 5e? Idioma pendiente de confirmar. ID original en CSV: 10136' },
  { internalId: '10218', name: 'Armies of the Imperium', rpggeekId: null, notes: 'Manual expansión Space Marines W40K | ERROR?' },
  { internalId: '10234', name: 'Rolemaster Arms Law & Claw Law 2e', rpggeekId: '51208', notes: 'Versión pendiente de confirmar. IMPRESO' },
  { internalId: '10197', name: 'AD&D Atlas de los Reinos Olvidados 2e', rpggeekId: '50308', notes: 'Libro caro' },
  { internalId: '10103', name: 'D6 System Bloodshadows', rpggeekId: '64750', notes: 'Confirmar juego. Editor y versión pendientes' },
  { internalId: '10198', name: 'Bolide', rpggeekId: null, notes: 'Manual de juego de mesa? | ERROR?' },
  { internalId: '10180', name: 'Car Wars RPG', rpggeekId: '56086', notes: 'Averiguar si es aventura o core. REPETIDO?' },
  { internalId: '10184', name: 'Car Wars RPG (2ª copia)', rpggeekId: '56086', notes: 'Averiguar si es aventura o core. Inglés. ID original en CSV: 10184' },
  { internalId: '10233', name: 'Rolemaster Character Law & Campaign Law 2e', rpggeekId: '51210', notes: 'IMPRESO' },
  { internalId: '10186', name: 'CyberSpace RPG Cyber Rogues', rpggeekId: '43903', notes: null },
  { internalId: '10193', name: 'CyberSpace RPG Death Game 2090', rpggeekId: '60443', notes: null },
  { internalId: '10183', name: 'CyberSpace RPG Death Valley Free Prison', rpggeekId: '54155', notes: null },
  { internalId: '10190', name: 'CyberSpace RPG Edge-On', rpggeekId: '60556', notes: null },
  { internalId: '10179', name: 'CyberSpace RPG Sprawlgangs & Megacorps', rpggeekId: '61925', notes: null },
  { internalId: '10187', name: 'CyberSpace RPG The Body Bank', rpggeekId: '60555', notes: null },
  { internalId: '10110', name: 'DC Heroes RPG', rpggeekId: '50948', notes: 'Versión pendiente. Tiene poster y fichas sueltas' },
  { internalId: '10155', name: 'D&D Basic Set', rpggeekId: '44081', notes: 'Es el libro rojo? Edición pendiente. Castellano???' },
  { internalId: '10192', name: 'AD&D Birthright', rpggeekId: '44882', notes: 'Averiguar versión y aventura' },
  { internalId: '10143', name: "D&D Challenges Champions of Mystara", rpggeekId: '62141', notes: 'Confirmar serie' },
  { internalId: '10159', name: 'D&D Expert Set', rpggeekId: '52101', notes: 'Confirmar serie. Castellano???' },
  { internalId: '10201', name: 'D&D 3.5 Guía del Dungeon Master', rpggeekId: '44037', notes: 'Confirmar serie. Castellano???' },
  { internalId: '10150', name: 'AD&D Hall of Heroes', rpggeekId: '48371', notes: 'Confirmar serie. Castellano???' },
  { internalId: '10213', name: "D&D Challenges Poor Wizard's Almanac", rpggeekId: '46168', notes: 'Confirmar serie. Inglés' },
  { internalId: '10208', name: "D&D Challenges Poor Wizard's Almanac II", rpggeekId: '55182', notes: 'Confirmar serie. Inglés' },
  { internalId: '10220', name: 'AD&D Reinos Olvidados Guía de Volo para los Valles', rpggeekId: '49781', notes: 'Confirmar serie. Inglés' },
  { internalId: '10151', name: 'D&D Set 1 Basic Rules', rpggeekId: '44081', notes: 'Repetido? Libro rojo? Castellano' },
  { internalId: '10148', name: 'D&D Set 2 Expert Rules', rpggeekId: '44966', notes: 'Libro azul. Inglés' },
  { internalId: '10144', name: 'D&D Set 3 Companion Rules', rpggeekId: '44967', notes: 'Inglés' },
  { internalId: '10141', name: 'D&D Set 4 Master Rules', rpggeekId: '44968', notes: 'Inglés' },
  { internalId: '10139', name: 'D&D Set 5 Immortal Rules', rpggeekId: '50856', notes: 'Inglés' },
  { internalId: '10177', name: 'D&D Challenges Wrath of the Immortals', rpggeekId: '56076', notes: 'Inglés' },
  { internalId: '10147', name: 'Comandos de Guerra - Duce (Italia, 1943-1945)', rpggeekId: '51018', notes: 'Averiguar sistema. Inglés' },
  { internalId: '10115', name: 'D&D 3e Puño y Espada. Una Guía para Guerreros y Monjes', rpggeekId: '44079', notes: 'Castellano' },
  { internalId: '10158', name: 'RuneQuest El Abismo de la Garganta de la Serpiente', rpggeekId: '48028', notes: '1e 2e o 3e. Inglés?' },
  { internalId: '10161', name: 'RuneQuest El Libro de los Trolls', rpggeekId: '54259', notes: 'Joc Internacional. Castellano' },
  { internalId: '10162', name: 'RuneQuest El Portal de Karshit', rpggeekId: '103200', notes: 'Joc Internacional. Inicial Intermedio y Avanzado. Castellano' },
  { internalId: '10212', name: 'En Avant!', rpggeekId: null, notes: 'Napoleonic Wargame. Antiguo rol. Historia Castellano | ERROR?' },
  { internalId: '10134', name: 'Fantasy Miniatures', rpggeekId: null, notes: 'No encontrado en RPGG | ERROR?' },
  { internalId: '10153', name: 'FireFight', rpggeekId: null, notes: 'No encontrado en RPGG | ERROR?' },
  { internalId: '10160', name: 'D&D Gazetteer', rpggeekId: '47933', notes: 'Averiguar versión y aventura. Incluso Juego. Castellano' },
  { internalId: '10152', name: 'Generatela', rpggeekId: null, notes: 'Desconocido. Material exterior. Castellano' },
  { internalId: '10181', name: 'D&D Gazetteer Glantri', rpggeekId: '47938', notes: 'Confirmar juego y versión. Inglés' },
  { internalId: '10156', name: 'HeroQuest Glorantha El Mundo y sus Habitantes', rpggeekId: '176555', notes: 'Confirmar juego y versión' },
  { internalId: '10165', name: 'RuneQuest Hijas de la Noche Las Crónicas de Santon', rpggeekId: null, notes: 'Joc International. No encontrado en RPGG' },
  { internalId: '10145', name: 'AD&D 2e Hollow World', rpggeekId: '46967', notes: 'Confirmar versión y juego. Castellano' },
  { internalId: '10101', name: 'Indiana Jones', rpggeekId: '43596', notes: 'Confirmar versión y juego' },
  { internalId: '10204', name: "AD&D 2e Joshuán's Almanac", rpggeekId: '55534', notes: 'Confirmar versión y juego. Inglés' },
  { internalId: '10196', name: 'Judge Dredd Manual', rpggeekId: '330201', notes: 'Confirmar versión y juego. Castellano' },
  { internalId: '10163', name: 'Karameikos', rpggeekId: '51810', notes: 'Confirmar versión y juego. Castellano' },
  { internalId: '10121', name: 'Kult', rpggeekId: '50019', notes: 'Confirmar edición. Castellano' },
  { internalId: '10168', name: 'RuneQuest 3e La Ciudad Perdida de Eldarad', rpggeekId: '60630', notes: 'Castellano' },
  { internalId: '10124', name: 'La Llamada de Cthulhu', rpggeekId: '46421', notes: 'Confirmar edición. Castellano' },
  { internalId: '10210', name: 'La Llamada de Cthulhu El Rastro de Tsathogghua', rpggeekId: '46444', notes: 'Confirmar edición. Castellano' },
  { internalId: '10172', name: 'La Llamada de Cthulhu La Maldición de los Chthonians', rpggeekId: '50071', notes: 'Castellano' },
  { internalId: '10215', name: 'Los Cazafantasmas', rpggeekId: '44022', notes: 'Inglés' },
  { internalId: '10154', name: 'AD&D 2e Mark of Amber', rpggeekId: '49789', notes: 'Material extra externo. Castellano' },
  { internalId: '10166', name: 'AD&D 2e Night of the Vampire', rpggeekId: '49783', notes: 'Castellano' },
  { internalId: '10167', name: 'Paranoia 2e El Cantar de las Cubas', rpggeekId: '56398', notes: 'Buscar aventura equivalente en inglés. 2ed? Castellano' },
  { internalId: '10138', name: 'Paranoia 1e Orcbusters', rpggeekId: '56617', notes: 'Incluye Enviad más clones. Castellano' },
  { internalId: '10194', name: 'Paranoia XP', rpggeekId: '66702', notes: 'Averiguar si es CORE y versión. Castellano' },
  { internalId: '10135', name: 'El Príncipe Valiente', rpggeekId: '44732', notes: 'Hay dos copias. Castellano' },
  { internalId: '10203', name: 'Race the Wind', rpggeekId: null, notes: 'Parece manual de BG simulador de carreras de veleros | ERROR?' },
  { internalId: '10119', name: 'AD&D 2e Ravenloft', rpggeekId: '46281', notes: 'Averiguar si es CORE y versión. Castellano' },
  { internalId: '10120', name: 'AD&D 2e Ravenloft Secretos de los Reinos del Terror', rpggeekId: '74452', notes: 'Castellano' },
  { internalId: '10175', name: 'Revistas Alea 36 Tomos', rpggeekId: null, notes: 'Parecen revistas de WG | ERROR?' },
  { internalId: '10176', name: 'Revistas Lider', rpggeekId: null, notes: 'Cantidad e interés pendientes. Inglés' },
  { internalId: '10200', name: 'Revistas Varias', rpggeekId: null, notes: '2ed. Inglés' },
  { internalId: '10224', name: 'Rolemaster 3e 3 in 1', rpggeekId: '48916', notes: 'Arms Law, Spell Law y Rolemaster Standard Rules. Inglés' },
  { internalId: '10231', name: 'Rolemaster 3e Annual 1996', rpggeekId: '48923', notes: 'Inglés' },
  { internalId: '10195', name: 'Rolemaster 3e Arcane Companion', rpggeekId: '49207', notes: null },
  { internalId: '10219', name: 'Rolemaster 3e Arms Law', rpggeekId: '47792', notes: '50 ejemplares. Castellano' },
  { internalId: '10178', name: 'Rolemaster 3e Black Ops', rpggeekId: '48934', notes: 'Inglés' },
  { internalId: '10216', name: 'Rolemaster 3e Channeling Companion', rpggeekId: '49194', notes: 'Inglés' },
  { internalId: '10221', name: 'Rolemaster 3e Channeling Mentalism & Essence', rpggeekId: null, notes: 'Son 3 revistas. Quizá acompañan al Companion. Inglés' },
  { internalId: '10214', name: 'Rolemaster 3e Companion', rpggeekId: null, notes: 'Son 7 revistas. Quizá acompañan al Companion. Inglés' },
  { internalId: '19902', name: 'Rolemaster 3e Companion (2ª copia)', rpggeekId: null, notes: 'Son 7 revistas. Quizá acompañan al Companion. Inglés. ID original en CSV: 10229' },
  { internalId: '10223', name: 'Rolemaster 3e Creatures & Monsters', rpggeekId: '227148', notes: 'Es RMSS o RMRFP. Inglés' },
  { internalId: '10185', name: 'Rolemaster 3e Essence Companion', rpggeekId: '49198', notes: 'Es RMSS o RMRFP. Inglés' },
  { internalId: '10191', name: 'Rolemaster 3e GameMasterLaw', rpggeekId: '48918', notes: 'Es RMSS o RMRFP. Inglés' },
  { internalId: '10226', name: 'Rolemaster 2e Heroes and Rogues', rpggeekId: '43674', notes: 'Inglés' },
  { internalId: '19903', name: 'Rolemaster 2e Heroes and Rogues (2ª copia)', rpggeekId: '43674', notes: 'REPETIDO? Inglés. ID original en CSV: 10227' },
  { internalId: '10230', name: 'Rolemaster Manual de Hechizos', rpggeekId: null, notes: 'IMPRESO. Castellano' },
  { internalId: '10188', name: 'Rolemaster 3e Martial Arts Companion', rpggeekId: '49201', notes: '2e o 3e. Inglés' },
  { internalId: '10182', name: 'Rolemaster 3e Mentalism Companion', rpggeekId: '49192', notes: '2e o 3e. Inglés' },
  { internalId: '10205', name: 'Rolemaster 3e Player Guide', rpggeekId: '138552', notes: '2e o 3e. Inglés' },
  { internalId: '10199', name: 'Rolemaster 2e Races & Cultures', rpggeekId: '72539', notes: '2e o 3e. Inglés' },
  { internalId: '10228', name: 'Rolemaster 3e Spell Law Pack', rpggeekId: '47803', notes: 'No encontrado pack. Castellano' },
  { internalId: '10211', name: 'Rolemaster 3e Talent Law', rpggeekId: '48927', notes: 'RMSS. Inglés' },
  { internalId: '10169', name: 'Rolemaster 3e Box Set', rpggeekId: null, notes: 'No encontrado box. Castellano' },
  { internalId: '10207', name: 'Rolemaster 3e Treasure Companion', rpggeekId: '49205', notes: 'Inglés' },
  { internalId: '10173', name: 'RuneQuest 3e Advanced', rpggeekId: '45806', notes: 'Inglés' },
  { internalId: '19905', name: 'RuneQuest 3e Advanced (2ª copia)', rpggeekId: '45806', notes: 'REPETIDO? ID original en CSV: 10146' },
  { internalId: '10149', name: 'RuneQuest 3e Básico 1988', rpggeekId: '45805', notes: 'Material extra externo. Castellano' },
  { internalId: '10174', name: 'RuneQuest 3e Básico 1988 (2ª copia)', rpggeekId: '45805', notes: 'Inglés. ID original en CSV: 10174' },
  { internalId: '10140', name: 'RuneQuest 3e El Señor de las Runas', rpggeekId: null, notes: 'Pequeño libro 47 pag con pantalla. Castellano' },
  { internalId: '10171', name: 'RuneQuest 3e Secretos Antiguos de Glorantha', rpggeekId: '48845', notes: 'Castellano' },
  { internalId: '10235', name: 'Rolemaster 3e Shadow World Master Atlas', rpggeekId: '60499', notes: 'IMPRESO. Inglés' },
  { internalId: '10202', name: 'Space Master 2e Legacy of the Ancients', rpggeekId: '80846', notes: 'Castellano' },
  { internalId: '10232', name: 'Rolemaster 3e Spell Law', rpggeekId: '47803', notes: 'Encuadernado. REPETIDO? Inglés' },
  { internalId: '10132', name: 'Star Trek', rpggeekId: '204868', notes: 'Confirmar juego y edición. Castellano' },
  { internalId: '10116', name: 'Stormbringer RPG', rpggeekId: '44288', notes: 'Lleva cartas y hojas anexas. Edición pendiente. Castellano' },
  { internalId: '10222', name: 'Streetfighting', rpggeekId: '48614', notes: 'IMPRESO. Confirmar juego de cyberpunk. Inglés' },
  { internalId: '10164', name: 'The Beast Within', rpggeekId: '90394', notes: 'Confirmar juego y sistema. Castellano' },
  { internalId: '10209', name: 'The Rules With No Name', rpggeekId: null, notes: 'No encontrado. Reglas para jugar a vaqueros. Inglés' },
  { internalId: '10225', name: 'The Rules With No Name (2ª copia)', rpggeekId: null, notes: 'REPETIDO? Inglés. ID original en CSV: 10225' },
  { internalId: '10130', name: 'Twilight 2000 2e', rpggeekId: '47806', notes: 'Definir edición. Castellano' },
  { internalId: '10131', name: 'Warhammer 40K Fantasía Juego de Rol', rpggeekId: '241220', notes: 'Definir edición. Castellano' },
  { internalId: '10206', name: 'Warhammer 40K Chapter Approved', rpggeekId: null, notes: 'No encontrado. Revisión de vehículos. Castellano | ERROR?' },
  { internalId: '10126', name: 'Warhammer El Juego de Rol', rpggeekId: '43646', notes: 'Definir edición. Castellano' },
  { internalId: '19904', name: 'Warhammer El Juego de Rol Guía de Criaturas', rpggeekId: '86059', notes: 'Definir edición. Castellano. ID original en CSV: 10126' },
  { internalId: '10117', name: 'Warhammer El Juego de Rol Guía del DJ', rpggeekId: '85397', notes: 'Definir edición. Castellano' },
  { internalId: '10102', name: 'Warhammer El Juego de Rol Secretos del DJ', rpggeekId: null, notes: 'No encontrado en RPGG. Castellano' },
  { internalId: '10112', name: 'Warhammer El Juego de Rol Tormenta Inminente', rpggeekId: null, notes: 'No encontrado en RPGG. Castellano' },
  { internalId: '10157', name: 'Rolemaster 2e War Law', rpggeekId: '50218', notes: 'Castellano' },
  { internalId: '10217', name: 'World War 2', rpggeekId: null, notes: 'No encontrado en RPGG. Inglés | ERROR?' },
];

async function main() {
  console.log(`Importando ${ROL_DATA.length} ítems de ludoteca de rol...`);

  let created = 0;
  let skipped = 0;

  for (const entry of ROL_DATA) {
    const existing = await prisma.libraryItem.findUnique({
      where: { internalId: entry.internalId }
    });

    if (existing) {
      console.log(`  OMITIDO (ya existe): ${entry.internalId} - ${entry.name}`);
      skipped++;
      continue;
    }

    await prisma.libraryItem.create({
      data: {
        internalId: entry.internalId,
        name: entry.name,
        bggId: entry.rpggeekId,
        gameType: 'ROL',
        condition: 'BUENO',
        notes: entry.notes,
        ownerEmail: null,
      }
    });

    console.log(`  Creado: ${entry.internalId} - ${entry.name}`);
    created++;
  }

  console.log(`\nResumen: ${created} creados, ${skipped} omitidos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
