# 🚀 Plan de Implementación - Club DN

## 📊 Estado Actual del Proyecto

### Completado (60%)

#### Backend
- ✅ Servidor Express con TypeScript
- ✅ Base de datos PostgreSQL con Prisma (Neon DB)
- ✅ Autenticación JWT completa
- ✅ Sistema de emails con Resend
- ✅ Middleware de autenticación y autorización
- ✅ Controladores de autenticación (register, login, verifyEmail)
- ✅ Controladores de administración (approve, reject, getPendingUsers)
- ✅ Rutas de API: `/api/auth/*` y `/api/admin/*`
- ✅ Validación de requests con express-validator
- ✅ Logging de emails en base de datos

#### Frontend
- ✅ React 19 + TypeScript + Vite
- ✅ React Router configurado
- ✅ Tailwind CSS configurado
- ✅ AuthContext para gestión de estado de autenticación
- ✅ Cliente HTTP (Axios) con interceptores
- ✅ Páginas: Login, Register, VerifyEmail, Home
- ✅ Rutas protegidas (ProtectedRoute)
- ✅ Formularios de autenticación funcionales
- ✅ Manejo de errores en formularios

#### Base de Datos
- ✅ Modelo User con estados: PENDING_VERIFICATION, PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED
- ✅ Modelo EmailLog para auditoría de emails
- ✅ Relaciones entre usuarios para tracking de aprobaciones/rechazos

### Pendiente (40%)

#### Backend
- ❌ Endpoint `GET /api/auth/me` para obtener usuario actual
- ❌ Endpoints adicionales de perfil de usuario
- ❌ Rate limiting
- ❌ Helmet para seguridad
- ❌ Logging estructurado

#### Frontend
- ❌ Panel de administración completo
- ❌ Componentes UI reutilizables
- ❌ Layout con Header/Footer
- ❌ Validaciones con Zod
- ❌ TanStack Query para gestión de estado del servidor
- ❌ Hooks personalizados (useAuth, useAdminUsers)
- ❌ AdminRoute para proteger rutas de admin
- ❌ Sistema de notificaciones/toasts

---

## 🎯 Objetivos del MVP

Completar el sistema de gestión de usuarios con panel de administración funcional.

### Funcionalidades Clave

1. **Sistema de Autenticación Completo**
   - Registro de usuarios
   - Verificación de email
   - Login con JWT
   - Gestión de sesión

2. **Panel de Administración**
   - Listar usuarios pendientes de aprobación
   - Aprobar usuarios con mensaje personalizado opcional
   - Rechazar usuarios con motivo y mensaje opcional
   - Ver estadísticas básicas

3. **Interfaz de Usuario**
   - Diseño responsive
   - Componentes reutilizables
   - Feedback visual (loading, success, error)
   - Navegación intuitiva

---

## 📋 Plan de Implementación Detallado

### Fase 1: Backend - Endpoint de Usuario Actual

**Tiempo estimado: 10 minutos**

#### Paso 1.1: Agregar función getCurrentUser

**Archivo:** `server/src/controllers/authController.ts`

```typescript
/**
 * Obtener usuario actual
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};
```

#### Paso 1.2: Agregar ruta

**Archivo:** `server/src/routes/authRoutes.ts`

```typescript
import { authenticate } from '../middleware/auth';

router.get('/me', authenticate, getCurrentUser);
```

---

### Fase 2: Frontend - Componentes UI Reutilizables

**Tiempo estimado: 30 minutos**

#### Paso 2.1: Crear Button Component

**Archivo:** `client/src/components/ui/Button.tsx`

- Variantes: primary, secondary, danger, ghost, outline
- Tamaños: sm, md, lg
- Estados: loading, disabled
- Usar Tailwind con class-variance-authority

#### Paso 2.2: Crear Card Component

**Archivo:** `client/src/components/ui/Card.tsx`

- CardHeader
- CardContent
- CardFooter
- Estilos consistentes con shadow y border-radius

#### Paso 2.3: Crear Modal Component

**Archivo:** `client/src/components/ui/Modal.tsx`

- Overlay con backdrop oscuro
- Animaciones de entrada/salida
- Close button (X)
- Props: isOpen, onClose, title, children

#### Paso 2.4: Crear Input Component

**Archivo:** `client/src/components/ui/Input.tsx`

- Label integrado
- Error state con mensaje
- Helper text
- Icono opcional
- Diferentes tipos: text, email, password

---

### Fase 3: Frontend - Layout

**Tiempo estimado: 20 minutos**

#### Paso 3.1: Crear Header Component

**Archivo:** `client/src/components/layout/Header.tsx`

- Logo del Club DN
- Navegación principal
- Dropdown de usuario:
  - Nombre del usuario
  - Enlace a perfil
  - Enlace a panel admin (solo si role === ADMIN)
  - Botón de logout
- Responsive con menú hamburguesa en móvil

#### Paso 3.2: Crear Layout Component

**Archivo:** `client/src/components/layout/Layout.tsx`

```typescript
interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-100 py-4 text-center text-gray-600">
        © 2025 Club DN - Todos los derechos reservados
      </footer>
    </div>
  );
}
```

#### Paso 3.3: Envolver páginas con Layout

Actualizar Home.tsx y futuras páginas para usar Layout.

---

### Fase 4: Frontend - Validaciones con Zod

**Tiempo estimado: 15 minutos**

#### Paso 4.1: Crear esquemas de validación

**Archivo:** `client/src/lib/validations.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
});

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
});

export const approveUserSchema = z.object({
  customMessage: z.string().optional()
});

export const rejectUserSchema = z.object({
  reason: z.string().optional(),
  customMessage: z.string().optional()
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ApproveUserFormData = z.infer<typeof approveUserSchema>;
export type RejectUserFormData = z.infer<typeof rejectUserSchema>;
```

#### Paso 4.2: Instalar dependencias necesarias

```bash
cd client
npm install zod react-hook-form @hookform/resolvers
```

#### Paso 4.3: Actualizar Login.tsx y Register.tsx

Usar React Hook Form con zodResolver.

---

### Fase 5: Frontend - Setup TanStack Query

**Tiempo estimado: 10 minutos**

#### Paso 5.1: Instalar TanStack Query

```bash
cd client
npm install @tanstack/react-query @tanstack/react-query-devtools
```

#### Paso 5.2: Configurar QueryClient

**Archivo:** `client/src/main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
```

---

### Fase 6: Frontend - Hook useAuth

**Tiempo estimado: 15 minutos**

**Archivo:** `client/src/hooks/useAuth.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query para obtener usuario actual
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await api.get('/api/auth/me');
      return response.data.data.user as User;
    },
    enabled: !!localStorage.getItem('token')
  });

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.data.token);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/');
    }
  });

  // Mutation para logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('token');
      queryClient.clear();
    },
    onSuccess: () => {
      navigate('/login');
    }
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending
  };
};
```

---

### Fase 7: Frontend - AdminRoute Component

**Tiempo estimado: 10 minutos**

**Archivo:** `client/src/components/routes/AdminRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

---

### Fase 8: Frontend - Panel de Administración

**Tiempo estimado: 30 minutos**

#### Paso 8.1: Crear página PendingApprovals

**Archivo:** `client/src/pages/admin/PendingApprovals.tsx`

- Título: "Solicitudes Pendientes de Aprobación"
- Componente UserTable
- Estados: loading, empty, error, success
- Refresh automático cada 30 segundos
- Botón de refresh manual

#### Paso 8.2: Crear componente UserTable

**Archivo:** `client/src/components/admin/UserTable.tsx`

- Tabla responsive
- Columnas: Nombre, Email, Fecha de Registro, Acciones
- Botones: Aprobar (verde), Rechazar (rojo)
- Hover effects
- Loading state por fila durante aprobación/rechazo

#### Paso 8.3: Actualizar App.tsx con ruta admin

```typescript
<Route
  path="/admin/pending-approvals"
  element={
    <AdminRoute>
      <PendingApprovals />
    </AdminRoute>
  }
/>
```

---

### Fase 9: Frontend - Modales de Aprobar/Rechazar

**Tiempo estimado: 20 minutos**

#### Paso 9.1: Crear ApproveUserModal

**Archivo:** `client/src/components/admin/ApproveUserModal.tsx`

- Props: isOpen, onClose, user, onConfirm
- Mostrar nombre y email del usuario
- Campo opcional: mensaje personalizado (textarea)
- Botones: Cancelar, Aprobar
- Loading state durante la aprobación

#### Paso 9.2: Crear RejectUserModal

**Archivo:** `client/src/components/admin/RejectUserModal.tsx`

- Props: isOpen, onClose, user, onConfirm
- Mostrar nombre y email del usuario
- Campo opcional: motivo del rechazo (select con opciones)
- Campo opcional: mensaje personalizado (textarea)
- Botones: Cancelar, Rechazar
- Loading state durante el rechazo

---

### Fase 10: Frontend - Hook useAdminUsers

**Tiempo estimado: 15 minutos**

**Archivo:** `client/src/hooks/useAdminUsers.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: string;
}

export const useAdminUsers = () => {
  const queryClient = useQueryClient();

  // Query para obtener usuarios pendientes
  const { data: pendingUsers = [], isLoading, error } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const response = await api.get('/api/admin/pending-approvals');
      return response.data.data as PendingUser[];
    },
    refetchInterval: 30000 // Refetch cada 30 segundos
  });

  // Mutation para aprobar usuario
  const approveMutation = useMutation({
    mutationFn: async ({ userId, customMessage }: { userId: string; customMessage?: string }) => {
      const response = await api.post(`/api/admin/approve/${userId}`, { customMessage });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    }
  });

  // Mutation para rechazar usuario
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason, customMessage }: { userId: string; reason?: string; customMessage?: string }) => {
      const response = await api.post(`/api/admin/reject/${userId}`, { reason, customMessage });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    }
  });

  return {
    pendingUsers,
    isLoading,
    error,
    approveUser: approveMutation.mutate,
    rejectUser: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending
  };
};
```

---

### Fase 11: Integración Final y Testing

**Tiempo estimado: 20 minutos**

#### Paso 11.1: Actualizar AuthContext

Integrar con hook useAuth y eliminar código duplicado.

#### Paso 11.2: Actualizar Header

Agregar link al panel de admin (solo visible para admins).

#### Paso 11.3: Testing Manual

1. **Flujo de registro completo:**
   - Registrar nuevo usuario
   - Verificar email
   - Ver usuario en panel de admin
   - Aprobar usuario
   - Login con usuario aprobado

2. **Panel de administración:**
   - Ver lista de usuarios pendientes
   - Aprobar usuario con mensaje personalizado
   - Rechazar usuario con motivo
   - Verificar emails enviados

3. **Protección de rutas:**
   - Intentar acceder a /admin sin ser admin
   - Verificar redirección correcta

4. **UI/UX:**
   - Verificar loading states
   - Verificar mensajes de error
   - Verificar responsive design
   - Verificar navegación

---

## 📁 Archivos a Crear

### Backend (2 archivos)
- ✅ Ya existe: `server/src/controllers/authController.ts` (modificar)
- ✅ Ya existe: `server/src/routes/authRoutes.ts` (modificar)

### Frontend (15 archivos nuevos)

**Componentes UI:**
1. `client/src/components/ui/Button.tsx`
2. `client/src/components/ui/Card.tsx`
3. `client/src/components/ui/Modal.tsx`
4. `client/src/components/ui/Input.tsx`

**Layout:**
5. `client/src/components/layout/Header.tsx`
6. `client/src/components/layout/Layout.tsx`

**Admin:**
7. `client/src/pages/admin/PendingApprovals.tsx`
8. `client/src/components/admin/UserTable.tsx`
9. `client/src/components/admin/ApproveUserModal.tsx`
10. `client/src/components/admin/RejectUserModal.tsx`

**Routes:**
11. `client/src/components/routes/AdminRoute.tsx`

**Hooks:**
12. `client/src/hooks/useAuth.ts`
13. `client/src/hooks/useAdminUsers.ts`

**Validaciones:**
14. `client/src/lib/validations.ts`

**Config:**
15. `client/src/main.tsx` (modificar)

---

## ⚙️ Dependencias a Instalar

```bash
cd client
npm install zod react-hook-form @hookform/resolvers
npm install @tanstack/react-query @tanstack/react-query-devtools
```

---

## ✅ Checklist de Implementación

### Backend
- [ ] Agregar función getCurrentUser en authController.ts
- [ ] Agregar ruta GET /api/auth/me en authRoutes.ts
- [ ] Probar endpoint con Postman/Thunder Client

### Frontend - Componentes UI
- [ ] Crear Button.tsx
- [ ] Crear Card.tsx
- [ ] Crear Modal.tsx
- [ ] Crear Input.tsx

### Frontend - Layout
- [ ] Crear Header.tsx
- [ ] Crear Layout.tsx
- [ ] Envolver páginas con Layout

### Frontend - Validaciones
- [ ] Crear lib/validations.ts
- [ ] Instalar dependencias (zod, react-hook-form)
- [ ] Actualizar Login.tsx con validaciones
- [ ] Actualizar Register.tsx con validaciones

### Frontend - TanStack Query
- [ ] Instalar @tanstack/react-query
- [ ] Configurar QueryClient en main.tsx
- [ ] Agregar ReactQueryDevtools

### Frontend - Hooks
- [ ] Crear useAuth.ts
- [ ] Crear useAdminUsers.ts
- [ ] Integrar con AuthContext

### Frontend - Admin
- [ ] Crear AdminRoute.tsx
- [ ] Crear PendingApprovals.tsx
- [ ] Crear UserTable.tsx
- [ ] Crear ApproveUserModal.tsx
- [ ] Crear RejectUserModal.tsx
- [ ] Agregar ruta admin en App.tsx

### Testing
- [ ] Flujo de registro completo
- [ ] Panel de administración
- [ ] Protección de rutas
- [ ] UI/UX responsive

---

## 🎯 Resultado Esperado

Al finalizar esta implementación, tendremos:

1. **Sistema de autenticación completo** con todas las validaciones
2. **Panel de administración funcional** para gestionar usuarios
3. **Interfaz de usuario consistente** con componentes reutilizables
4. **Gestión de estado eficiente** con TanStack Query
5. **Código limpio y mantenible** con TypeScript y Zod
6. **Experiencia de usuario mejorada** con loading states y feedback visual

**Tiempo total estimado: ~3 horas**

---

## 📝 Notas Importantes

- Mantener consistencia en estilos usando Tailwind
- Todos los componentes deben ser TypeScript strict
- Manejar loading y error states en todas las operaciones async
- Validar permisos tanto en frontend como backend
- Logging de todas las operaciones importantes
- Feedback visual claro para el usuario (success, error, loading)

---

## 🚀 Próximo Sprint

Después de completar este plan, revisar [POST_MVP.md](./POST_MVP.md) para las siguientes funcionalidades a implementar.
