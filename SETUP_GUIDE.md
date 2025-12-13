# 🎲 Club de Juegos de Mesa - Guía de Setup Completa

## 📋 Stack Tecnológico

### Frontend
- **React 18** con **TypeScript**
- **Vite** - Build tool moderno y rápido
- **Tailwind CSS** - Estilos utility-first
- **shadcn/ui** - Componentes UI accesibles
- **React Router** - Navegación
- **React Hook Form** + **Zod** - Formularios y validación
- **TanStack Query** - Estado del servidor
- **Axios** - Cliente HTTP

### Backend
- **Node.js** con **Express.js**
- **TypeScript**
- **Neon DB** (PostgreSQL serverless)
- **Prisma** - ORM para TypeScript
- **bcrypt** - Hash de passwords
- **jsonwebtoken** - Autenticación JWT
- **nodemailer** - Envío de emails
- **express-validator** - Validación de requests

---

## 🚀 Paso 1: Inicializar el Proyecto

### 1.1 Clonar el repositorio

```bash
git clone https://github.com/chemimartinez77/clubdn.git
cd clubdn
```

### 1.2 Crear estructura monorepo

```bash
# Crear carpetas principales
mkdir -p client server shared

# Inicializar package.json raíz para scripts
npm init -y
```

### 1.3 Configurar el Frontend (Client)

```bash
cd client

# Crear proyecto Vite con React + TypeScript
npm create vite@latest . -- --template react-ts

# Instalar dependencias principales
npm install

# Instalar dependencias adicionales
npm install react-router-dom axios @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install clsx tailwind-merge class-variance-authority

# Instalar Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Volver a la raíz
cd ..
```

### 1.4 Configurar el Backend (Server)

```bash
cd server

# Inicializar proyecto Node con TypeScript
npm init -y

# Instalar dependencias de producción
npm install express cors dotenv
npm install bcrypt jsonwebtoken
npm install nodemailer
npm install express-validator
npm install @neondatabase/serverless
npm install @prisma/client

# Instalar dependencias de desarrollo
npm install -D typescript @types/node @types/express
npm install -D @types/bcrypt @types/jsonwebtoken
npm install -D @types/cors @types/nodemailer
npm install -D tsx nodemon prisma

# Inicializar TypeScript
npx tsc --init

# Inicializar Prisma
npx prisma init

# Volver a la raíz
cd ..
```

---

## 📁 Estructura del Proyecto

```
clubdn/
├── client/                    # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── AuthLayout.tsx
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       └── Footer.tsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   └── VerifyEmail.tsx
│   │   │   ├── admin/
│   │   │   │   └── PendingApprovals.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useToast.ts
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios instance
│   │   │   ├── validations.ts # Zod schemas
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                    # Backend Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts    # Prisma client
│   │   │   └── email.ts       # Nodemailer config
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   └── adminController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts        # JWT verification
│   │   │   ├── admin.ts       # Admin check
│   │   │   └── validator.ts   # Request validation
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   └── adminRoutes.ts
│   │   ├── services/
│   │   │   ├── emailService.ts
│   │   │   └── tokenService.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   └── index.ts           # Entry point
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── shared/                    # Tipos compartidos (opcional)
│   └── types.ts
│
├── .gitignore
├── package.json               # Scripts raíz
└── README.md
```

---

## 🗄️ Esquema de Base de Datos (Neon DB)

### Archivo: `server/prisma/schema.prisma`

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

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

---

## ⚙️ Configuración de Variables de Entorno

### Archivo: `server/.env`

```env
# Database
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT
JWT_SECRET="tu_secret_key_muy_segura_aqui_cambiala"
JWT_EXPIRATION="7d"

# Server
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"

# Email (usando Gmail como ejemplo)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="tu-email@gmail.com"
EMAIL_PASSWORD="tu-app-password"
EMAIL_FROM="Club de Juegos <noreply@clubdn.com>"

# Admin por defecto
DEFAULT_ADMIN_EMAIL="admin@clubdn.com"

# Tokens
EMAIL_VERIFICATION_EXPIRY_HOURS=24
```

### Archivo: `client/.env`

```env
VITE_API_URL="http://localhost:5000/api"
```

---

## 🔧 Configuración de TypeScript

### `server/tsconfig.json`

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

---

## 📦 Scripts útiles

### `package.json` (raíz)

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

### `server/package.json` (scripts)

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

## 🎨 Configuración de Tailwind CSS

### `client/tailwind.config.js`

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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... más colores de shadcn/ui
      },
    },
  },
  plugins: [],
}
```

### `client/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... más variables dark mode */
  }
}
```

---

## 🚦 Próximos Pasos

1. ✅ **Configurar Neon DB**
   - Crear base de datos en Neon
   - Copiar connection string a `.env`
   - Ejecutar `npm run prisma:migrate`

2. ✅ **Instalar shadcn/ui components**
   ```bash
   cd client
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button input card form
   ```

3. ✅ **Implementar autenticación**
   - Backend: Controllers y routes
   - Frontend: Formularios y hooks

4. ✅ **Sistema de emails**
   - Configurar templates
   - Implementar envío automático

5. ✅ **Panel de administración**
   - Listar solicitudes pendientes
   - Aprobar/Rechazar usuarios

---

## 📚 Recursos

- [Neon DB Docs](https://neon.tech/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [TanStack Query](https://tanstack.com/query)

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"
- Verifica que el `DATABASE_URL` en `.env` sea correcto
- Comprueba que Neon DB esté activo

### Error: "Module not found"
- Ejecuta `npm install` en client y server
- Ejecuta `npm run prisma:generate` en server

### Puerto en uso
- Cambia el `PORT` en `server/.env`
- O mata el proceso: `lsof -ti:5000 | xargs kill`
