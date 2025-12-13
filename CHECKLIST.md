# ✅ Checklist de Inicio Rápido - clubdn

## 🎯 Pasos Inmediatos (Empieza aquí)

### 1️⃣ Preparar el Repositorio Local

```bash
# Clonar el repo
git clone https://github.com/chemimartinez77/clubdn.git
cd clubdn

# Crear estructura de carpetas
mkdir -p client server shared
```

---

### 2️⃣ Configurar Neon DB

1. **Ve a:** https://neon.tech
2. **Crea un nuevo proyecto:** "clubdn"
3. **Copia el connection string** (formato: `postgresql://user:password@host/dbname`)
4. **Guárdalo** - lo necesitarás para el `.env`

---

### 3️⃣ Setup del Backend

```bash
cd server

# Inicializar proyecto
npm init -y

# Instalar dependencias de producción
npm install express cors dotenv bcrypt jsonwebtoken nodemailer express-validator @neondatabase/serverless @prisma/client

# Instalar dependencias de desarrollo
npm install -D typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cors @types/nodemailer tsx nodemon prisma

# Inicializar TypeScript
npx tsc --init

# Inicializar Prisma
npx prisma init
```

**Crear archivo `.env`:**
```bash
# En server/.env
DATABASE_URL="TU_CONNECTION_STRING_DE_NEON_AQUI"
JWT_SECRET="cambia_esto_por_algo_super_secreto_123456"
JWT_EXPIRATION="7d"
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"

# Email (Gmail ejemplo - usa tu email)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="tu-email@gmail.com"
EMAIL_PASSWORD="tu-app-password-de-gmail"
EMAIL_FROM="Club DN <noreply@clubdn.com>"

# Admin
DEFAULT_ADMIN_EMAIL="admin@clubdn.com"
EMAIL_VERIFICATION_EXPIRY_HOURS=24
```

**Copiar el schema de Prisma:**
- Copia el contenido del archivo `AUTH_FLOW.md` (sección de schema.prisma)
- Pégalo en `server/prisma/schema.prisma`

**Ejecutar migración:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### 4️⃣ Setup del Frontend

```bash
cd ../client

# Crear proyecto Vite
npm create vite@latest . -- --template react-ts
npm install

# Instalar dependencias
npm install react-router-dom axios @tanstack/react-query react-hook-form @hookform/resolvers zod clsx tailwind-merge class-variance-authority

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn-ui@latest init
# Responde:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes

# Instalar componentes básicos
npx shadcn-ui@latest add button input card form label
```

**Crear archivo `.env`:**
```bash
# En client/.env
VITE_API_URL="http://localhost:5000/api"
```

---

### 5️⃣ Configurar Scripts en la Raíz

```bash
cd ..

# Instalar concurrently para correr ambos servers
npm install -D concurrently
```

**Editar `package.json` raíz:**
```json
{
  "name": "clubdn",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Editar `server/package.json` scripts:**
```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

---

### 6️⃣ Configurar Email (Gmail)

Para usar Gmail, necesitas una "App Password":

1. **Ve a:** https://myaccount.google.com/security
2. **Activa la verificación en 2 pasos** (si no la tienes)
3. **Ve a:** "App passwords" 
4. **Crea una nueva:** "clubdn" o "nodejs"
5. **Copia el password de 16 caracteres**
6. **Pégalo en** `server/.env` como `EMAIL_PASSWORD`

---

## 🚀 Ejecutar el Proyecto

### Desde la raíz del proyecto:

```bash
npm run dev
```

Esto ejecutará:
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:5173

---

## 📝 Próximos Pasos (Con Claude Code)

Una vez que tengas todo instalado, usa Claude Code en VSCode para:

### 1. Crear el Backend

```
Prompt para Claude Code:

"Crea la estructura completa del backend en server/src siguiendo el esquema de AUTH_FLOW.md:

1. server/src/index.ts - Servidor Express básico con CORS
2. server/src/config/database.ts - Cliente Prisma
3. server/src/config/email.ts - Configuración de Nodemailer
4. server/src/middleware/auth.ts - Autenticación JWT
5. server/src/middleware/admin.ts - Verificación de admin
6. server/src/services/emailService.ts - Servicio de emails (todos los templates)
7. server/src/controllers/authController.ts - Login, registro, verificación
8. server/src/controllers/adminController.ts - Aprobar, rechazar
9. server/src/routes/authRoutes.ts - Rutas de autenticación
10. server/src/routes/adminRoutes.ts - Rutas de admin

Usa el esquema Prisma que ya tengo y sigue las validaciones del AUTH_FLOW.md"
```

### 2. Crear el Frontend

```
Prompt para Claude Code:

"Crea la estructura completa del frontend en client/src:

1. client/src/lib/api.ts - Instancia de Axios configurada
2. client/src/lib/validations.ts - Esquemas Zod para formularios
3. client/src/hooks/useAuth.ts - Hook de autenticación
4. client/src/components/auth/LoginForm.tsx - Formulario de login
5. client/src/components/auth/RegisterForm.tsx - Formulario de registro
6. client/src/components/auth/AuthLayout.tsx - Layout para auth
7. client/src/pages/auth/Login.tsx - Página de login
8. client/src/pages/auth/Register.tsx - Página de registro
9. client/src/pages/auth/VerifyEmail.tsx - Página de verificación
10. client/src/pages/Dashboard.tsx - Dashboard principal
11. client/src/App.tsx - Router y rutas protegidas

Usa shadcn/ui para los componentes y React Hook Form con Zod"
```

### 3. Crear Panel de Admin

```
Prompt para Claude Code:

"Crea el panel de administración en client/src/pages/admin:

1. PendingApprovals.tsx - Lista de usuarios pendientes
2. Componentes para aprobar/rechazar con modales
3. Campos para mensajes personalizados

Usa shadcn/ui (Table, Dialog, Button) y TanStack Query"
```

---

## 🎨 Configurar Tailwind (Opcional pero Recomendado)

**Editar `client/tailwind.config.js`:**
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
    },
  },
  plugins: [],
}
```

**Editar `client/src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --radius: 0.5rem;
  }
}
```

---

## 🐛 Troubleshooting Común

### "Cannot find module"
```bash
cd server && npm install
cd ../client && npm install
```

### "Prisma Client did not initialize"
```bash
cd server
npx prisma generate
```

### "Port 5000 already in use"
```bash
# Cambiar PORT en server/.env
PORT=5001
```

### "Gmail authentication failed"
- Asegúrate de usar una App Password, no tu password normal
- Verifica que la verificación en 2 pasos esté activa

---

## ✅ Verificación Final

Cuando todo esté listo, deberías poder:

1. ✅ **Ejecutar** `npm run dev` desde la raíz
2. ✅ **Ver** el frontend en http://localhost:5173
3. ✅ **Hacer** request al backend en http://localhost:5000
4. ✅ **Ver** las tablas en Prisma Studio: `cd server && npx prisma studio`

---

## 📚 Documentos de Referencia

- `SETUP_GUIDE.md` - Guía completa de setup
- `AUTH_FLOW.md` - Flujo detallado de autenticación
- `CHECKLIST.md` - Este archivo

---

## 🎯 Siguiente Fase

Una vez que el sistema de autenticación esté funcionando:

1. **Perfiles de usuario** - Datos adicionales
2. **Eventos del club** - Calendario de juegos
3. **Gestión de juegos** - Biblioteca del club
4. **Chat/Comunicación** - Entre miembros
5. **Exportación a móvil** - Expo/React Native

---

¡Estás listo para empezar! 🚀

Usa Claude Code en VSCode para generar todo el código paso a paso.
