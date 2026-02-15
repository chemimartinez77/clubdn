# Inicio Rápido - Despliegue en Render

## ✅ Archivos preparados

Ya está todo listo para desplegar. Los archivos importantes son:

- ✅ `render.yaml` - Configuración automática de Render
- ✅ `server/.env.example` - Variables de entorno del backend
- ✅ `client/.env.example` - Variables de entorno del frontend
- ✅ `.gitignore` actualizado - No subirá información sensible
- ✅ Scripts de build configurados

## 🚀 Pasos Rápidos (5 minutos)

### 1. Sube el código a GitHub (si aún no lo hiciste)

```bash
git add .
git commit -m "feat: preparar para despliegue en Render"
git push origin main
```

### 2. Despliega en Render

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Clic en **"New +"** → **"Blueprint"**
3. Selecciona tu repositorio de GitHub
4. Render detectará el archivo `render.yaml`
5. Clic en **"Apply"**

**¡Eso es todo!** Render creará automáticamente:
- 📦 Base de datos PostgreSQL
- 🔧 Backend API
- 🌐 Frontend Web

### 3. Configurar variables de entorno opcionales

Después del despliegue, ve a cada servicio y agrega (opcionales):

**Backend (clubdn-api):**
- `RESEND_API_KEY` - Para enviar emails (opcional)
- `FROM_EMAIL` - Email remitente (opcional)

**Frontend (clubdn-web):**
- Todo configurado automáticamente ✅

### 4. Crear tu primer usuario admin

Una vez desplegado:

1. Ve a tu sitio web
2. Regístrate con tu email
3. Ve a Render → PostgreSQL → "Connect"
4. Conéctate con un cliente SQL (DBeaver, pgAdmin)
5. Ejecuta:
   ```sql
   UPDATE "User"
   SET status = 'APPROVED', role = 'ADMIN'
   WHERE email = 'tu-email@ejemplo.com';
   ```

### 5. (Opcional) Poblar con datos de ejemplo

Si quieres tener usuarios de prueba:

```bash
cd server
DATABASE_URL="tu_url_de_produccion" npx tsx src/scripts/seedMemberships.ts
```

## ⏱️ Tiempos de Despliegue

- Primera vez: ~10-15 minutos
- Despliegues siguientes: ~5 minutos
- Redespliegue automático en cada `git push`

## 🔗 URLs después del despliegue

Tendrás 3 URLs:

1. **Frontend**: `https://clubdn-web.onrender.com` (o el nombre que elijas)
2. **Backend**: `https://clubdn-api.onrender.com`
3. **Base de datos**: URL interna de PostgreSQL

## ⚠️ Importante

- El servicio gratuito "duerme" después de 15 minutos sin uso
- Primera petición después de dormir tarda ~30 segundos
- Base de datos gratuita expira en 90 días (hacer backups)

## 📖 Más Información

Lee [DEPLOYMENT.md](./DEPLOYMENT.md) para:
- Configuración manual paso a paso
- Solución de problemas comunes
- Configurar dominio personalizado
- Backups de base de datos

## 💡 Tips

1. **Dominio personalizado**: Puedes agregar tu propio dominio gratis
2. **Monitoreo**: Ve logs en tiempo real en cada servicio
3. **Cron jobs**: Usa [cron-job.org](https://cron-job.org) para hacer ping cada 10 min y evitar que duerma

¡Listo para producción! 🎉
