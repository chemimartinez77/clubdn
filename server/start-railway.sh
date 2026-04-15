#!/bin/bash
set -e

echo "🚀 Iniciando servidor..."

# Verificar si hay migraciones pendientes
if npx prisma migrate status 2>&1 | grep -q "Database schema is not empty"; then
  echo "⚠️  Base de datos existente detectada. Haciendo baseline..."

  # Marcar todas las migraciones como aplicadas
  for migration in prisma/migrations/*/; do
    migration_name=$(basename "$migration")
    if [ "$migration_name" != "migration_lock.toml" ]; then
      echo "   Marcando $migration_name como aplicada..."
      npx prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
    fi
  done

  echo "✅ Baseline completado"
fi

# Resolver migraciones fallidas antes de aplicar nuevas.
# Necesario cuando una migración falla a mitad (ej: ADD VALUE de enum con error 55P04 de PostgreSQL).
# prisma migrate status lista las fallidas con la línea: 'The "<nombre>" migration started at ... failed'
MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)
FAILED_MIGRATION=$(echo "$MIGRATE_STATUS" | grep " failed$" | sed 's/.*"\(.*\)" migration started.*/\1/' || true)
if [ -n "$FAILED_MIGRATION" ]; then
  echo "⚠️  Migración fallida detectada: $FAILED_MIGRATION — marcando como rolled-back..."
  npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || true
fi

# Aplicar migraciones nuevas si las hay
echo "🔄 Verificando migraciones..."
npx prisma migrate deploy || echo "⚠️  No hay migraciones nuevas o ya están aplicadas"

echo "✅ Iniciando aplicación..."
node dist/index.js
