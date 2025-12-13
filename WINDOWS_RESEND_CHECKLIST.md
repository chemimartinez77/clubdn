# ✅ Checklist de Inicio - Windows + Resend

## 🎯 Pasos Inmediatos (Empieza aquí)

### 1️⃣ Preparar el Repositorio Local

```powershell
# Clonar el repo
git clone https://github.com/chemimartinez77/clubdn.git
cd clubdn

# Crear estructura de carpetas (PowerShell)
New-Item -ItemType Directory -Path client, server, shared

# O uno por uno:
mkdir client
mkdir server
mkdir shared
```

---

### 2️⃣ Configurar Neon DB

1. **Ve a:** https://neon.tech
2. **Inicia sesión** con tu cuenta
3. **Crea un nuevo proyecto:** "clubdn"
4. **Copia el connection string** - Aparece como:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
5. **Guárdalo** - lo necesitarás para el `.env`

---

### 3️⃣ Configurar Resend (Servicio de Email)

1. **Ve a:** https://resend.com
2. **Inicia sesión** con tu cuenta
3. **Ve a:** API Keys
4. **Crea una nueva API Key:** "clubdn-dev"
5. **Copia la key** - Empieza con `re_xxxxx`
6. **Guárdala** - la necesitarás para el `.env`

**Nota:** Con la cuenta gratuita de Resend puedes:
- Enviar hasta 100 emails/día
- Solo puedes enviar a emails verificados o usar `onboarding@resend.dev` como remitente
- Para producción, necesitarás verificar tu dominio

---

### 4️⃣ Setup del Backend

```powershell
cd server

# Inicializar proyecto
npm init -y

# Instalar dependencias de producción
npm install express cors dotenv bcrypt jsonwebtoken express-validator @neondatabase/serverless @prisma/client resend

# Instalar dependencias de desarrollo
npm install -D typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cors tsx nodemon prisma

# Inicializar TypeScript
npx tsc --init

# Inicializar Prisma
npx prisma init
```

**Crear archivo `.env` en `server/.env`:**

```env
# Database (pega tu connection string de Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# JWT
JWT_SECRET="cambia_esto_por_algo_super_secreto_y_aleatorio_12345"
JWT_EXPIRATION="7d"

# Server
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"

# Resend
RESEND_API_KEY="re_tu_api_key_de_resend_aqui"
EMAIL_FROM="Club DN <onboarding@resend.dev>"

# Admin
DEFAULT_ADMIN_EMAIL="tu-email@gmail.com"
EMAIL_VERIFICATION_EXPIRY_HOURS=24
```

**⚠️ IMPORTANTE:** 
- Cambia `DEFAULT_ADMIN_EMAIL` por TU email real
- Con la versión gratuita de Resend, solo recibirás emails en direcciones verificadas
- Puedes verificar tu email en: https://resend.com/emails

---

### 5️⃣ Configurar Prisma Schema

**Editar `server/prisma/schema.prisma`:**

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Estados posibles de un usuario
enum UserStatus {
  PENDING_VERIFICATION  // Email no verificado
  PENDING_APPROVAL      // Email verificado, esperando aprobación admin
  APPROVED              // Aprobado por admin, puede acceder
  REJECTED              // Rechazado por admin
  SUSPENDED             // Suspendido temporalmente
}

// Roles de usuario
enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

// Modelo de Usuario
model User {
  id                String      @id @default(cuid())
  email             String      @unique
  name              String
  password          String      // Hash bcrypt
  role              UserRole    @default(USER)
  status            UserStatus  @default(PENDING_VERIFICATION)
  
  // Verificación de email
  emailVerified     Boolean     @default(false)
  verificationToken String?     @unique
  tokenExpiry       DateTime?
  
  // Aprobación de admin
  approvedBy        String?     // ID del admin que aprobó
  approvedAt        DateTime?
  rejectedBy        String?     // ID del admin que rechazó
  rejectedAt        DateTime?
  rejectionReason   String?     // Motivo del rechazo (opcional)
  
  // Timestamps
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  lastLoginAt       DateTime?
  
  // Relaciones
  approvedByAdmin   User?       @relation("ApprovedUsers", fields: [approvedBy], references: [id])
  approvedUsers     User[]      @relation("ApprovedUsers")
  rejectedByAdmin   User?       @relation("RejectedUsers", fields: [rejectedBy], references: [id])
  rejectedUsers     User[]      @relation("RejectedUsers")
  
  @@index([email])
  @@index([status])
  @@index([verificationToken])
}

// Modelo para registrar emails enviados (auditoría)
model EmailLog {
  id          String   @id @default(cuid())
  to          String
  subject     String
  template    String   // 'verification', 'approval', 'rejection', etc.
  sentAt      DateTime @default(now())
  success     Boolean
  errorMsg    String?
  
  @@index([to])
  @@index([sentAt])
}
```

**Ejecutar migración:**

```powershell
npx prisma migrate dev --name init
npx prisma generate
```

Si todo va bien, verás:
```
✔ Generated Prisma Client
```

---

### 6️⃣ Configurar TypeScript (Backend)

**Editar `server/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Editar `server/package.json` (añadir scripts):**

```json
{
  "name": "server",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.5",
    "@prisma/client": "^6.1.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-validator": "^7.2.1",
    "jsonwebtoken": "^9.0.2",
    "resend": "^4.0.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.2",
    "nodemon": "^3.1.9",
    "prisma": "^6.1.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

---

### 7️⃣ Setup del Frontend

```powershell
cd ..\client

# Crear proyecto Vite
npm create vite@latest . -- --template react-ts

# Cuando te pregunte si quieres sobrescribir, di "y"

# Instalar dependencias
npm install

# Instalar dependencias adicionales
npm install react-router-dom axios @tanstack/react-query react-hook-form @hookform/resolvers zod clsx tailwind-merge class-variance-authority

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn@latest init

# Cuando te pregunte:
# - Would you like to use TypeScript? › Yes
# - Which style would you like to use? › New York
# - Which color would you like to use as base color? › Slate
# - Where is your global CSS file? › src/index.css
# - Would you like to use CSS variables for colors? › Yes
# - Are you using a custom tailwind prefix? › No
# - Where is your tailwind.config.js located? › tailwind.config.js
# - Configure the import alias for components: › @/components
# - Configure the import alias for utils: › @/lib/utils
# - Are you using React Server Components? › No

# Instalar componentes básicos
npx shadcn@latest add button input card form label alert
```

**Crear archivo `.env` en `client/.env`:**

```env
VITE_API_URL=http://localhost:5000/api
```

---

### 8️⃣ Configurar Scripts en la Raíz

```powershell
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
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:server && npm run build:client",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

---

## 🎨 Configurar Tailwind (Frontend)

**Editar `client/src/index.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 📧 Copiar el Servicio de Email con Resend

He creado un archivo `emailService-resend.ts` que está adaptado para usar Resend.

**Cuando uses Claude Code, indícale:**

```
Usa el archivo emailService-resend.ts como plantilla para crear 
server/src/services/emailService.ts

Este archivo ya está configurado para usar Resend en vez de nodemailer.
```

---

## 🚀 Ejecutar el Proyecto

### Desde la raíz del proyecto:

```powershell
npm run dev
```

Esto ejecutará:
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:5173

---

## 📝 Próximos Pasos con Claude Code

Una vez instalado todo, abre VSCode en la carpeta `clubdn` y usa Claude Code:

### 1. Crear estructura del backend

```
Crea la estructura completa del backend en server/src/:

1. server/src/index.ts - Servidor Express con CORS y rutas
2. server/src/config/database.ts - Cliente Prisma singleton
3. server/src/middleware/auth.ts - JWT verification + requireAdmin
4. server/src/services/emailService.ts - Usa el archivo emailService-resend.ts como base
5. server/src/controllers/authController.ts - register, verifyEmail, login
6. server/src/controllers/adminController.ts - getPendingApprovals, approveUser, rejectUser
7. server/src/routes/authRoutes.ts - Rutas /register, /verify-email, /login
8. server/src/routes/adminRoutes.ts - Rutas /pending-approvals, /approve/:id, /reject/:id

Sigue el flujo descrito en AUTH_FLOW.md
```

### 2. Crear el frontend

```
Crea la estructura del frontend en client/src/:

1. client/src/lib/api.ts - Axios con interceptores
2. client/src/lib/validations.ts - Schemas Zod
3. client/src/hooks/useAuth.ts - Hook de autenticación
4. client/src/components/auth/LoginForm.tsx
5. client/src/components/auth/RegisterForm.tsx
6. client/src/pages/auth/Login.tsx
7. client/src/pages/auth/Register.tsx
8. client/src/pages/auth/VerifyEmail.tsx
9. client/src/App.tsx - Router con rutas protegidas

Usa shadcn/ui y sigue el diseño responsive mobile-first
```

---

## ✅ Verificación

Cuando esté todo listo:

1. ✅ `npm run dev` funciona sin errores
2. ✅ Frontend abre en http://localhost:5173
3. ✅ Backend responde en http://localhost:5000
4. ✅ Prisma Studio: `cd server && npx prisma studio`

---

## 🐛 Troubleshooting Windows/PowerShell

### Error: "npm no se reconoce"
```powershell
# Instala Node.js desde: https://nodejs.org/
# Reinicia PowerShell después de instalar
```

### Error: "execution policy"
```powershell
# Ejecuta PowerShell como Administrador:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Puerto en uso
```powershell
# Ver qué proceso usa el puerto 5000:
netstat -ano | findstr :5000

# Matar el proceso (cambia PID por el número que aparece):
taskkill /PID <numero> /F

# O cambia el puerto en server/.env:
PORT=5001
```

### Error de Prisma
```powershell
cd server
npx prisma generate
npx prisma migrate dev --name init
```

---

## 📚 Documentos de Referencia

- `SETUP_GUIDE.md` - Guía completa original
- `AUTH_FLOW.md` - Flujo de autenticación detallado
- `CLAUDE_CODE_PROMPTS.md` - Prompts específicos
- `emailService-resend.ts` - Servicio de email con Resend
- Este archivo - Checklist Windows + Resend

---

¡Listo! Ahora tienes todo configurado para Windows con Resend 🚀
