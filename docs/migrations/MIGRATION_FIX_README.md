# Resolución de Migración Fallida de Notificaciones

## Problema

La migración `20260125000000_add_notifications` falló en producción y está bloqueando nuevos deployments.

## Solución

### Opción 1: Script Automático (Recomendado)

Ejecuta el script de resolución que aplicará los cambios y marcará la migración como resuelta:

```bash
cd server
node scripts/fix-migration.js
```

Luego verifica que todo esté bien:

```bash
npx prisma migrate deploy
```

### Opción 2: Manual desde Railway CLI

Si tienes acceso a la base de datos de Railway:

1. Conecta a la base de datos:
```bash
railway connect
```

2. Ejecuta el script SQL de resolución:
```bash
psql $DATABASE_URL -f scripts/resolve-failed-migration.sql
```

3. Marca la migración como resuelta:
```sql
UPDATE "_prisma_migrations"
SET finished_at = NOW(),
    success = true,
    logs = 'Resolved manually'
WHERE migration_name = '20260125000000_add_notifications'
  AND finished_at IS NULL;
```

4. Verifica que la migración esté marcada como exitosa:
```sql
SELECT migration_name, finished_at, success
FROM "_prisma_migrations"
WHERE migration_name = '20260125000000_add_notifications';
```

### Opción 3: Rollback Completo (Último Recurso)

Si las opciones anteriores no funcionan:

1. Marca la migración como fallida:
```bash
npx prisma migrate resolve --rolled-back 20260125000000_add_notifications
```

2. Vuelve a aplicar:
```bash
npx prisma migrate deploy
```

## Verificación

Después de resolver, verifica que todo funcione:

```bash
# Generar cliente Prisma
npx prisma generate

# Verificar que no haya migraciones pendientes
npx prisma migrate status

# Ejecutar build
npm run build
```

## Prevención Futura

Para evitar este problema en el futuro:

1. Siempre usa `IF NOT EXISTS` en CREATE statements
2. Prueba migraciones en staging antes de producción
3. Usa transacciones cuando sea posible
4. Ten backups antes de migraciones grandes

## Archivos Relacionados

- `scripts/fix-migration.js` - Script automático de resolución
- `scripts/resolve-failed-migration.sql` - SQL idempotente para aplicar cambios
- `prisma/migrations/20260125000000_add_notifications/migration.sql` - Migración original
