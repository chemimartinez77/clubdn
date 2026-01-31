#!/bin/bash
set -e

echo "🧹 Limpiando directorio dist..."
rm -rf dist

echo "✨ Generando cliente de Prisma..."
npx prisma generate

echo "🔨 Compilando TypeScript..."
tsc

echo "✅ Build completado exitosamente!"
