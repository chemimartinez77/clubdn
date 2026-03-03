# 📋 Changelog - Club Dreadnought

Registro de cambios y nuevas funcionalidades implementadas en la aplicación.

---

## 2026-03-03

### ✨ Nuevas funcionalidades

#### Suscripción a calendario ICS personal
- Cada usuario puede generar una URL única y privada desde su perfil que devuelve un archivo `.ics` con todas sus partidas confirmadas/aprobadas
- La URL es compatible con Google Calendar, Apple Calendar y Outlook como suscripción: el calendario se actualiza automáticamente cada hora sin ninguna acción manual
- El usuario puede regenerar la URL en cualquier momento para invalidar la anterior (revocación de acceso)
- El endpoint es público (sin JWT) pero protegido mediante el token UUID único por usuario

**Archivos modificados/creados:**
- `server/prisma/schema.prisma` - campo `calendarToken String? @unique` en modelo `User`
- `server/prisma/migrations/20260303000001_add_calendar_token/` - `ALTER TABLE` + índice único
- `server/src/controllers/calendarController.ts` - nuevo: endpoints `GET /api/calendar/:token` y `POST /api/calendar/token`
- `server/src/routes/calendarRoutes.ts` - nuevo: rutas del calendario
- `server/src/index.ts` - registro de `calendarRoutes` en `app.use('/api/calendar', ...)`
- `server/src/controllers/profileController.ts` - incluye `calendarToken` en la respuesta de `getMyProfile`
- `client/src/types/profile.ts` - campo `calendarToken: string | null` en interfaz `UserProfile`
- `client/src/pages/Profile.tsx` - sección "Sincronización de Calendario" con botón generar, copiar URL y regenerar; visible en modo lectura y edición

#### Exportar evento al calendario (ICS por evento)
- Botón "Añadir al calendario" en el detalle de cada evento que descarga un `.ics` con ese evento concreto
- Compatible con cualquier app de calendario estándar; no requiere suscripción

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - función `handleAddToCalendar` y botón junto al de WhatsApp

### 🔧 Correcciones

#### Textarea de edición de comentarios demasiado pequeño (Feedback)
- El textarea al editar un comentario pasaba de 2 filas a 4 y cambiaba de `resize-none` a `resize-y`, permitiendo al usuario redimensionarlo manualmente

**Archivos modificados:**
- `client/src/pages/Feedback.tsx` - `rows={4}` y clase `resize-y`

---

## 2026-02-28

### ✨ Mejoras

#### Logros: persistencia de revelados, contadores y descripción de Catalogador
- Al quitar la pegatina de un logro, ese estado queda guardado en `localStorage` (por usuario) y persiste entre recargas
- El contador del header muestra ahora `X / N desbloqueados` (solo los que ya tienen la pegatina quitada) y `Y por descubrir` en ámbar cuando hay logros desbloqueados aún sin revelar
- Los logros bloqueados cuyo contador supere el requisito se tratan como desbloqueados en el cliente, permitiendo levantar la pegatina aunque el servidor aún no lo haya registrado
- Se añade descripción de la categoría Catalogador visible al expandirla: *"Se obtiene jugando partidas en las que hayas seleccionado el género del juego al crearlas."*

**Archivos modificados:**
- `client/src/components/badges/BadgeDisplay.tsx` - nuevas props `isRevealed` y `onReveal`; fallback de desbloqueo por contador
- `client/src/components/badges/BadgeGrid.tsx` - gestión de revelados en localStorage, contadores actualizados, descripción de categoría
- `client/src/pages/Profile.tsx` - propagación de `userId` a BadgeGrid
- `client/src/types/badge.ts` - nueva función `getCategoryDescription`

#### Tooltip de horario favorito mejorado
- El tooltip del icono ⓘ ahora especifica que las franjas corresponden a la hora de inicio de las partidas

**Archivos modificados:**
- `client/src/components/dashboard/StatsCard.tsx` - texto del tooltip actualizado

#### Candados y mejora de interacción en logros/badges
- Los logros muestran ahora un candado en la esquina superior derecha: cerrado (gris) si están bloqueados, abierto (verde) si están desbloqueados
- La pegatina solo puede quitarse cuando el logro está desbloqueado; los logros bloqueados muestran directamente su barra de progreso
- Se añade indicador "↗ toca aquí" con animación de pulso en la esquina de la pegatina para orientar al usuario

**Archivos modificados:**
- `client/src/components/badges/BadgeDisplay.tsx` - candados, lógica de pegatina restringida a desbloqueados, hint de interacción

#### Franjas horarias redefinidas e icono de info en "Horario favorito"
- Las franjas del horario favorito pasan a ser: Mañana (8-14h), Tarde (14-20h), Noche (20-24h), Madrugada (0-8h)
- Se añade un icono ⓘ junto al label "Horario favorito" con tooltip explicativo de las franjas, visible al pasar el ratón o al tocar en móvil

**Archivos modificados:**
- `server/src/controllers/statsController.ts` - nuevas franjas en el cálculo del horario favorito
- `client/src/components/dashboard/StatsCard.tsx` - franjas actualizadas en modal y filtros; tooltip en tarjeta de horario favorito



#### Membresía obligatoria al aprobar usuarios
- El modal de aprobación incluye ahora un selector de tipo de membresía (obligatorio), con `EN_PRUEBAS` marcado por defecto
- Al aprobar un usuario se crea automáticamente su membresía en la misma transacción, eliminando el paso manual posterior
- El backend valida que el tipo de membresía sea válido antes de proceder

**Archivos modificados:**
- `client/src/components/admin/ApproveUserModal.tsx` - nuevo selector de tipo de membresía
- `client/src/hooks/useAdminUsers.ts` - propagación de `membershipType` en la mutation
- `client/src/pages/admin/PendingApprovals.tsx` - propagación de `membershipType` al confirmar
- `server/src/controllers/adminController.ts` - validación y creación de membresía en transacción

#### Tours guiados: adaptación a móvil, corrección de "No volver a mostrar" y rediseño del botón
- En móvil, los pasos de navegación del tour de inicio se sustituyen por un único paso apuntando al botón del menú hamburguesa, ya que en móvil los enlaces de la barra de navegación no existen en el DOM
- Corregido bug en los 4 tours (`AppTour`, `CalendarTour`, `FeedbackTour`, `CreatePartidaTour`): el callback `onDestroyStarted` de driver.js sobreescribía la preferencia permanente cuando el usuario pulsaba "No volver a mostrar" o completaba el tour; ahora se usa un flag `handledRef` para evitarlo
- El botón "No volver a mostrar" se inyecta dentro del popover de driver.js mediante `onPopoverRender` (antes flotaba fuera y era bloqueado por el overlay), garantizando que sea siempre interactivo
- Layout del botón corregido: ocupa su propia línea debajo de los botones de navegación del tour mediante `order: 10; width: 100%; border-top`

**Archivos modificados:**
- `client/src/components/layout/Header.tsx` - añadido `id="mobile-menu-button"` al botón hamburguesa
- `client/src/components/tour/AppTour.tsx` - pasos adaptativos móvil/desktop + fix `handledRef` + botón en popover
- `client/src/components/tour/CalendarTour.tsx` - fix `handledRef` + botón en popover
- `client/src/components/tour/FeedbackTour.tsx` - fix `handledRef` + botón en popover
- `client/src/components/tour/CreatePartidaTour.tsx` - fix `handledRef` + botón en popover
- `client/src/index.css` - estilos para `.tour-dismiss-btn` y `flex-wrap` en el footer del popover

#### Partidas jugadas: corrección de contador siempre a 0
- Las partidas y eventos pasados nunca alcanzaban el estado `COMPLETED` automáticamente (no hay cron job), por lo que el contador de partidas jugadas y los badges asociados nunca se calculaban
- **Solución:** Al cargar las estadísticas del usuario se ejecuta `completePassedEvents()`, que busca todos los eventos con fecha pasada en estado `SCHEDULED`/`ONGOING`, los marca como `COMPLETED`, crea los registros `GamePlayHistory` para cada participante confirmado y desbloquea los badges correspondientes
- Añadido endpoint de admin `POST /api/events/:id/complete` para completar eventos manualmente desde el panel de gestión sin necesidad de cambiar el estado por el selector genérico

**Archivos modificados:**
- `server/src/controllers/statsController.ts` - función `completePassedEvents()` ejecutada antes de calcular stats
- `server/src/controllers/eventController.ts` - nueva función exportada `completeEvent`
- `server/src/routes/eventRoutes.ts` - nueva ruta `POST /:id/complete` (solo admins)
- `client/src/pages/admin/EventManagement.tsx` - usa `completeMutation` al seleccionar estado COMPLETED

#### Calendario de eventos: visibilidad de todos los tipos y desglose en vista mensual
- El filtro de tipo por defecto era `PARTIDA`, ocultando eventos de tipo `TORNEO` y `OTROS` (como "Salón del Cómic")
- Ahora el filtro por defecto muestra todos los tipos (`''`), de modo que el calendario arranca con todos los eventos visibles
- Las celdas del calendario mensual muestran ahora un desglose por tipo: ej. "3 partidas, 1 evento" en lugar del genérico "4 partidas"

**Archivos modificados:**
- `client/src/pages/Events.tsx` - `typeFilter` por defecto cambiado de `'PARTIDA'` a `''`
- `client/src/components/events/EventCalendar.tsx` - contador desglosado por tipo en las celdas del mes

---

## 2026-02-25

### 🐛 Corrección de errores

#### Etiqueta de rol mostraba "Administrador" para Super Administradores
- **Problema:** En el menú desplegable del header, tanto `ADMIN` como `SUPER_ADMIN` mostraban el texto "Administrador"
- **Solución:** Distinción de los tres roles: `SUPER_ADMIN` → "Super Administrador", `ADMIN` → "Administrador", `USER` → "Usuario"

**Archivos modificados:**
- `client/src/components/layout/Header.tsx` - etiqueta de rol en el dropdown del perfil

### ✨ Mejoras

#### Editar documentos (título y visibilidad)
- Los administradores pueden ahora editar el título y la visibilidad de cualquier documento ya subido sin necesidad de eliminarlo y volver a subirlo
- Nuevo botón de editar (icono lápiz) junto al botón de eliminar en cada fila de documento
- Modal de edición con campos pre-poblados para título y visibilidad con descripción contextual de cada nivel
- Nuevo endpoint `PATCH /api/documents/:id` en el backend (solo admins)

**Archivos modificados:**
- `server/src/controllers/documentController.ts` - nueva función `updateDocument`
- `server/src/routes/documentRoutes.ts` - nueva ruta `PATCH /:id`
- `client/src/pages/Documentos.tsx` - botón de editar, modal de edición y mutation `updateMutation`

---

## 2026-02-22

### 🐛 Corrección de errores

#### Exportar CSV de miembros daba "Token no proporcionado"
- **Problema:** El botón "Exportar CSV" usaba `window.open()` para abrir la URL directamente en el navegador, lo que no incluye el token de autenticación en los headers
- **Solución:** Reemplazado por una llamada `api.get()` con `responseType: 'blob'` que sí envía el token, seguida de descarga mediante object URL

**Archivos modificados:**
- `client/src/hooks/useMembers.ts` - `exportCSV` ahora usa fetch autenticado en lugar de `window.open()`

### ✨ Mejoras

#### Editar evento/partida
- Nuevo botón "Editar" (visible para el organizador y admins) en el detalle del evento
- Modal con todos los campos del formulario de creación pre-poblados: juego, categoría, título, descripción, fecha, hora, duración, capacidad, ubicación, dirección y aprobación requerida
- El backend acepta ahora todos esos campos en el endpoint `PUT /api/events/:id`

#### Apuntar miembro del club a una partida
- Nuevo botón "Apuntar miembro" (solo organizador/admin) en el detalle del evento; deshabilitado si el evento está lleno
- Modal con buscador en tiempo real de miembros activos (socios, colaboradores, en pruebas) que tengan habilitada la preferencia de invitaciones
- El miembro queda apuntado directamente con estado CONFIRMED y recibe una notificación
- Nueva preferencia en el perfil: "Permitir invitaciones a partidas" (activada por defecto), que controla si otros organizadores pueden apuntarte
- Botón "Añadir invitado" renombrado a "Invitar externo" para distinguir los dos flujos

#### Contador de comentarios en Feedback
- El botón de comentarios en cada reporte muestra el número de comentarios existentes (ej. `💬 Comentarios (3)`) sin necesidad de expandir el hilo

### ✨ Mejoras

#### Reactivar miembro dado de baja
- Nuevo botón "Reactivar" en la lista de miembros, visible solo cuando el miembro está en estado BAJA
- Nuevo endpoint `POST /api/admin/members/:memberId/reactivate` que restaura `fechaBaja = null` e `isActive = true`

#### Subida de documentos: barra de progreso y mensaje de error detallado
- El modal de subida muestra una barra de progreso con porcentaje mientras se transfiere el archivo al servidor
- El botón indica `Subiendo... N%` durante la operación
- El mensaje de error ahora muestra el motivo real devuelto por Cloudinary en lugar del genérico "Error al subir documento"
- **Limitación conocida:** El plan gratuito de Cloudinary limita los archivos de tipo `raw` (PDF, Word, Excel…) a **10MB por archivo**. Para archivos de imagen el límite es mayor. Dado que algunos PDFs del club pueden superar ese límite (30–40MB), se contempla migrar el almacenamiento de documentos a **[Uploadthing](https://uploadthing.com/)**, que ofrece un plan gratuito de 2GB total sin límite por archivo, está diseñado para apps Node.js/React y es sencillo de integrar. Alternativas evaluadas: AWS S3 y Backblaze B2 (más baratas a escala pero más complejas de configurar). Pendiente de decisión.

#### Admin/Config: página en blanco al cargar
- El campo `membershipTypes` (tipo `Json` en Prisma) podía no ser un array en ciertos casos, causando `h.map is not a function` y dejando la página en blanco
- Backend y frontend normalizan el campo a `[]` si no es un array antes de usarlo

#### Calendario de eventos en formato europeo (Lunes–Domingo)
- El calendario mensual arrancaba la semana en Domingo (formato USA); ahora arranca en Lunes
- Cabeceras reordenadas: `Lun Mar Mié Jue Vie Sáb Dom`

#### Avatares en comentarios de Feedback
- Los comentarios muestran ahora la foto de perfil del usuario si la tiene; si no, la inicial con color de fondo según rol
- Backend incluye `profile.avatar` en la respuesta de comentarios

#### Corrección de assignedToId en notificaciones de Feedback
- Al comentar por primera vez en un reporte, el `assignedToId` recién asignado se pasaba ya al servicio de notificaciones en lugar del valor anterior (`null`)

### 🐛 Corrección de errores

#### Editar partida: eliminar el juego no limpiaba la imagen
- **Problema:** Al editar una partida y quitar el juego seleccionado, la imagen seguía mostrándose después de guardar. Los campos `gameName`, `gameImage` y `bggId` se enviaban como `undefined` (que se omite en JSON) en lugar de `null`, por lo que el backend los ignoraba y conservaba los valores anteriores
- **Solución:** Usar `?? null` en lugar de `?.prop` para enviar `null` explícito cuando no hay juego seleccionado; actualizado `UpdateEventData` para aceptar `string | null` en esos campos (corregía también error de compilación TypeScript)

#### Registro rechazado: mensaje de error genérico al intentar registrarse de nuevo
- **Problema:** Si un usuario con solicitud rechazada intentaba registrarse con el mismo correo, recibía el mensaje genérico "Este email ya está registrado" sin más explicación
- **Solución:** El servidor detecta el estado `REJECTED` y devuelve un mensaje claro indicando que la solicitud fue rechazada y que debe contactar con un administrador

### ✨ Mejoras

#### Sección de comentarios en Feedback rediseñada como hilo de conversación
- Eliminado el campo separado "Respuesta del desarrollador"; toda la comunicación ocurre en el hilo de comentarios
- Nuevo diseño tipo chat: mensajes propios a la derecha, mensajes de otros a la izquierda
- Los comentarios de administradores se distinguen visualmente con borde de color primario y badge "Admin"
- Avatar con inicial del nombre del usuario
- `Enter` para enviar, `Shift+Enter` para salto de línea
- Los comentarios son visibles para cualquier usuario autenticado (antes solo creador + admins)
- Los permisos para comentar se mantienen: solo el creador del reporte y los admins pueden escribir

### 🛠️ Infraestructura

#### Configuración inicial de Playwright para tests E2E
- Instalado `@playwright/test` en el cliente
- Añadida guía de configuración de entorno local y staging en `client/tests/e2e/SETUP_E2E_TESTING_2026-02-21_20-14.md`

---

## 2026-02-21

### 🐛 Corrección de errores

#### Error 500 al cancelar invitación a evento
- **Problema:** Al cancelar una invitación, la transacción fallaba con error de FK porque se intentaba referenciar en el audit log un `EventGuest` que había sido eliminado en la misma transacción
- **Solución:** Establecer `targetGuestId: null` en el registro de auditoría al cancelar invitaciones

---

### ⚡ Mejoras de Rendimiento

#### Migración de almacenamiento de documentos a Cloudinary
- **Problema anterior:** Los documentos se almacenaban en PostgreSQL usando BYTEA, aumentando el tamaño de la base de datos
- **Solución:** Migración completa a Cloudinary para almacenamiento en la nube
- **Ventajas:**
  - Base de datos más ligera (solo metadatos y URLs)
  - Backups de BD más rápidos (no incluyen archivos binarios)
  - Mejor rendimiento en queries (sin excluir campo `content`)
  - Descarga directa desde CDN global de Cloudinary
  - Consistencia con sistema de EventPhoto (mismo patrón)

**Cambios en el modelo de datos:**
- ❌ Eliminado: `content: Bytes` (almacenamiento binario en PostgreSQL)
- ✅ Añadido: `cloudinaryId: String` (identificador único en Cloudinary)
- ✅ Añadido: `url: String` (URL segura del documento en Cloudinary)

**Cambios en el backend:**
- Configuración de Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- `uploadDocument`: Sube archivos a carpeta `clubdn/documents` con `resource_type: 'auto'`
- `deleteDocument`: Elimina de Cloudinary (usando `resource_type` según mimeType) antes de borrar de BD
- ❌ Eliminada función `downloadDocument` (ya no necesaria)
- `getDocuments`: Incluye campos `url` y `cloudinaryId` en response

**Cambios en el frontend:**
- Interface `Document`: Añadido campo `url`
- `handleDownload`: Simplificado para descargar directamente desde Cloudinary (sin petición al backend)

**Archivos modificados:**
- `server/prisma/schema.prisma` - Modelo Document actualizado
- `server/src/controllers/documentController.ts` - Integración completa con Cloudinary
- `server/src/routes/documentRoutes.ts` - Eliminada ruta `GET /api/documents/:id/download`
- `client/src/pages/Documentos.tsx` - Descarga directa desde Cloudinary

**Notas técnicas:**
- Límite de 20MB por archivo (sin cambios)
- Tipos permitidos: PDF, Word, Excel, JPG, PNG, GIF (sin cambios)
- Sistema de visibilidad (`PUBLIC`, `ADMIN`, `SUPER_ADMIN`) intacto
- Los documentos se almacenan en Cloudinary con detección automática de tipo (`resource_type: 'auto'`)
- Al eliminar: imágenes usan `resource_type: 'image'`, otros archivos usan `'raw'`

---

## 2026-02-20

### 🐛 Correcciones

#### Bug: Invitados cancelados permanecían en lista de asistentes
- **Problema:** Al eliminar un invitado de un evento, el `EventGuest` no se borraba de la BD
- **Solución:** Usar transacción que elimina tanto `Invitation` como `EventGuest` asociado
- **Impacto:** El conteo de asistentes y la lista son ahora consistentes

**Archivos modificados:**
- `server/src/controllers/invitationController.ts` - Función `cancelInvitation` ahora usa `$transaction`

#### Bug: Badge "En lista de espera" aparecía incorrectamente
- **Problema:** Usuarios con registro CANCELLED veían badge "En lista de espera"
- **Causa:** Backend marcaba `isUserRegistered: true` para cualquier registro (incluso CANCELLED), frontend no validaba estado explícitamente
- **Solución:**
  - Backend: `isUserRegistered` solo es `true` si status ≠ CANCELLED
  - Frontend: Validar explícitamente WAITLIST y ocultar badge si CANCELLED

**Archivos modificados:**
- `server/src/controllers/eventController.ts` - `isUserRegistered` excluye registros cancelados (líneas 168, 319)
- `client/src/pages/EventDetail.tsx` - Validación explícita de estados de registro

### 🔧 Modificado

#### Mejoras en Pantalla de Feedback
- **Filtro por defecto:** Los reportes con estado "HECHO" no aparecen por defecto
  - Nueva opción "Todos (menos 'Hecho')" como valor inicial del filtro
  - Posibilidad de ver reportes "HECHO" seleccionando la opción específica
- **Navegación directa a reportes desde notificaciones:**
  - Al hacer click en notificación, navega a `/feedback?report={id}` y hace scroll automático a la card del reporte
  - Utiliza el `reportId` del campo `metadata` de la notificación
- **Mensajes de notificación mejorados:**
  - Estados en español legible: "Estado cambiado a 'En revisión'"
  - Solo notifica cambios de estado y respuesta del desarrollador (no prioridad interna)
  - Mensaje específico para respuesta: "Nueva respuesta del desarrollador"

**Archivos modificados:**
- `client/src/pages/Feedback.tsx` - Filtro `ALL_EXCEPT_HECHO`, navegación por queryParam con scroll
- `client/src/components/notifications/NotificationBell.tsx` - Navegación con `reportId`
- `server/src/controllers/reportController.ts` - Mensajes mejorados, solo notifica status/devResponse

#### Mensaje Informativo en Eventos Pasados
- **Nuevo mensaje:** "Partida ya empezada o finalizada" cuando no se puede registrar por fecha pasada
- **Validación existente:** El backend ya valida fechas pasadas con mensaje de error apropiado
- **UX mejorada:** Usuario recibe feedback visual claro sobre por qué no puede apuntarse

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - Mensaje informativo cuando `isPast && !isUserRegistered`

#### Cooldown de Re-registro Aumentado
- **Cambio:** Cooldown entre desregistro y re-registro aumentado de 3 segundos a 30 segundos
- **Motivo:** Prevenir trolleo y spam de registros/desregistros
- **Impacto:** Reduce notificaciones spam al organizador en eventos con aprobación requerida

**Archivos modificados:**
- `server/src/controllers/eventController.ts` - `REGISTRATION_COOLDOWN_MS` de 3000ms a 30000ms

### 📋 Base de Datos

#### Nueva Membership Creada
- **Usuario:** `cmlnolhj4000oo175283glccj` (Chemi - chemimartinez@gmail.com)
- **Tipo:** SOCIO
- **Cuota:** 19.00€
- **Estado:** Activo
- **Fecha inicio:** 2026-02-19

---

## 2026-02-15

### 🎉 Añadido

#### Sistema de Aprobación de Registros en Eventos
- **Checkbox "Requiere aprobación del organizador"** en creación de eventos (activado por defecto)
- **Estado `PENDING_APPROVAL`** para registros pendientes de aprobación
- **Sección "Solicitudes Pendientes"** en detalle de evento (visible solo para organizador/admin)
- **Notificaciones automáticas** al organizador y usuario
- **Validación de capacidad** al aprobar registros

#### Sistema de Threading para Reportes/Feedback
- **Modelo `ReportComment`** para comentarios en reportes
- **Auto-asignación de admin** al comentar
- **Notificaciones bidireccionales** entre usuario y admin

#### Navegación Inteligente en Notificaciones
- **Notificaciones clickables** que redirigen a la página correspondiente
- **6 nuevos iconos** de notificación

---

## 📚 Historial Completo de Desarrollo (Enero 2026 y anteriores)

Para el historial completo del desarrollo del proyecto desde su inicio hasta enero 2026, consulta [DEVELOPMENT_HISTORY.md](DEVELOPMENT_HISTORY.md).

Incluye:
- Infraestructura y configuración inicial
- Sistema de autenticación y usuarios
- Sistema de membresías
- Sistema de eventos y partidas
- Integración con BoardGameGeek
- Sistema de temas
- Sistema de notificaciones
- Y mucho más...

---

## 📝 Notas

- Todas las nuevas funcionalidades incluyen validación de permisos
- Las notificaciones incluyen metadata JSON para navegación
- Los emails utilizan templates HTML responsive
- El sistema de threading soporta escalado horizontal (ordenamiento por timestamp)
- Este proyecto usa despliegue continuo: cada cambio documentado aquí está en producción

---

**Última actualización:** 28 de Febrero de 2026
