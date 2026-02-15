# 🎯 Post-MVP: Mejoras Futuras - Club DN

## 📋 Roadmap de Funcionalidades

Este documento describe las funcionalidades y mejoras planificadas después de completar el MVP (Minimum Viable Product) del sistema de gestión de usuarios.

---

## 🎨 Fase 1: Mejoras de UX/UI

### 1.1 Sistema de Notificaciones/Toasts

**Descripción:**
Implementar notificaciones toast para feedback visual consistente en toda la aplicación.

**Componentes:**
- `components/ui/Toast.tsx` - Componente de toast
- `components/ui/ToastProvider.tsx` - Context provider
- `hooks/useToast.ts` - Hook para mostrar toasts

**Características:**
- Posiciones: top-right, top-center, bottom-right, bottom-center
- Tipos: success, error, warning, info
- Auto-dismiss configurable
- Stack de múltiples toasts
- Animaciones suaves

**Uso:**
```typescript
const { toast } = useToast();

toast.success('Usuario aprobado exitosamente');
toast.error('Error al aprobar usuario');
```

### 1.2 Dark Mode

**Descripción:**
Implementar tema oscuro con toggle en el header.

**Implementación:**
- Usar Tailwind dark mode class-based
- Context para gestionar preferencia
- Persistir en localStorage
- Toggle button en Header
- Variables CSS para colores personalizados

**Archivos:**
- `contexts/ThemeContext.tsx`
- `hooks/useTheme.ts`
- Actualizar `tailwind.config.js`
- Actualizar `index.css` con variables dark

### 1.3 Skeleton Loaders

**Descripción:**
Reemplazar spinners genéricos con skeleton loaders para mejor UX.

**Componentes:**
- `components/ui/Skeleton.tsx`
- Variantes: text, card, table, avatar
- Animación shimmer

**Aplicar en:**
- Tabla de usuarios pendientes
- Perfil de usuario
- Dashboard
- Lista de eventos

### 1.4 Animaciones y Transiciones

**Descripción:**
Agregar micro-animaciones para mejorar la experiencia.

**Implementar:**
- Framer Motion para animaciones
- Page transitions
- Hover effects
- Loading animations
- Success/Error animations

---

## 👤 Fase 2: Perfiles de Usuario

### 2.1 Perfil de Usuario Extendido

**Modelo de Base de Datos:**

```prisma
model UserProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Información personal
  avatar          String?  // URL de avatar
  phone           String?
  birthDate       DateTime?
  bio             String?  @db.Text

  // Preferencias
  favoriteGames   String[] // Array de nombres de juegos favoritos
  playStyle       String?  // Competitivo, Casual, etc.
  availability    Json?    // Días y horarios disponibles

  // Social
  discord         String?
  telegram        String?

  // Configuración
  notifications   Boolean  @default(true)
  emailUpdates    Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Endpoints:**
- `GET /api/users/profile/:userId` - Ver perfil
- `PUT /api/users/profile` - Actualizar perfil propio
- `POST /api/users/avatar` - Subir avatar

**Páginas:**
- `/profile` - Ver y editar perfil propio
- `/profile/:userId` - Ver perfil de otro usuario

### 2.2 Upload de Avatar

**Implementación:**
- Usar Cloudinary o AWS S3 para almacenamiento
- Validar tamaño máximo (2MB)
- Validar formato (jpg, png, webp)
- Crop/resize automático
- Preview antes de subir

**Componente:**
- `components/profile/AvatarUpload.tsx`

---

## 📊 Fase 3: Dashboard y Estadísticas

### 3.1 Dashboard de Usuario

**Secciones:**
- Próximos eventos
- Juegos jugados recientemente
- Estadísticas personales
- Actividad reciente
- Amigos del club

**Widgets:**
- `components/dashboard/UpcomingEvents.tsx`
- `components/dashboard/RecentGames.tsx`
- `components/dashboard/Stats.tsx`
- `components/dashboard/Activity.tsx`

### 3.2 Dashboard de Admin

**Métricas:**
- Total de usuarios (activos, pendientes, rechazados)
- Nuevos registros (últimos 7 días, 30 días)
- Usuarios más activos
- Eventos próximos
- Gráficos de actividad

**Componentes:**
- `pages/admin/Dashboard.tsx`
- `components/admin/UserStats.tsx`
- `components/admin/ActivityChart.tsx`
- Usar recharts o chart.js para gráficos

---

## 🎲 Fase 4: Gestión de Juegos

### 4.1 Biblioteca de Juegos del Club

**Modelo de Base de Datos:**

```prisma
model Game {
  id              String   @id @default(cuid())
  title           String
  description     String   @db.Text
  image           String?

  // Detalles del juego
  minPlayers      Int
  maxPlayers      Int
  duration        Int      // Minutos
  complexity      Int      // 1-5
  category        String[] // Array de categorías

  // Gestión
  owner           String?  // Usuario que lo aportó
  available       Boolean  @default(true)
  borrowedBy      String?  // Usuario que lo tiene prestado
  borrowedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  sessions        GameSession[]
  reviews         GameReview[]
}

model GameReview {
  id          String   @id @default(cuid())
  gameId      String
  game        Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  rating      Int      // 1-5 estrellas
  comment     String?  @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([gameId, userId])
}
```

**Endpoints:**
- `GET /api/games` - Listar juegos
- `GET /api/games/:id` - Ver detalles de juego
- `POST /api/games` - Agregar juego (admin)
- `PUT /api/games/:id` - Actualizar juego (admin)
- `DELETE /api/games/:id` - Eliminar juego (admin)
- `POST /api/games/:id/borrow` - Solicitar préstamo
- `POST /api/games/:id/return` - Devolver juego
- `POST /api/games/:id/review` - Dejar reseña

**Páginas:**
- `/games` - Catálogo de juegos con filtros
- `/games/:id` - Detalle del juego
- `/admin/games` - Gestión de juegos (admin)

**Características:**
- Búsqueda y filtros (jugadores, duración, complejidad)
- Sistema de préstamos
- Reseñas y ratings
- Historial de partidas

### 4.2 Colección Personal

**Modelo:**

```prisma
model PersonalGame {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  gameTitle   String

  willing     Boolean  @default(false) // Dispuesto a llevar al club

  createdAt   DateTime @default(now())

  @@unique([userId, gameTitle])
}
```

**Funcionalidad:**
- Usuarios pueden listar sus juegos personales
- Indicar si están dispuestos a llevarlos
- Coordinación para eventos

---

## 📅 Fase 5: Sistema de Eventos

### 5.1 Gestión de Eventos

**Modelo de Base de Datos:**

```prisma
model Event {
  id              String   @id @default(cuid())
  title           String
  description     String   @db.Text

  // Fecha y lugar
  date            DateTime
  location        String
  address         String?

  // Capacidad
  maxAttendees    Int
  registrations   EventRegistration[]

  // Estado
  status          EventStatus @default(SCHEDULED)

  // Organizador
  createdBy       String
  organizer       User     @relation("EventOrganizer", fields: [createdBy], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum EventStatus {
  SCHEDULED
  ONGOING
  COMPLETED
  CANCELLED
}

model EventRegistration {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  status      RegistrationStatus @default(CONFIRMED)

  createdAt   DateTime @default(now())

  @@unique([eventId, userId])
}

enum RegistrationStatus {
  CONFIRMED
  CANCELLED
  WAITLIST
}

model GameSession {
  id          String   @id @default(cuid())
  eventId     String?
  event       Event?   @relation(fields: [eventId], references: [id])
  gameId      String
  game        Game     @relation(fields: [gameId], references: [id])

  // Participantes
  players     GameSessionPlayer[]

  // Resultados
  winner      String?  // userId del ganador
  duration    Int?     // Minutos jugados
  notes       String?  @db.Text

  playedAt    DateTime @default(now())
}

model GameSessionPlayer {
  id              String      @id @default(cuid())
  sessionId       String
  session         GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId          String
  user            User        @relation(fields: [userId], references: [id])

  score           Int?
  position        Int?        // 1st, 2nd, 3rd...

  @@unique([sessionId, userId])
}
```

**Endpoints:**
- `GET /api/events` - Listar eventos
- `GET /api/events/:id` - Detalle de evento
- `POST /api/events` - Crear evento (admin)
- `PUT /api/events/:id` - Actualizar evento (admin/organizador)
- `DELETE /api/events/:id` - Cancelar evento (admin)
- `POST /api/events/:id/register` - Inscribirse
- `DELETE /api/events/:id/register` - Cancelar inscripción
- `GET /api/events/:id/attendees` - Ver asistentes
- `POST /api/events/:id/sessions` - Registrar partida jugada

**Páginas:**
- `/events` - Calendario de eventos
- `/events/:id` - Detalle del evento
- `/admin/events` - Gestión de eventos (admin)
- `/events/:id/sessions` - Partidas del evento

**Características:**
- Calendario mensual
- Inscripción/desinscripción
- Lista de espera cuando se llena
- Recordatorios por email
- Registro de partidas jugadas
- Estadísticas del evento

---

## 💬 Fase 6: Sistema de Comunicación

### 6.1 Chat en Tiempo Real

**Tecnología:**
- Socket.io para WebSockets
- Rooms para eventos/grupos
- Mensajes directos entre usuarios

**Modelo:**

```prisma
model Message {
  id          String   @id @default(cuid())

  // Remitente
  senderId    String
  sender      User     @relation("SentMessages", fields: [senderId], references: [id])

  // Destinatario (mensaje directo)
  receiverId  String?
  receiver    User?    @relation("ReceivedMessages", fields: [receiverId], references: [id])

  // O canal (evento/grupo)
  channelId   String?

  content     String   @db.Text
  read        Boolean  @default(false)

  createdAt   DateTime @default(now())

  @@index([senderId])
  @@index([receiverId])
  @@index([channelId])
}
```

**Componentes:**
- `components/chat/ChatWindow.tsx`
- `components/chat/MessageList.tsx`
- `components/chat/MessageInput.tsx`
- `components/chat/UserList.tsx`

### 6.2 Notificaciones

**Tipos de notificaciones:**
- Nuevo mensaje
- Nuevo evento creado
- Recordatorio de evento
- Usuario aprobado
- Nuevo registro en evento
- Juego disponible para préstamo

**Modelo:**

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        NotificationType
  title       String
  message     String
  link        String?  // URL para navegar al hacer clic

  read        Boolean  @default(false)

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([read])
}

enum NotificationType {
  MESSAGE
  EVENT
  APPROVAL
  REMINDER
  GAME
  SYSTEM
}
```

**Componentes:**
- `components/notifications/NotificationBell.tsx` (en Header)
- `components/notifications/NotificationList.tsx`
- `components/notifications/NotificationItem.tsx`

---

## 🔒 Fase 7: Seguridad y Performance

### 7.1 Rate Limiting

**Implementación:**
- Usar `express-rate-limit`
- Diferentes límites por endpoint
- Por IP y por usuario

**Configuración:**
```typescript
// Login: 5 intentos / 15 min
// Register: 3 intentos / hora
// API general: 100 requests / 15 min
```

### 7.2 Seguridad Adicional

**Agregar:**
- Helmet.js para headers de seguridad
- CSRF protection
- XSS protection
- SQL injection protection (ya cubierto por Prisma)
- Input sanitization
- Content Security Policy

### 7.3 Logging y Monitoreo

**Implementar:**
- Winston para logging estructurado
- Log levels: error, warn, info, debug
- Rotación de logs
- Errores a archivo separado
- Request logging

**Monitoreo:**
- Tiempo de respuesta de endpoints
- Errores del servidor
- Uso de base de datos

### 7.4 Optimización

**Frontend:**
- Code splitting
- Lazy loading de rutas
- Memoización de componentes
- Virtual scrolling para listas largas
- Image optimization

**Backend:**
- Caché con Redis
- Paginación en todas las listas
- Índices en base de datos
- Query optimization

---

## 📱 Fase 8: Progressive Web App (PWA)

### 8.1 Convertir a PWA

**Características:**
- Service Worker para offline
- Manifest.json
- Install prompt
- Push notifications
- Caché de assets
- Offline fallback

**Implementación:**
- Vite PWA plugin
- Workbox para service worker
- App icons para diferentes plataformas

### 8.2 Notificaciones Push

**Tecnología:**
- Firebase Cloud Messaging o OneSignal
- Notificaciones de navegador
- Integración con backend

---

## 🧪 Fase 9: Testing

### 9.1 Tests Unitarios

**Frontend:**
- Vitest para componentes
- React Testing Library
- Tests de hooks
- Tests de utilidades

**Backend:**
- Jest para controladores
- Tests de servicios
- Tests de middleware

### 9.2 Tests de Integración

- Tests de flujos completos
- Tests de API endpoints
- Tests de base de datos

### 9.3 Tests E2E

- Playwright o Cypress
- Tests de flujos de usuario
- Tests de formularios
- Tests de autenticación

---

## 🚀 Fase 10: Deployment y CI/CD

### 10.1 Containerización

**Docker:**
```dockerfile
# Frontend: Nginx
# Backend: Node.js
# Base de datos: PostgreSQL (o usar Neon en producción)
```

**Docker Compose:**
- Desarrollo local completo
- Variables de entorno
- Volúmenes para persistencia

### 10.2 CI/CD Pipeline

**GitHub Actions:**
- Lint en PRs
- Tests automáticos
- Build automático
- Deploy a staging
- Deploy a producción (manual approval)

### 10.3 Hosting

**Opciones:**
- Frontend: Vercel, Netlify, Cloudflare Pages
- Backend: Railway, Render, Fly.io, AWS
- Base de datos: Neon (PostgreSQL), Supabase

---

## 📈 Fase 11: Analytics y Métricas

### 11.1 Analytics de Usuario

**Implementar:**
- Google Analytics o Plausible
- Eventos personalizados
- Tracking de conversiones
- Funnels de usuario

**Métricas:**
- Usuarios activos diarios/mensuales
- Tasa de aprobación de usuarios
- Asistencia a eventos
- Juegos más populares

### 11.2 Métricas de Performance

**Monitorear:**
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

---

## 🎨 Fase 12: Mejoras de Diseño

### 12.1 Rediseño de Branding

- Logo del club
- Paleta de colores personalizada
- Tipografías custom
- Guía de estilo

### 12.2 Landing Page

- Página de presentación del club
- Información para nuevos miembros
- Galería de fotos
- FAQ

---

## 🌐 Fase 13: Internacionalización

### 13.1 i18n

**Implementar:**
- react-i18next
- Soporte multi-idioma
- Traducciones: ES, EN
- Selector de idioma en header

**Archivos de traducción:**
```
locales/
  es/
    common.json
    auth.json
    admin.json
  en/
    common.json
    auth.json
    admin.json
```

---

## 📋 Prioridades Post-MVP

### Alta Prioridad
1. ✅ Sistema de notificaciones/toasts
2. ✅ Dashboard de usuario
3. ✅ Dashboard de admin con estadísticas
4. ✅ Perfiles de usuario extendidos
5. ✅ Sistema de eventos

### Media Prioridad
6. Gestión de juegos
7. Dark mode
8. Chat en tiempo real
9. Notificaciones push
10. Rate limiting y seguridad

### Baja Prioridad
11. PWA
12. Testing completo
13. Internacionalización
14. Analytics avanzado

---

## 💡 Ideas Adicionales

- Sistema de puntos/gamificación
- Torneos y competiciones
- Integración con BoardGameGeek API
- Streaming de partidas
- Sistema de coaching/enseñanza
- Marketplace de compra/venta de juegos
- Integración con Google Calendar
- Export de estadísticas (PDF, CSV)

---

## 📊 Estimación de Tiempos

| Fase | Funcionalidad | Tiempo Estimado |
|------|---------------|-----------------|
| 1 | UX/UI Improvements | 2 semanas |
| 2 | Perfiles de Usuario | 1 semana |
| 3 | Dashboard | 1 semana |
| 4 | Gestión de Juegos | 2 semanas |
| 5 | Sistema de Eventos | 3 semanas |
| 6 | Chat y Notificaciones | 2 semanas |
| 7 | Seguridad y Performance | 1 semana |
| 8 | PWA | 1 semana |
| 9 | Testing | 2 semanas |
| 10 | Deployment | 1 semana |

**Total estimado: ~4 meses de desarrollo**

---

## 🎯 Conclusión

Este roadmap post-MVP transformará la aplicación básica de gestión de usuarios en una plataforma completa para la gestión de un club de juegos de mesa, con funcionalidades sociales, gestión de eventos, biblioteca de juegos, y mucho más.

El orden de implementación debe priorizar funcionalidades que aporten más valor a los usuarios actuales del club, comenzando con mejoras de UX/UI y el sistema de eventos.
