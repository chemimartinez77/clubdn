// server/scripts/seed-financial-categories.js
// Inserta las categorías financieras iniciales.
// Uso: node server/scripts/seed-financial-categories.js

'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GASTOS = [
  { name: 'Alquiler',                      icon: '🏠' },
  { name: 'Iberdrola',                     icon: '⚡' },
  { name: 'Agua',                          icon: '💧' },
  { name: 'Internet',                      icon: '🌐' },
  { name: 'Limpieza',                      icon: '🧹' },
  { name: 'Seguro',                        icon: '🛡️' },
  { name: 'Compra',                        icon: '🛒' },
  { name: 'Extintores',                    icon: '🧯' },
  { name: 'IRPF',                          icon: '📋' },
  { name: 'Obras',                         icon: '🔨' },
  { name: 'Mant. - Bricolaje/Ferreteria',  icon: '🔧' },
  { name: 'Mat. Papeleria',                icon: '📝' },
  { name: 'Mobiliario',                    icon: '🪑' },
  { name: 'Gastos Bancarios',              icon: '🏦' },
  { name: 'Juegos/Mat. Ludico (Gasto)',     icon: '🎲' },
  { name: 'Servicios Online',              icon: '💻' },
  { name: 'Adecuación nuevo local',        icon: '🏗️' },
  { name: 'Salida a Caja (Pagos de Mano)', icon: '💵' },
];

const INGRESOS = [
  { name: 'Cuotas Socios',        icon: '👥' },
  { name: 'Cuotas Colaboradores', icon: '🤝' },
  { name: 'Otros Ingresos',       icon: '💰' },
  { name: 'Juegos/Mat. Ludico (Venta)',   icon: '🎲' },
];

async function main() {
  console.log('Insertando categorías financieras...\n');

  for (const cat of GASTOS) {
    await prisma.financialCategory.create({
      data: { name: cat.name, type: 'GASTO', icon: cat.icon, color: 'bg-red-100 text-red-800' },
    });
    console.log(`  [GASTO  ] ${cat.icon} ${cat.name}`);
  }

  for (const cat of INGRESOS) {
    await prisma.financialCategory.create({
      data: { name: cat.name, type: 'INGRESO', icon: cat.icon, color: 'bg-green-100 text-green-800' },
    });
    console.log(`  [INGRESO] ${cat.icon} ${cat.name}`);
  }

  console.log(`\nTotal: ${GASTOS.length} gastos + ${INGRESOS.length} ingresos insertados.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
