# 📋 Changelog - Club Dreadnought

Registro de cambios y nuevas funcionalidades implementadas en la aplicación.

---

## [Unreleased] - 2026-02-15

### 🎉 Añadido

#### Sistema de Aprobación de Registros en Eventos
- **Checkbox "Requiere aprobación del organizador"** en creación de eventos (activado por defecto)
- **Estado `PENDING_APPROVAL`** para registros pendientes de aprobación
- **Sección "Solicitudes Pendientes"** en detalle de evento (visible solo para organizador/admin)
  - Lista ordenada por FIFO (primero en llegar, primero en la lista)
  - Muestra avatar, nombre y fecha de solicitud
  - Botones de Aprobar/Rechazar para cada solicitud
- **Indicador visual** para usuarios con registro pendiente: "Pendiente de aprobación"
- **Notificaciones automáticas:**
  - Al organizador cuando hay nueva solicitud (campanita + email)
  - Al usuario cuando es aprobado (campanita + email)
  - Al usuario cuando es rechazado (campanita)
- **Validación de capacidad** al aprobar registros
- **Sistema de badges** se activa solo al aprobar (no en solicitud)

**Archivos modificados:**
- `server/prisma/schema.prisma` - Enum `RegistrationStatus`, campo `requiresApproval`
- `server/src/controllers/eventController.ts` - Funciones `getPendingRegistrations`, `approveRegistration`, `rejectRegistration`
- `server/src/routes/eventRoutes.ts` - 3 nuevas rutas
- `client/src/pages/CreatePartida.tsx` - Checkbox de aprobación
- `client/src/pages/EventDetail.tsx` - UI de solicitudes pendientes
- `client/src/types/event.ts` - Tipo `PENDING_APPROVAL`

#### Navegación Inteligente en Notificaciones
- **Notificaciones clickables** que redirigen automáticamente:
  - Eventos (`EVENT_CREATED`, `EVENT_CANCELLED`, etc.) → `/events/{eventId}`
  - Registros (`REGISTRATION_APPROVED`, etc.) → `/events/{eventId}`
  - Reportes (`REPORT_CREATED`, etc.) → `/feedback`
  - Usuarios pendientes (`ADMIN_NEW_USER`) → `/admin/pending-approvals`
- **6 nuevos iconos de notificación:**
  - ⏳ Registro pendiente
  - ✅ Registro aprobado
  - ❌ Registro rechazado
  - 📝 Nuevo reporte
  - 🔄 Reporte actualizado
  - 💬 Nuevo comentario

**Archivos modificados:**
- `client/src/components/notifications/NotificationBell.tsx` - Switch-case de navegación

#### Sistema de Threading para Reportes/Feedback
- **Modelo `ReportComment`** para comentarios en reportes
- **Sección de comentarios expandible/colapsable** en cada reporte
- **Diseño diferenciado:**
  - Comentarios de admins: fondo azul con borde izquierdo
  - Comentarios de usuarios: fondo blanco con borde gris
  - Badge "Admin" visible en comentarios de administradores
- **Auto-asignación de admin:** El primer admin que comenta se asigna automáticamente
- **Indicador de asignación:** "📌 Un administrador está trabajando en este reporte"
- **Permisos estrictos:** Solo creador o admins pueden comentar
- **Notificaciones bidireccionales:**
  - Usuario comenta → Notifica a admin asignado (o todos si no hay asignación)
  - Admin comenta → Notifica al creador del reporte
  - Cambios en estado/prioridad/respuesta → Notifica al creador
  - Nuevo reporte → Notifica a todos los admins (campanita + email)

**Archivos modificados:**
- `server/prisma/schema.prisma` - Modelo `ReportComment`, campo `assignedToId` en `Report`
- `server/src/controllers/reportController.ts` - Funciones `getReportComments`, `createReportComment`
- `server/src/routes/reportRoutes.ts` - 2 nuevas rutas
- `client/src/pages/Feedback.tsx` - UI de comentarios con threading

#### Notificaciones y Emails
- **3 nuevos tipos de notificación:** `REGISTRATION_PENDING`, `REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`
- **3 nuevos tipos de notificación:** `REPORT_CREATED`, `REPORT_UPDATED`, `REPORT_COMMENT`
- **Email de solicitud pendiente** al organizador (diseño morado con gradiente)
- **Email de registro aprobado** al usuario (diseño verde)
- **Email de nuevo reporte** a todos los admins
- **Detección automática de cambios** en reportes para notificaciones contextuales

**Archivos modificados:**
- `server/src/services/notificationService.ts` - 6 nuevas funciones
- `server/src/services/emailService.ts` - 3 nuevas funciones

### 🔧 Modificado
- **Lógica de registro en eventos:** Ahora considera el campo `requiresApproval`
- **Creación de eventos:** Acepta parámetro `requiresApproval` (default: true)
- **Actualización de reportes:** Detecta cambios y notifica automáticamente

### 🗄️ Base de Datos
- **Nuevo enum value:** `PENDING_APPROVAL` en `RegistrationStatus`
- **Nuevo campo:** `requiresApproval: Boolean` en tabla `Event` (default: true)
- **Nuevo campo:** `assignedToId: String?` en tabla `Report`
- **Nueva tabla:** `ReportComment` con relaciones a `Report` y `User`
- **Índices añadidos:** `reportId`, `userId`, `createdAt` en `ReportComment`

---

## 🔜 Próximas Funcionalidades Planificadas

_(Espacio reservado para futuras implementaciones)_

---

## 📖 Convenciones de Versiones

Este proyecto sigue [Semantic Versioning](https://semver.org/):
- **MAJOR:** Cambios incompatibles con versiones anteriores
- **MINOR:** Nuevas funcionalidades compatibles
- **PATCH:** Correcciones de bugs compatibles

---

## 📝 Notas

- Todas las nuevas funcionalidades incluyen validación de permisos
- Las notificaciones incluyen metadata JSON para navegación
- Los emails utilizan templates HTML responsive
- El sistema de threading soporta escalado horizontal (ordenamiento por timestamp)

---

**Última actualización:** 15 de Febrero de 2026
**Versión actual:** Unreleased (Pre-v1.0.0)
