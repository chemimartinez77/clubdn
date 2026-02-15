# 🛡️ Plan de Disaster Recovery - Club Dreadnought

## Índice
1. [Estrategia de Backups](#estrategia-de-backups)
2. [Entornos de Base de Datos](#entornos-de-base-de-datos)
3. [Protecciones de Seguridad](#protecciones-de-seguridad)
4. [Procedimientos de Recuperación](#procedimientos-de-recuperación)
5. [Monitoreo y Alertas](#monitoreo-y-alertas)
6. [Checklist Pre-Deploy](#checklist-pre-deploy)

---

## 📦 Estrategia de Backups

### Backups Automáticos en Railway

#### Configuración Inicial
1. Acceder a Railway Dashboard → PostgreSQL service → Backups tab
2. Click "Edit schedule"
3. Configurar:
   - **Frecuencia:** Diaria a las 3:00 AM UTC
   - **Retención:** Mínimo 7 días (recomendado: 30 días)
4. Crear primer backup manual: Click "New backup"
5. Verificar que el backup se completó correctamente

#### Verificación de Backups
Mensualmente, realizar un test de restore en un entorno de prueba:
```bash
# Descargar backup desde Railway
railway backups list
railway backups download <backup-id> > test-restore.sql

# Restaurar en BD de prueba
psql $STAGING_DATABASE_URL < test-restore.sql
```

### Backups Locales Adicionales

#### Script de Backup Manual
Crear `server/scripts/backup-db.sh`:
```bash
#!/bin/bash
# Backup manual de la base de datos de producción

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Realizar backup
echo "🔄 Iniciando backup..."
railway run -- pg_dump $DATABASE_URL > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

echo "✅ Backup completado: ${BACKUP_FILE}.gz"

# Limpiar backups antiguos (mantener últimos 14 días)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +14 -delete
```

Hacer ejecutable:
```bash
chmod +x server/scripts/backup-db.sh
```

#### Programar Backups Automáticos

**Linux/Mac (crontab):**
```bash
# Editar crontab
crontab -e

# Añadir línea (ejecutar diario a las 3 AM)
0 3 * * * cd /path/to/clubdn/server && ./scripts/backup-db.sh
```

**Windows (Task Scheduler):**
1. Abrir Task Scheduler
2. Create Basic Task → "Database Backup"
3. Trigger: Daily at 3:00 AM
4. Action: Start a program
5. Program: `bash`
6. Arguments: `scripts/backup-db.sh`
7. Start in: `C:\proyectos\clubdn\server`

---

## 🗄️ Entornos de Base de Datos

### Arquitectura Recomendada

```
┌─────────────┐
│ Development │ → SQLite local (test.db)
└─────────────┘

┌─────────────┐
│   Staging   │ → PostgreSQL en Railway (separada)
└─────────────┘

┌─────────────┐
│ Production  │ → PostgreSQL en Railway
└─────────────┘
```

### Configurar Base de Datos de Staging

#### 1. Crear BD de Staging en Railway
1. Railway Dashboard → New → Database → PostgreSQL
2. Nombrar: "club-dn-staging"
3. Copiar `DATABASE_URL` generada

#### 2. Configurar Variables de Entorno

**Desarrollo Local (.env):**
```env
DATABASE_URL="file:./test.db"
NODE_ENV=development
```

**Tests (.env.test):**
```env
DATABASE_URL="file:./test.db"
NODE_ENV=test
```

**Staging (Railway):**
```env
DATABASE_URL=postgresql://postgres:...@staging.railway.app/railway
NODE_ENV=staging
FRONTEND_URL=https://staging.clubdreadnought.org
```

**Producción (Railway):**
```env
DATABASE_URL=postgresql://postgres:...@prod.railway.app/railway
NODE_ENV=production
FRONTEND_URL=https://clubdreadnought.org
```

#### 3. Deploy a Staging

Crear branch de staging:
```bash
git checkout -b staging
git push -u origin staging
```

Configurar en Railway:
1. Dashboard → New → Import from GitHub
2. Seleccionar branch: `staging`
3. Conectar a BD de staging
4. Variables de entorno de staging

### Script de Seed para Datos Básicos

Crear `server/scripts/seed-basic.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedBasicData() {
  console.log('🌱 Seeding basic data...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'changeme123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clubdreadnought.org' },
    update: {},
    create: {
      email: 'admin@clubdreadnought.org',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
      status: 'APPROVED',
      emailVerified: true,
      profile: {
        create: {
          phone: '+34000000000',
        }
      }
    }
  });

  console.log('✅ Admin creado:', admin.email);

  // Puedes añadir más datos iniciales aquí
  // Por ejemplo: categorías por defecto, configuraciones, etc.

  console.log('🎉 Seed completado');
}

seedBasicData()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Añadir script a `package.json`:
```json
{
  "scripts": {
    "seed": "ts-node scripts/seed-basic.ts"
  }
}
```

Ejecutar:
```bash
# Local/Staging
npm run seed

# Producción (Railway)
railway run npm run seed
```

---

## 🔒 Protecciones de Seguridad

### 1. Safety Check en Tests

**Ya implementado en `src/tests/setup.ts`:**
```typescript
// Verificar que estamos usando la BD de test
if (!process.env.DATABASE_URL?.includes('test.db')) {
  throw new Error('❌ Tests bloqueados: DATABASE_URL debe contener "test.db"');
}
```

### 2. Exclusión de Tests en Build

**Ya configurado en `tsconfig.json`:**
```json
{
  "exclude": [
    "src/tests/**/*"
  ]
}
```

### 3. Validación de Entorno en Scripts Destructivos

Para cualquier script que modifique datos, añadir:
```typescript
// Al inicio del script
if (process.env.NODE_ENV === 'production') {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    readline.question('⚠️  PRODUCCIÓN detectada. ¿Continuar? (yes/no): ', resolve);
  });

  if (answer !== 'yes') {
    console.log('❌ Operación cancelada');
    process.exit(0);
  }
  readline.close();
}
```

### 4. Configuración de Prisma en Producción

Añadir a `schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Protección adicional
  directUrl = env("DIRECT_URL")
}
```

Variables en Railway (opcional para connection pooling):
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # Para migraciones
```

---

## 🔄 Procedimientos de Recuperación

### Restaurar desde Backup de Railway

#### 1. Identificar el Backup
```bash
railway backups list
```

#### 2. Descargar Backup
```bash
railway backups download <backup-id> > restore.sql
```

#### 3. Restaurar
```bash
# IMPORTANTE: Esto sobrescribirá toda la BD
railway run -- psql < restore.sql
```

### Restaurar desde Backup Local

```bash
# Descomprimir
gunzip backup_20260215_030000.sql.gz

# Restaurar
railway run -- psql < backup_20260215_030000.sql
```

### Recuperación de Datos Específicos

Si solo necesitas recuperar ciertos registros:
```bash
# Extraer solo la tabla User del backup
pg_restore --table=User backup.sql > users_only.sql

# Restaurar solo esa tabla
psql $DATABASE_URL < users_only.sql
```

### Rollback de Migraciones

```bash
# Ver historial de migraciones
npx prisma migrate status

# Hacer rollback manualmente
psql $DATABASE_URL < path/to/previous_migration.sql

# Actualizar registro de migraciones
npx prisma migrate resolve --rolled-back migration_name
```

---

## 📊 Monitoreo y Alertas

### Configurar Alertas en Railway

1. Railway Dashboard → Project → Settings
2. Notifications → Add Integration
3. Configurar:
   - **Webhook URL:** (Slack, Discord, email)
   - **Eventos a monitorear:**
     - Deployment failures
     - Database high usage (>80%)
     - Service crashes

### Logging de Operaciones Críticas

Implementar sistema de auditoría para operaciones destructivas:

Crear `server/src/utils/audit-log.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAuditEvent(
  action: string,
  userId: number | null,
  details: any
) {
  if (process.env.NODE_ENV === 'production') {
    console.log('🔍 AUDIT:', {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details
    });

    // Opcional: guardar en tabla de auditoría
    // await prisma.auditLog.create({ ... });
  }
}
```

Usar en operaciones críticas:
```typescript
// Antes de borrar datos
await logAuditEvent('DELETE_USER', adminUserId, { targetUserId: user.id });
await prisma.user.delete({ where: { id: user.id } });
```

### Health Check Endpoint

Añadir en `server/src/routes/health.ts`:
```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/health', async (req, res) => {
  try {
    // Verificar conexión a BD
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

export default router;
```

Configurar monitoreo externo (UptimeRobot, Pingdom) para hacer ping a `/health` cada 5 minutos.

---

## ✅ Checklist Pre-Deploy

### Desarrollo → Staging

- [ ] Tests pasan en local con SQLite
- [ ] Migraciones aplicadas en staging
- [ ] Variables de entorno verificadas
- [ ] Build exitoso localmente
- [ ] Código revisado (PR aprobado)

```bash
# Verificar antes de deploy
npm test
npm run build
npm run lint
```

### Staging → Producción

- [ ] **Backup manual creado** (menos de 1 hora)
- [ ] Tests de integración pasan en staging
- [ ] Variables de entorno de producción verificadas
- [ ] Usuarios de prueba funcionan en staging
- [ ] Plan de rollback preparado
- [ ] Logs de staging limpios (sin errores)
- [ ] Migraciones de BD revisadas y probadas

```bash
# Crear backup antes de deploy a producción
railway run --service=postgres -- pg_dump $DATABASE_URL > pre-deploy-backup.sql
gzip pre-deploy-backup.sql

# Verificar que se creó correctamente
ls -lh pre-deploy-backup.sql.gz
```

### Post-Deploy

- [ ] Health check responde OK
- [ ] Logs sin errores críticos
- [ ] Login funciona correctamente
- [ ] Funcionalidades core operativas
- [ ] Crear tag de versión en git

```bash
# Monitorear logs post-deploy (primeros 5 minutos)
railway logs --tail

# Tag de versión
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 🚨 Señales de Alerta

Detener inmediatamente si ves en logs:

```
❌ DELETE FROM "public"."User" WHERE 1=1
❌ DELETE FROM "public"."Event" WHERE 1=1
❌ 🧪 Test environment initialized
❌ Tests bloqueados: DATABASE_URL debe contener "test.db"
```

**Acción inmediata:**
1. Detener deploy en Railway
2. Revisar variables de entorno
3. Verificar que tests están excluidos del build
4. No continuar hasta identificar la causa

---

## 📞 Recursos y Contactos

### Documentación
- **Railway Backups:** https://docs.railway.app/databases/backups
- **PostgreSQL Backup:** https://www.postgresql.org/docs/current/backup.html
- **Prisma Migrations:** https://www.prisma.io/docs/concepts/components/prisma-migrate

### Soporte
- **Railway Support:** https://railway.app/help
- **Railway Community:** https://discord.gg/railway

### Comandos Útiles

```bash
# Railway CLI
railway login
railway status
railway logs --tail
railway run -- <comando>

# Prisma
npx prisma migrate status
npx prisma db push
npx prisma studio

# PostgreSQL
pg_dump, psql, pg_restore
```

---

## 🎯 Mejores Prácticas

1. **Backups diarios automáticos** configurados ANTES de ir a producción
2. **Staging environment** que replica producción
3. **Variables de entorno** estrictas por entorno
4. **Tests aislados** completamente de producción
5. **Auditoría** de operaciones destructivas
6. **Monitoreo** activo con alertas
7. **Documentación** actualizada de procedimientos
8. **Verificar backups** mensualmente con test restore

---

**Versión:** 1.0
**Última actualización:** 15 Febrero 2026
**Mantenido por:** Equipo Club DN
**Revisión:** Trimestral
