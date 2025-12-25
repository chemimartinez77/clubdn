// server/prisma/import-ludoteca.ts
import { PrismaClient, GameType, GameCondition } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Función para convertir tipo de juego del CSV a enum
function parseGameType(tipo: string): GameType {
  const normalized = tipo.toLowerCase().trim();
  switch (normalized) {
    case 'wargame':
      return GameType.WARGAME;
    case 'mesa':
      return GameType.MESA;
    case 'cartas':
      return GameType.CARTAS;
    case 'mini':
      return GameType.MINI;
    case 'rol':
      return GameType.ROL;
    default:
      console.warn(`Tipo de juego desconocido: "${tipo}", usando MESA por defecto`);
      return GameType.MESA;
  }
}

// Función para convertir condición del CSV a enum
function parseCondition(estado: string): GameCondition {
  const normalized = estado.toLowerCase().trim();
  switch (normalized) {
    case 'nuevo':
      return GameCondition.NUEVO;
    case 'bueno':
      return GameCondition.BUENO;
    case 'regular':
      return GameCondition.REGULAR;
    case 'malo':
      return GameCondition.MALO;
    default:
      console.warn(`Estado desconocido: "${estado}", usando BUENO por defecto`);
      return GameCondition.BUENO;
  }
}

// Función para parsear fecha
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    // Intentar diferentes formatos de fecha
    // Formato: DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    // Si no funciona, intentar parseo directo
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn(`No se pudo parsear la fecha: "${dateStr}"`);
    return null;
  }
}

// Función para parsear CSV simple
function parseCSV(content: string): string[][] {
  const lines = content.split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Split por comas, pero respetando campos entre comillas
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Agregar el último campo
    fields.push(currentField.trim());

    if (fields.length > 0) {
      rows.push(fields);
    }
  }

  return rows;
}

async function importLudoteca() {
  try {
    console.log('🎲 Iniciando importación de ludoteca...\n');

    // Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    await prisma.libraryItem.deleteMany({});
    console.log('✅ Datos existentes eliminados\n');

    // Leer el archivo CSV
    const csvPath = path.join(__dirname, 'inventario.dn.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parsear CSV
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      console.error('❌ El archivo CSV está vacío');
      return;
    }

    // Primera fila son los encabezados
    const headers = rows[0];
    console.log('📋 Encabezados encontrados:', headers);
    console.log(`📊 Total de filas a importar: ${rows.length - 1}\n`);

    let imported = 0;
    let errors = 0;

    // Procesar cada fila (saltando la primera que son los encabezados)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Mapear columnas del CSV
        // BGG ID, ID Interno, Fecha Adquisicion, Nombre, Descripcion, Notas, Tipo de juego, Estado, Propietario
        const [
          bggId,
          internalId,
          fechaAdquisicion,
          nombre,
          descripcion,
          notas,
          tipoJuego,
          estado,
          propietario
        ] = row;

        // Validar campos requeridos
        if (!internalId || !nombre) {
          console.warn(`⚠️  Fila ${i + 1}: Faltan campos requeridos (ID Interno o Nombre)`);
          errors++;
          continue;
        }

        // Crear el item en la base de datos
        await prisma.libraryItem.create({
          data: {
            bggId: bggId && bggId.trim() !== '' ? bggId.trim() : null,
            internalId: internalId.trim(),
            name: nombre.trim(),
            description: descripcion && descripcion.trim() !== '' ? descripcion.trim() : null,
            notes: notas && notas.trim() !== '' ? notas.trim() : null,
            gameType: parseGameType(tipoJuego || 'mesa'),
            condition: parseCondition(estado || 'bueno'),
            ownerEmail: propietario && propietario.trim() !== '' ? propietario.trim() : null,
            acquisitionDate: parseDate(fechaAdquisicion)
          }
        });

        imported++;

        if (imported % 100 === 0) {
          console.log(`✅ Importados ${imported} juegos...`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`❌ Error en fila ${i + 1}:`, errorMessage);
        errors++;
      }
    }

    console.log('\n🎉 Importación completada!');
    console.log(`✅ Juegos importados: ${imported}`);
    console.log(`❌ Errores: ${errors}`);

    // Mostrar estadísticas
    const stats = await prisma.libraryItem.groupBy({
      by: ['gameType'],
      _count: true
    });

    console.log('\n📊 Estadísticas por tipo de juego:');
    stats.forEach(stat => {
      console.log(`   ${stat.gameType}: ${stat._count}`);
    });

    const conditionStats = await prisma.libraryItem.groupBy({
      by: ['condition'],
      _count: true
    });

    console.log('\n📊 Estadísticas por condición:');
    conditionStats.forEach(stat => {
      console.log(`   ${stat.condition}: ${stat._count}`);
    });

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la importación
importLudoteca()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
