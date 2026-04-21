#!/bin/bash
set -e

echo "🧹 Limpiando directorio dist..."
rm -rf dist

echo "🔄 Ejecutando migraciones de Prisma..."
# Capturar el output de la migración
if ! MIGRATION_OUTPUT=$(npx prisma migrate deploy 2>&1); then
  echo "$MIGRATION_OUTPUT"

  RESOLVED=false

  # Migración de badges aplicada previamente via db push
  if echo "$MIGRATION_OUTPUT" | grep -q "BadgeCategory.*already exists"; then
    echo "⚠️  El enum BadgeCategory ya existe. Marcando migración como aplicada..."
    npx prisma migrate resolve --applied "20260128000000_add_badges_system"
    RESOLVED=true
  fi

  # Migración del sistema de préstamos aplicada previamente via db push
  if echo "$MIGRATION_OUTPUT" | grep -q "already exists"; then
    echo "⚠️  Tablas/columnas del sistema de préstamos ya existen. Marcando migración como aplicada..."
    npx prisma migrate resolve --applied "20260421000000_add_loan_system" 2>/dev/null || true
    RESOLVED=true
  fi

  if [ "$RESOLVED" = true ]; then
    echo "🔄 Reintentando migraciones..."
    npx prisma migrate deploy
  else
    echo "❌ Error de migración diferente. Abortando..."
    exit 1
  fi
else
  echo "$MIGRATION_OUTPUT"
  echo "✅ Migraciones aplicadas correctamente"
fi

echo "✨ Generando cliente de Prisma..."
npx prisma generate

echo "🔨 Compilando TypeScript..."
tsc

echo "✅ Build completado exitosamente!"