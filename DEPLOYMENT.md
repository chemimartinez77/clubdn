# Guía de Despliegue en Render

Esta guía te ayudará a desplegar el proyecto Club Dreadnought en Render de forma gratuita.

## Requisitos Previos

- Cuenta en [Render](https://render.com) (gratis)
- Código subido a GitHub
- Cuenta en [Resend](https://resend.com) para emails (opcional pero recomendado)

## Paso 1: Crear cuenta en Render

1. Ve a [render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub
3. Autoriza a Render para acceder a tus repositorios

## Paso 2: Desplegar usando el archivo render.yaml

### Opción A: Despliegue Automático (Blueprint)

1. En el dashboard de Render, haz clic en **"New +"** → **"Blueprint"**
2. Conecta tu repositorio de GitHub (clubdn)
3. Render detectará automáticamente el archivo `render.yaml`
4. Haz clic en **"Apply"**

Render creará automáticamente:
- ✅ Base de datos PostgreSQL (clubdn-db)
- ✅ Backend API (clubdn-api)
- ✅ Frontend Web (clubdn-web)

### Opción B: Despliegue Manual

Si prefieres crear los servicios manualmente:

#### 1. Crear la Base de Datos

1. En Render dashboard, clic en **"New +"** → **"PostgreSQL"**
2. Nombre: `clubdn-db`
3. Plan: **Free**
4. Region: **Frankfurt** (más cercana a España)
5. Clic en **"Create Database"**
6. Guarda la **Internal Database URL** que aparece

#### 2. Desplegar el Backend

1. Clic en **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Configuración:
   - **Name**: `clubdn-api`
   - **Region**: Frankfurt
   - **Branch**: main
   - **Root Directory**: `server`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run prisma:migrate && npm start`
   - **Plan**: Free

4. Variables de entorno (Environment Variables):
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=[pega aquí la Internal Database URL de PostgreSQL]
   JWT_SECRET=[genera un string aleatorio seguro, ej: usa openssl rand -base64 32]
   CLIENT_URL=[dejar vacío por ahora, lo configuraremos después]
   RESEND_API_KEY=[tu API key de Resend, opcional]
   FROM_EMAIL=[tu email verificado en Resend, opcional]
   ```

5. Clic en **"Create Web Service"**
6. Espera a que termine el despliegue (5-10 minutos)
7. Copia la URL del servicio (ej: `https://clubdn-api.onrender.com`)

#### 3. Desplegar el Frontend

1. Clic en **"New +"** → **"Static Site"**
2. Conecta tu repositorio de GitHub
3. Configuración:
   - **Name**: `clubdn-web`
   - **Region**: Frankfurt
   - **Branch**: main
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free

4. Variables de entorno:
   ```
   VITE_API_URL=[pega la URL del backend que copiaste antes]
   ```

5. Clic en **"Create Static Site"**
6. Espera a que termine el despliegue (5-10 minutos)
7. Copia la URL del frontend (ej: `https://clubdn.onrender.com`)

#### 4. Actualizar CLIENT_URL en el Backend

1. Ve al servicio del backend (`clubdn-api`)
2. Ve a **"Environment"**
3. Edita la variable `CLIENT_URL` y pega la URL del frontend
4. Guarda los cambios
5. El servicio se redesplegar automáticamente

## Paso 3: Configurar el primer usuario admin

Después del primer despliegue, necesitas crear tu primer usuario administrador:

### Opción 1: Usar el endpoint de registro + aprobar manualmente en la BD

1. Ve a tu frontend desplegado
2. Regístrate como usuario normal
3. Ve al dashboard de Render → PostgreSQL → **"Connect"** → **"External Connection"**
4. Usa un cliente como [pgAdmin](https://www.pgadmin.org/) o [DBeaver](https://dbeaver.io/) para conectarte
5. Ejecuta este SQL para aprobar y hacer admin a tu usuario:
   ```sql
   UPDATE "User"
   SET status = 'APPROVED', role = 'ADMIN'
   WHERE email = 'tu-email@ejemplo.com';
   ```

### Opción 2: Crear un script seed para admin

Puedes crear un script temporal para crear el admin automáticamente (solicítame ayuda para esto si lo prefieres).

## Paso 4: Poblar la base de datos con datos de ejemplo

Si quieres tener datos de prueba:

1. En tu terminal local, copia la `DATABASE_URL` de producción
2. Ejecuta:
   ```bash
   cd server
   DATABASE_URL="tu_url_de_produccion" npx tsx src/scripts/seedMemberships.ts
   ```

## Notas Importantes

### ⚠️ Limitaciones del Plan Gratuito

- **Base de datos**: 1GB de almacenamiento, expira después de 90 días (debes hacer backup)
- **Backend**: El servicio "duerme" después de 15 minutos de inactividad
  - Primera petición después de dormir tarda ~30 segundos
  - Puedes usar un servicio como [cron-job.org](https://cron-job.org) para hacer pings cada 10 minutos
- **Frontend**: Siempre activo, muy rápido

### 🔄 Redespliegue Automático

Render se redesplegar automáticamente cada vez que hagas `git push` a tu rama main.

### 📊 Monitoreo

- Ve a cada servicio en Render para ver:
  - Logs en tiempo real
  - Métricas de uso
  - Estado del servicio

### 🔐 Seguridad

- Nunca subas archivos `.env` al repositorio
- Usa siempre variables de entorno en Render
- Cambia el `JWT_SECRET` en producción

### 💾 Backup de Base de Datos

El plan gratuito de PostgreSQL expira en 90 días. Configura backups regulares:

1. Ve a tu base de datos en Render
2. Clic en **"Info"** → **"Connection"**
3. Usa `pg_dump` para hacer backups:
   ```bash
   pg_dump [DATABASE_URL] > backup.sql
   ```

## Problemas Comunes

### El backend no arranca

- Verifica los logs en Render
- Asegúrate de que todas las variables de entorno estén configuradas
- Verifica que DATABASE_URL sea correcta

### Error de CORS

- Verifica que CLIENT_URL en el backend apunte a la URL correcta del frontend
- Verifica que VITE_API_URL en el frontend apunte al backend

### Migraciones de Prisma fallan

- Asegúrate de que `DATABASE_URL` esté configurada
- El comando `npm run prisma:migrate` debería ejecutarse automáticamente en el start

### El frontend no se conecta al backend

- Verifica que VITE_API_URL esté configurada correctamente
- Abre la consola del navegador para ver errores
- Verifica que el backend esté corriendo (prueba `https://tu-backend.onrender.com/api/health`)

## Contacto y Soporte

Si tienes problemas, puedes:
- Ver los logs en Render para más detalles
- Consultar la [documentación de Render](https://render.com/docs)
- Abrir un issue en el repositorio de GitHub

## Siguiente Paso: Dominio Personalizado

Si quieres usar tu propio dominio (ej: `clubdreadnought.com`):

1. Compra un dominio en [Namecheap](https://www.namecheap.com/) o similar
2. En Render, ve a tu frontend → **"Settings"** → **"Custom Domain"**
3. Sigue las instrucciones para configurar los registros DNS
4. Render provee HTTPS automáticamente con Let's Encrypt

¡Listo! Tu aplicación debería estar funcionando en producción.
