// server/src/scripts/seedFinancialCategories.ts
import { prisma } from '../config/database';

const defaultCategories = [
  { name: 'Alquiler', icon: '🏠', color: 'bg-blue-100 text-blue-800' },
  { name: 'Luz', icon: '⚡', color: 'bg-yellow-100 text-yellow-800' },
  { name: 'Agua', icon: '💧', color: 'bg-cyan-100 text-cyan-800' },
  { name: 'Internet', icon: '🌐', color: 'bg-purple-100 text-purple-800' },
  { name: 'Limpieza', icon: '🧹', color: 'bg-green-100 text-green-800' },
  { name: 'Seguro', icon: '🛡️', color: 'bg-orange-100 text-orange-800' },
  { name: 'Compra', icon: '🛒', color: 'bg-pink-100 text-pink-800' },
  { name: 'Extintores', icon: '🧯', color: 'bg-red-100 text-red-800' },
  { name: 'IRPF', icon: '📋', color: 'bg-indigo-100 text-indigo-800' },
  { name: 'Obras', icon: '🔨', color: 'bg-amber-100 text-amber-800' },
  { name: 'Material', icon: '📦', color: 'bg-teal-100 text-teal-800' },
  { name: 'Mobiliario', icon: '🪑', color: 'bg-lime-100 text-lime-800' },
  { name: 'Gastos Bancarios', icon: '🏦', color: 'bg-slate-100 text-slate-800' },
  { name: 'Juegos', icon: '🎲', color: 'bg-rose-100 text-rose-800' },
  { name: 'Servicios Online', icon: '💻', color: 'bg-violet-100 text-violet-800' },
  { name: 'Ingresos', icon: '💰', color: 'bg-emerald-100 text-emerald-800' }
];

async function seedCategories() {
  console.log('🌱 Seeding financial categories...');

  try {
    for (const category of defaultCategories) {
      const existing = await prisma.financialCategory.findUnique({
        where: { name: category.name }
      });

      if (!existing) {
        await prisma.financialCategory.create({
          data: {
            ...category,
            type: 'GASTO' as const,
            showInBalance: true
          }
        });
        console.log(`✅ Created category: ${category.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${category.name}`);
      }
    }

    console.log('✨ Seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
