# 🤖 Guía de Prompts para Claude Code

Esta guía contiene prompts específicos y optimizados para usar con Claude Code en VSCode durante el desarrollo del proyecto clubdn.

---

## 📁 Fase 1: Backend - Configuración Básica

### Prompt 1.1: Servidor Express Principal

```
Crea el archivo server/src/index.ts con un servidor Express completo que incluya:

1. Configuración de CORS con origen permitido desde CLIENT_URL
2. Middleware express.json() para parsear JSON
3. Middleware para logging de requests
4. Rutas:
   - /api/auth para autenticación (importar desde routes/authRoutes)
   - /api/admin para administración (importar desde routes/adminRoutes)
5. Endpoint de health check en /api/health
6. Manejo de errores global
7. El servidor debe escuchar en process.env.PORT o 5000

Variables de entorno que usará: PORT, CLIENT_URL, NODE_ENV
```

### Prompt 1.2: Configuración de Prisma

```
Crea server/src/config/database.ts que:

1. Importe PrismaClient de '@prisma/client'
2. Cree una instancia singleton de Prisma
3. Maneje la conexión en desarrollo vs producción
4. Incluya manejo de errores de conexión
5. Exporte el cliente Prisma para usar en toda la app

Asegúrate de usar el patrón singleton para evitar múltiples conexiones.
```

### Prompt 1.3: Configuración de Email

```
Crea server/src/config/email.ts que:

1. Configure nodemailer con las variables de entorno:
   - EMAIL_HOST
   - EMAIL_PORT
   - EMAIL_USER
   - EMAIL_PASSWORD
2. Exporte el transporter configurado
3. Incluya función de verificación de conexión
4. Añade tipos TypeScript apropiados
```

---

## 🔐 Fase 2: Autenticación - Middleware y Servicios

### Prompt 2.1: Middleware de Autenticación

```
Crea server/src/middleware/auth.ts con dos middlewares:

1. authenticate:
   - Extrae el token del header Authorization (formato: Bearer <token>)
   - Verifica el token JWT usando JWT_SECRET
   - Decodifica el payload que contiene: userId, email, role
   - Adjunta el usuario decodificado a req.user
   - Maneja errores: token faltante, inválido o expirado

2. requireAdmin:
   - Verifica que req.user.role sea 'ADMIN' o 'SUPER_ADMIN'
   - Retorna 403 si no tiene permisos
   - Asume que authenticate ya se ejecutó antes

Incluye tipos TypeScript personalizados para extender Request con el campo user.
```

### Prompt 2.2: Servicio de Email

```
Crea server/src/services/emailService.ts con estas funciones:

1. sendEmail(options) - función base que:
   - Envía email con nodemailer
   - Registra el envío en tabla EmailLog de Prisma
   - Maneja errores y los registra en EmailLog

2. sendVerificationEmail(email, name, token):
   - Template HTML bonito para verificación
   - Enlace a CLIENT_URL/verify-email?token=<token>
   - Expira en 24 horas

3. sendAdminNotification(adminEmail, userName, userEmail):
   - Notifica al admin de nueva solicitud
   - Enlace a panel de admin

4. sendApprovalEmail(email, name, customMessage?):
   - Email de bienvenida con enlace a login
   - Incluye mensaje personalizado si se proporciona

5. sendRejectionEmail(email, name, reason?, customMessage?):
   - Email de rechazo
   - Incluye motivo y mensaje personalizado si se proporcionan

Usa templates HTML con estilos inline. Haz que los emails se vean profesionales.
```

---

## 🎮 Fase 3: Controladores de Autenticación

### Prompt 3.1: Auth Controller

```
Crea server/src/controllers/authController.ts con estos controllers:

1. register:
   - Valida: email único, password fuerte (min 8 chars, 1 mayúscula, 1 número)
   - Hash password con bcrypt (10 rounds)
   - Genera token de verificación UUID
   - Calcula fecha de expiración (24h desde ahora)
   - Crea usuario con status PENDING_VERIFICATION
   - Envía email de verificación
   - Retorna success sin datos sensibles

2. verifyEmail:
   - Recibe token por query params
   - Busca usuario por verificationToken
   - Verifica que no esté expirado
   - Actualiza: emailVerified=true, status=PENDING_APPROVAL, verificationToken=null
   - Obtiene email del admin por defecto (DEFAULT_ADMIN_EMAIL)
   - Envía notificación al admin
   - Retorna success

3. login:
   - Busca usuario por email
   - Verifica password con bcrypt
   - Valida estados:
     * PENDING_VERIFICATION → error
     * PENDING_APPROVAL → error
     * REJECTED → error
     * SUSPENDED → error
     * APPROVED → continuar
   - Genera JWT con payload: userId, email, role
   - Actualiza lastLoginAt
   - Retorna token + datos del usuario (sin password)

Usa express-validator para validaciones de input. Maneja todos los errores apropiadamente.
```

---

## 👨‍💼 Fase 4: Panel de Administración

### Prompt 4.1: Admin Controller

```
Crea server/src/controllers/adminController.ts con:

1. getPendingApprovals:
   - Lista todos los usuarios con status=PENDING_APPROVAL
   - Ordena por createdAt descendente (más recientes primero)
   - Retorna: id, name, email, createdAt, status
   - No incluir passwords ni tokens

2. approveUser:
   - Recibe userId por params
   - Verifica que el usuario exista y esté PENDING_APPROVAL
   - Actualiza:
     * status = APPROVED
     * approvedBy = req.user.userId (admin que aprueba)
     * approvedAt = now
   - Envía email de aprobación
   - Puede incluir customMessage en body
   - Retorna success

3. rejectUser:
   - Recibe userId por params y reason + customMessage en body
   - Verifica que el usuario exista y esté PENDING_APPROVAL
   - Actualiza:
     * status = REJECTED
     * rejectedBy = req.user.userId
     * rejectedAt = now
     * rejectionReason = reason (opcional)
   - Envía email de rechazo
   - Retorna success

Todos requieren autenticación de admin (middleware requireAdmin).
```

---

## 🛣️ Fase 5: Rutas

### Prompt 5.1: Auth Routes

```
Crea server/src/routes/authRoutes.ts que defina:

POST /register - authController.register
  - Validaciones con express-validator:
    * name: min 2 caracteres, trim
    * email: formato válido, normalizado
    * password: min 8 caracteres

GET /verify-email - authController.verifyEmail
  - Query param: token (required)

POST /login - authController.login
  - Validaciones:
    * email: formato válido
    * password: requerido

Exporta el router.
```

### Prompt 5.2: Admin Routes

```
Crea server/src/routes/adminRoutes.ts que defina:

GET /pending-approvals - adminController.getPendingApprovals
  - Middleware: authenticate + requireAdmin

POST /approve/:userId - adminController.approveUser
  - Middleware: authenticate + requireAdmin
  - Params: userId
  - Body opcional: customMessage

POST /reject/:userId - adminController.rejectUser
  - Middleware: authenticate + requireAdmin
  - Params: userId
  - Body opcional: reason, customMessage

Exporta el router.
```

---

## 💻 Fase 6: Frontend - Configuración

### Prompt 6.1: Cliente API (Axios)

```
Crea client/src/lib/api.ts que:

1. Importe axios
2. Cree instancia con:
   - baseURL: import.meta.env.VITE_API_URL
   - timeout: 10000
3. Interceptor de request:
   - Añade token JWT del localStorage si existe
   - Header: Authorization: Bearer <token>
4. Interceptor de response:
   - Maneja errores 401 (limpiar token, redirect a login)
   - Maneja errores de red
5. Exporte la instancia configurada

Usa TypeScript con tipos apropiados.
```

### Prompt 6.2: Esquemas de Validación (Zod)

```
Crea client/src/lib/validations.ts con esquemas Zod para:

1. loginSchema:
   - email: email válido
   - password: requerido

2. registerSchema:
   - name: min 2 chars, trim
   - email: email válido
   - password: min 8 chars, al menos 1 mayúscula, 1 número
   - confirmPassword: debe coincidir con password

3. Exporta tipos inferidos de cada schema
```

### Prompt 6.3: Hook de Autenticación

```
Crea client/src/hooks/useAuth.ts con:

1. Interfaz User con: id, email, name, role, status
2. Hook useAuth que:
   - Usa useState para user y loading
   - useEffect que verifica token al montar
   - Funciones:
     * login(email, password) - POST /api/auth/login
     * register(data) - POST /api/auth/register
     * logout() - limpia localStorage y state
     * checkAuth() - verifica token válido
   - Guarda token en localStorage
   - Retorna: user, loading, login, register, logout, isAuthenticated

Usa TanStack Query si quieres, o manejo de estado simple con useState.
```

---

## 🎨 Fase 7: Componentes de UI

### Prompt 7.1: Formulario de Login

```
Crea client/src/components/auth/LoginForm.tsx:

1. Usa React Hook Form con zodResolver
2. Campos:
   - Email (componente Input de shadcn/ui)
   - Password (type password)
3. Botón de submit (componente Button de shadcn/ui)
4. Enlace a página de registro
5. Manejo de errores (muestra mensaje con componente Alert)
6. Loading state en botón
7. Al success, navega a /dashboard

Estilos con Tailwind, diseño mobile-first, máximo ancho 400px.
```

### Prompt 7.2: Formulario de Registro

```
Crea client/src/components/auth/RegisterForm.tsx:

1. Usa React Hook Form con zodResolver (registerSchema)
2. Campos:
   - Nombre
   - Email
   - Password
   - Confirmar Password
3. Validaciones en tiempo real
4. Al success:
   - Muestra modal/alert de "Revisa tu email"
   - NO navega automáticamente
5. Enlace a página de login
6. Diseño responsive, bonito, profesional

Usa componentes de shadcn/ui: Form, FormField, Input, Button, Card.
```

---

## 📱 Fase 8: Páginas

### Prompt 8.1: Página de Login

```
Crea client/src/pages/auth/Login.tsx:

1. Layout centrado vertical y horizontalmente
2. Card con:
   - Logo/título del club
   - Componente LoginForm
   - Footer con enlace a registro
3. Fondo con gradiente sutil
4. Responsive (se ve bien en móvil y desktop)

Usa AuthLayout si ya lo creaste, o crea layout inline.
```

### Prompt 8.2: Página de Registro

```
Crea client/src/pages/auth/Register.tsx:

Similar a Login pero con RegisterForm.
Incluye texto explicativo del flujo:
"Después de registrarte, recibirás un email para verificar tu cuenta."
```

### Prompt 8.3: Página de Verificación de Email

```
Crea client/src/pages/auth/VerifyEmail.tsx que:

1. Lee el token de useSearchParams
2. useEffect automático al montar:
   - Llama a GET /api/auth/verify-email?token=<token>
3. Estados:
   - Loading: "Verificando tu email..."
   - Success: "¡Email verificado! Tu solicitud será revisada por un admin"
   - Error: "Token inválido o expirado"
4. Botón para ir a login (si success)

Diseño limpio, centrado, con iconos apropiados.
```

---

## 👨‍💼 Fase 9: Panel de Admin

### Prompt 9.1: Página de Aprobaciones Pendientes

```
Crea client/src/pages/admin/PendingApprovals.tsx:

1. useQuery de TanStack Query para obtener lista
2. Tabla con shadcn/ui Table:
   - Columnas: Nombre, Email, Fecha de registro, Acciones
3. Botones por fila:
   - Aprobar (verde) → abre dialog de confirmación
   - Rechazar (rojo) → abre dialog con textarea para motivo
4. Dialogs:
   - Aprobar: campo opcional para mensaje personalizado
   - Rechazar: campo obligatorio para motivo + opcional para mensaje
5. useMutation para aprobar/rechazar
6. Invalidate query al success para refrescar lista
7. Loading skeleton mientras carga
8. Empty state si no hay pendientes

Proteger ruta: solo admins pueden acceder.
```

---

## 🎯 Fase 10: Router y App Principal

### Prompt 10.1: App.tsx con Router

```
Crea client/src/App.tsx con:

1. React Router v6
2. Rutas:
   - / → redirect a /login o /dashboard según auth
   - /login → Login page (público)
   - /register → Register page (público)
   - /verify-email → VerifyEmail page (público)
   - /dashboard → Dashboard (protegido)
   - /admin/pending-approvals → PendingApprovals (admin only)
3. Componente ProtectedRoute que:
   - Verifica autenticación
   - Redirect a /login si no está autenticado
4. Componente AdminRoute que:
   - Hereda de ProtectedRoute
   - Verifica que user.role sea ADMIN o SUPER_ADMIN
   - Redirect a /dashboard si no es admin
5. QueryClientProvider de TanStack Query

Estructura limpia, fácil de extender.
```

---

## 📝 Prompts Útiles Adicionales

### Crear un componente completo

```
Crea el componente [NOMBRE] en [RUTA] que:
- [Funcionalidad 1]
- [Funcionalidad 2]
- Usa TypeScript con tipos estrictos
- Usa Tailwind para estilos
- Sigue las mejores prácticas de React
```

### Refactorizar código

```
Refactoriza [ARCHIVO] para:
- Mejorar la legibilidad
- Extraer lógica reutilizable
- Añadir manejo de errores
- Optimizar performance
```

### Añadir tests

```
Crea tests para [ARCHIVO] usando Vitest que cubran:
- Casos exitosos
- Casos de error
- Edge cases
- Cobertura mínima del 80%
```

### Debugging

```
Analiza este error y sugiere soluciones:
[PEGAR ERROR AQUÍ]

Contexto:
- [Qué estabas haciendo]
- [Código relevante]
```

---

## 💡 Tips para Usar Claude Code

1. **Sé específico**: Menciona archivos exactos, tecnologías y estructura
2. **Incluye contexto**: Referencia otros archivos o documentos del proyecto
3. **Un paso a la vez**: No intentes crear todo de una vez
4. **Revisa el código**: Claude es muy bueno, pero siempre revisa lo generado
5. **Itera**: Si algo no está perfecto, pide mejoras específicas

---

## 🔄 Workflow Recomendado

1. **Backend primero**: Crea toda la lógica del servidor
2. **Prueba con Postman**: Verifica endpoints antes del frontend
3. **Frontend básico**: Login y registro primero
4. **Integra**: Conecta frontend con backend
5. **Itera**: Mejora UX, añade validaciones, etc.
6. **Admin panel**: Implementa funcionalidades de admin

---

## 🎓 Ejemplo Completo de Sesión

```
[Tu primera interacción con Claude Code]

"Hola! Voy a crear el backend del proyecto clubdn. 
Lee el archivo AUTH_FLOW.md para entender el flujo completo.
Empecemos por crear el servidor Express principal en server/src/index.ts"

[Claude responde con el código]

"Perfecto! Ahora crea la configuración de Prisma en server/src/config/database.ts"

[Y así sucesivamente...]
```

---

¡Listo para empezar! 🚀

Recuerda: Claude Code puede ver todos los archivos de tu proyecto, así que puede referenciar el esquema de Prisma, los tipos, etc. automáticamente.
