# Tests E2E con Playwright

Guía para preparar el entorno de pruebas funcionales, tanto en local como en staging.

---

## Opción A: Entorno local

### 1. Base de datos local con Docker

Necesitas Docker instalado. Si no lo tienes: https://docs.docker.com/desktop/install/windows-install/

```bash
# Crear y arrancar el contenedor de PostgreSQL para tests
docker run --name clubdn-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=clubdn_test \
  -p 5433:5432 \
  -d postgres:16
```

Para arrancarlo/pararlo en sesiones futuras:
```bash
docker start clubdn-test
docker stop clubdn-test
```

### 2. Variables de entorno del servidor

Crea un archivo `server/.env.test` (copia de `.env` apuntando a la BD de test):

```env
NODE_ENV=test
PORT=5001

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/clubdn_test?schema=public"

JWT_SECRET=secret_para_tests
JWT_EXPIRATION=1d

CLIENT_URL=http://localhost:5173

# Email: puedes usar un valor falso en tests, no se enviarán emails reales
RESEND_API_KEY=re_test_fake
RESEND_FROM=test@clubdn.com
EMAIL_FROM=test@clubdn.com

# Cloudinary: usa credenciales reales o una cuenta de prueba
# Los tests que suban archivos las necesitarán
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# BGG (opcional para tests)
BGG_API_BEARER_TOKEN=
BGG_API_USERNAME=
BGG_API_PASSWORD=
BGG_USER_AGENT=
```

### 3. Migrar y sembrar la BD de test

```bash
cd server

# Aplicar migraciones a la BD de test
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/clubdn_test?schema=public" npx prisma migrate deploy

# (Opcional) Ejecutar seed con datos de prueba
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/clubdn_test?schema=public" npx prisma db seed
```

### 4. Arrancar el servidor apuntando a la BD de test

```bash
cd server
cp .env.test .env.local  # o configura tu IDE para usar .env.test
NODE_ENV=test npx ts-node src/index.ts
```

> O mejor: ajusta el script en `package.json` para cargar `.env.test` con `dotenv-cli`:
> ```bash
> npm install -D dotenv-cli
> # y luego: dotenv -e .env.test -- npx ts-node src/index.ts
> ```

### 5. Configurar Playwright para local

En `client/playwright.config.ts`, descomenta/ajusta:

```ts
use: {
  baseURL: 'http://localhost:5173',
},
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: true,
},
```

### 6. Ejecutar los tests

```bash
cd client

# Todos los tests (headless)
npx playwright test

# Con UI interactiva
npx playwright test --ui

# Solo en Chrome
npx playwright test --project=chromium

# Generar tests grabando acciones en el navegador
npx playwright codegen http://localhost:5173
```

---

## Opción B: Entorno de staging en Railway

### 1. Crear el entorno en Railway

1. Entra en tu proyecto en [railway.app](https://railway.app)
2. Arriba a la izquierda, en el selector de entornos, haz clic en **"New Environment"**
3. Nómbralo `staging`
4. Railway clonará todos los servicios de `production` en el nuevo entorno

### 2. Base de datos de staging

1. Dentro del entorno `staging`, Railway crea automáticamente una nueva instancia de PostgreSQL separada de producción
2. Copia la `DATABASE_URL` del plugin de PostgreSQL de staging
3. Pégala en las variables de entorno del servicio de backend en staging

### 3. Variables de entorno de staging

En el servicio de backend (entorno staging), ajusta:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `staging` |
| `DATABASE_URL` | *(URL del PostgreSQL de staging)* |
| `CLIENT_URL` | URL del frontend de staging |
| `JWT_SECRET` | Un secret distinto al de producción |
| `CLOUDINARY_*` | Puedes reutilizar las mismas credenciales de Cloudinary |
| `RESEND_API_KEY` | Reutilizar o usar una API key de test de Resend |

### 4. Migrar la BD de staging

Una vez desplegado el backend en staging, ejecuta las migraciones desde tu máquina:

```bash
cd server
DATABASE_URL="<URL_POSTGRES_STAGING>" npx prisma migrate deploy
```

### 5. Configurar Playwright para staging

Crea `client/.env.staging`:
```env
BASE_URL=https://tu-frontend-staging.up.railway.app
```

Y en `playwright.config.ts`:
```ts
use: {
  baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
},
```

Para correr contra staging:
```bash
BASE_URL=https://tu-frontend-staging.up.railway.app npx playwright test
```

### Coste estimado de staging en Railway

- Si lo dejas activo 24/7: ~$5-10/mes adicionales (similar a producción)
- Si solo lo activas para correr tests y luego lo apagas: céntimos al mes
- Railway permite pausar servicios manualmente desde el dashboard

---

## Estructura de tests recomendada

```
tests/e2e/
├── SETUP_E2E_TESTING_2026-02-21_20-14.md  # Este archivo
├── fixtures/
│   └── auth.setup.ts          # Login global (guarda sesión para reutilizar)
├── auth/
│   └── login.spec.ts
├── events/
│   ├── create-event.spec.ts
│   ├── register-event.spec.ts
│   └── invitations.spec.ts    # Cubre el bug de cancelar invitación
├── documents/
│   └── upload-document.spec.ts
└── example.spec.ts            # Generado por Playwright (puedes borrar)
```

### Autenticación compartida entre tests

Para no hacer login en cada test, usa el mecanismo de `storageState` de Playwright:

```ts
// fixtures/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('autenticar usuario admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@clubdn.com');
  await page.fill('[name=password]', 'password_test');
  await page.click('[type=submit]');
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
});
```

Y en `playwright.config.ts`:
```ts
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests/e2e/.auth/admin.json',
    },
    dependencies: ['setup'],
  },
],
```

Añade `tests/e2e/.auth/` al `.gitignore` para no commitear tokens de sesión.
