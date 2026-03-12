# 📋 Changelog - Club Dreadnought

Registro de cambios y nuevas funcionalidades implementadas en la aplicación.

---

## 2026-03-12

### ✨ Nuevas funcionalidades

#### Enlace de invitación personalizado por WhatsApp
- Al pulsar el botón de WhatsApp en el detalle de una partida, el sistema genera automáticamente un enlace único por socio/colaborador y partida (`/join/TOKEN`)
- El externo que abre el enlace ve una página pública con la info de la partida, el banner "X te invita a esta partida" y un formulario para solicitar plaza (nombre, apellidos, DNI)
- Si la partida requiere aprobación del organizador, la solicitud queda en estado `PENDING_APPROVAL`; si no, se crea directamente como `PENDING`
- Si un socio del club abre el enlace estando logado, accede normalmente como miembro (el token se ignora)
- El token es reutilizable mientras la partida esté activa; no expira mientras el evento no esté cancelado o pasado
- Un mismo socio siempre recibe el mismo token para la misma partida (unique constraint `eventId + memberId`)
- Si la generación del token falla (sin conexión, etc.), el botón de WhatsApp sigue funcionando con la URL normal como fallback

**Archivos modificados/creados:**
- `server/prisma/schema.prisma` - nuevo modelo `EventShareLink` con relaciones a `Event` y `User`
- `server/src/controllers/shareLinkController.ts` - nuevo: `generateShareLink`, `getShareLink`, `requestViaShareLink`
- `server/src/routes/shareLinkRoutes.ts` - nuevo: rutas `/api/share`
- `server/src/index.ts` - registro de `shareLinkRoutes`
- `client/src/pages/JoinViaShareLink.tsx` - nuevo: página pública `/join/:token`
- `client/src/App.tsx` - nueva ruta pública `/join/:token`
- `client/src/pages/EventDetail.tsx` - `handleShareWhatsApp` llama a `/api/share/generate` y usa la URL personalizada

#### Nuevos logros: Organizador y Repetidor
- **Organizador** (6 niveles): se desbloquea por número de partidas organizadas (creadas y no canceladas). Niveles: Anfitrión Improvisado (5), Convocador de Dados (10), Maestro de Ceremonias (20), Gran Coordinador del Tablero (40), Arquitecto de Sesiones (70), El que Siempre Pone la Mesa (100)
- **Repetidor** (6 niveles): se desbloquea por número de juegos distintos jugados 3 o más veces. Mide fidelidad a los títulos favoritos independientemente del género. Niveles: Repite Plato (5), Fiel a sus Dados (10), Coleccionista de Clásicos (20), Devoto del Tablero (40), El que no Necesita Novedades (70), Maestro de sus Obsesiones (100)
- Ambos logros se comprueban y desbloquean automáticamente al completar una partida

**Archivos modificados/creados:**
- `server/prisma/schema.prisma` - `ORGANIZADOR` y `REPETIDOR` añadidos al enum `BadgeCategory`
- `server/prisma/seeds/badgeDefinitions.ts` - 12 nuevos badges (60 total)
- `server/src/controllers/badgeController.ts` - nueva función `getCategoryCount` con lógica específica por categoría; `ORGANIZADOR` cuenta eventos creados, `REPETIDOR` usa `groupBy + having` para contar juegos con 3+ partidas
- `server/src/controllers/eventController.ts` - `completeEvent` comprueba `ORGANIZADOR` para el creador y `REPETIDOR` para cada jugador

### 🐛 Corrección de errores

#### Cache de impersonación no se limpiaba al cambiar de usuario
- Al iniciar o detener la impersonación, solo se eliminaba la query `currentUser` del cache de TanStack Query pero no el resto (eventos, listas, etc.), haciendo que los datos del usuario anterior persistieran
- Ahora se llama a `queryClient.clear()` para limpiar todo el cache al impersonar y al dejar de impersonar

**Archivos modificados:**
- `client/src/contexts/AuthContext.tsx` - `queryClient.removeQueries` → `queryClient.clear()` en `impersonate` y `stopImpersonating`

#### Tracking de logros ocurría al apuntarse en lugar de al jugar
- El registro en `GamePlayHistory` y el desbloqueo de badges se realizaba en el momento de apuntarse a la partida, no cuando ésta ocurría, lo que permitía desbloquear logros de juegos que nunca se jugaron
- Ahora el tracking solo ocurre en `completeEvent`, que ya tenía el guard `alreadyTracked` para evitar duplicados

**Archivos modificados:**
- `server/src/controllers/eventController.ts` - eliminados los bloques de tracking en `createEvent`, `registerToEvent` (re-registro) y `approveRegistration`; el único punto de tracking es `completeEvent`

### 🎨 Mejoras de UI

#### Estilos de invitaciones creadas adaptados al tema oscuro
- Las tarjetas de invitaciones en el modal "Invitaciones creadas" usaban fondos claros (`bg-white`, `bg-primary-50`) y badges con colores claros (`bg-green-100`, `bg-red-100`, `bg-yellow-100`) que no encajaban con el tema oscuro
- Ahora usan `bg-[var(--color-tableRowHover)]` como fondo base y variantes oscuras para los badges (`bg-green-700`, `bg-red-700`, `bg-yellow-700`)

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - clases de fondo y badges de invitaciones creadas

#### Botones de calendario y WhatsApp deshabilitados si la partida está empezada o finalizada
- Los botones "Añadir al calendario" y "WhatsApp" ahora se deshabilitan cuando el estado del evento es `ONGOING` o `COMPLETED`

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - atributo `disabled` en ambos botones

#### Modal de confirmación al abandonar partida
- El botón "No asistiré" ya no ejecuta directamente la cancelación del registro; abre un modal de confirmación informando que se notificará al organizador y al resto de jugadores

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - estado `isUnregisterModalOpen`, modal de confirmación

### 🔔 Notificaciones

#### Notificación al resto de jugadores cuando alguien abandona
- Al cancelar el registro en una partida, además de notificar al organizador (comportamiento previo), ahora también se notifica a todos los jugadores confirmados excepto al que abandona

**Archivos modificados/creados:**
- `server/src/services/notificationService.ts` - nueva función `notifyPlayersOfAbandonment`
- `server/src/controllers/eventController.ts` - `unregisterFromEvent` llama a `notifyPlayersOfAbandonment`

---

## 2026-03-10

### 🛠️ Infraestructura

#### Tests de integración del backend con PostgreSQL local
- Infraestructura completa de tests con Jest + Supertest contra una base de datos PostgreSQL real en Docker (puerto 5433), sin depender de Railway ni de SQLite
- `globalSetup.ts` asegura que las variables de entorno de test se carguen antes de que Prisma inicialice su singleton
- `setup.ts` actualizado con cleanup completo respetando el orden de FK y guard de seguridad para evitar ejecución contra producción
- Tests UAT operativos: tester1 (19/19), tester2 (12/12) y tester4 (13/13); tester3 aplazado por dependencia de Cloudinary

**Archivos modificados/creados:**
- `server/.env.test` - configuración para PostgreSQL Docker
- `server/jest.config.js` - registro de `globalSetup`
- `server/package.json` - scripts de test con `--runInBand`
- `server/src/tests/globalSetup.ts` - nuevo: carga `.env.test` antes de cualquier worker
- `server/src/tests/setup.ts` - cleanup completo ordenado por FK, guard actualizado
- `server/src/tests/helpers/db.helper.ts` - correcciones en filtros de status, campo `paid` virtual, campo `reporter` → `user`
- `server/src/tests/uat/tester2.uat.test.ts` - múltiples correcciones para alinearse con la API real
- `server/src/tests/uat/tester4.uat.test.ts` - correcciones en aprobación y pagos

### 🐛 Corrección de errores

#### Email de aprobación no propaga error al cliente
- Si el envío del email de aprobación falla (ej. rate limit de Resend), la aprobación se completa igualmente en base de datos; el error queda registrado en consola pero no devuelve 500 al cliente

**Archivos modificados:**
- `server/src/controllers/adminController.ts` - `sendApprovalEmail` envuelto en try/catch no crítico

#### Validación de `maxAttendees` mínimo 1 al crear evento
- El backend rechazaba silenciosamente eventos con `maxAttendees: 0`; ahora devuelve 400 con mensaje claro

**Archivos modificados:**
- `server/src/controllers/eventController.ts` - validación `parsedMaxAttendees >= 1`

#### Validación de año en toggle de pagos
- El endpoint `POST /api/membership/payment/toggle` aceptaba cualquier año; ahora valida que esté entre 2020 y el año actual + 1

**Archivos modificados:**
- `server/src/controllers/membershipController.ts` - validación de rango de año en `togglePayment`

### ✨ Mejoras

#### Validación de DNI/NIE español al invitar y en perfil de miembro
- Al crear una invitación a un evento o al guardar el DNI en el perfil de un miembro, se valida que el DNI/NIE sea estructuralmente correcto: formato numérico, longitud y letra de control según la tabla `TRWAGMYFPDXBNJZSQVHLCKE`; los NIE con prefijo X/Y/Z también se validan correctamente

**Archivos modificados/creados:**
- `server/src/utils/dni.ts` - nuevo: `normalizeDni` e `isValidSpanishDni` compartidos
- `server/src/controllers/invitationController.ts` - usa `isValidSpanishDni` en lugar de comprobación de longitud
- `server/src/controllers/memberController.ts` - idem

#### El organizador/admin no necesita aprobación propia al invitar
- Si el organizador o un admin crea una invitación para un evento con `requiresApproval`, la invitación se crea directamente como `PENDING` (lista para usar) sin pasar por la cola de aprobación, ya que no tiene sentido que el organizador apruebe sus propias invitaciones

**Archivos modificados:**
- `server/src/controllers/invitationController.ts` - `needsApproval` excluye organizador y admins

#### Tooltip en badges de estado de invitación
- En la lista de asistentes del detalle de evento y en el modal de "Invitaciones creadas", al pasar el ratón (desktop) o al pulsar (móvil, vía `tabIndex` + foco) sobre el badge de estado aparece una descripción del mismo: qué significa `Pendiente`, `Pend. aprobación`, `Usada`, `Expirada` o `Cancelada`
- El modal de invitaciones creadas también corrige que mostraba el estado en inglés en bruto (`PENDING`, `USED`…) en lugar del texto traducido

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - `invitationStatusTooltips`, badges con `group/focus-within`, etiquetas traducidas en modal

---

## 2026-03-07

### Viernes: reglas base y flujo de partida

- El motor de Viernes corrige el flujo base de peligros: el peligro no elegido va al descarte, el peligro ganado pasa a Robinson como carta de lucha y el ultimo peligro de una fase puede descartarse sin combatir para avanzar de paso.
- Se anade una fase especifica de derrota (`HAZARD_DEFEAT`) para pagar la diferencia y destruir cartas usadas con presupuesto limitado, diferenciando el coste de cartas normales y de envejecimiento.
- Los combates contra piratas ya no pueden resolverse perdiendo: obligan a seguir robando o a terminar la partida si no se puede pagar mas vida.
- La UI del tablero y del hub refleja las nuevas fases de partida, actualiza mejor el estado al abandonar y corrige el refresco de partidas activas y finalizadas.
- Se refuerza la validacion de acciones en backend para evitar movimientos invalidos enviados desde cliente.
- Se incorpora una suite de pruebas del engine con una configuracion de Jest aislada del resto del servidor.

**Archivos modificados/creados:**
- `server/src/logic/ViernesEngine.ts` - correccion del flujo principal de peligros, derrotas y piratas
- `server/src/controllers/viernesController.ts` - validacion de acciones y sincronizacion correcta al abandonar
- `client/src/logic/ViernesEngine.ts` - alineacion de tipos, fases y acciones con el motor
- `client/src/components/combatzone/viernes/ViernesBoard.tsx` - nueva UI para seleccion, combate, derrota y fin de partida
- `client/src/hooks/useViernesGame.ts` - refresco de cache tras acciones y abandono
- `client/src/pages/viernes/ViernesHub.tsx` - estados y resumenes actualizados
- `server/src/logic/__tests__/ViernesEngine.test.ts` - nuevas pruebas unitarias del motor
- `server/jest.logic.config.js` - configuracion de pruebas aislada para la logica de Viernes

### ✨ Nuevas funcionalidades

#### Impersonación de usuarios (SUPER_ADMIN)
- Un `SUPER_ADMIN` puede ver la aplicación exactamente como la ve cualquier otro usuario sin cambiar nada en la base de datos
- Botón "Ver como" en el listado de miembros (visible solo para `SUPER_ADMIN`)
- Banner amarillo en la cabecera mientras se está impersonando, con el nombre y email del usuario impersonado y un botón "Volver a mi cuenta"
- El token de impersonación tiene una validez de 2 horas; al volver se restaura el token original del admin
- No se puede impersonar a otro `SUPER_ADMIN`

**Archivos modificados:**
- `server/src/controllers/memberController.ts` - nuevo: `impersonateMember` (`POST /api/admin/members/:memberId/impersonate`)
- `server/src/routes/adminRoutes.ts` - registro de la nueva ruta
- `server/src/middleware/auth.ts` - añadido campo `impersonatedBy` al payload JWT
- `server/src/types/express.d.ts` - añadido `impersonatedBy?: string` al tipo `req.user`
- `client/src/contexts/AuthContext.tsx` - funciones `impersonate` y `stopImpersonating`
- `client/src/types/auth.ts` - interfaz `AuthContextType` actualizada
- `client/src/components/layout/Header.tsx` - banner de impersonación
- `client/src/pages/admin/Members.tsx` - botón "Ver como" por fila

#### Cambio de rol de usuario (admin)
- Nuevo endpoint para cambiar el rol de un usuario desde el panel de administración
- `SUPER_ADMIN` puede asignar `USER`, `ADMIN` o `SUPER_ADMIN`; un `ADMIN` solo puede asignar `USER`
- Nadie puede cambiar su propio rol

**Archivos modificados:**
- `server/src/controllers/memberController.ts` - nuevo: `changeMemberRole` (`PATCH /api/admin/members/:memberId/role`)
- `server/src/routes/adminRoutes.ts` - registro de la nueva ruta

### 🔒 Mejoras de seguridad

#### Restricción de invitaciones a asistentes confirmados
- Solo pueden crear invitaciones para un evento quienes sean admin, organizador del evento o asistente con inscripción confirmada
- Antes cualquier socio autenticado podía invitar a cualquier evento aunque no estuviera inscrito

**Archivos modificados:**
- `server/src/controllers/invitationController.ts` - comprobación de `isAdmin || isOrganizer || isAttendee` antes de crear invitación

#### Analytics de navegación (page views)
- Registro automático de las páginas visitadas por cada usuario autenticado, almacenado en base de datos
- Se ignoran rutas de administración (`/admin`) y sesiones de impersonación
- Dashboard de analytics en el panel de admin con: total de visitas, usuarios activos en 30 días, usuarios sin actividad en 30+ días, top 10 páginas más visitadas (con barra de progreso relativa), historial de periodos archivados
- Búsqueda de historial de navegación por usuario: input con autocompletado por nombre o email (debounce 300ms), dropdown de sugerencias con avatar, y detalle de páginas visitadas con número de visitas y última fecha
- Botón "Archivar y resetear" para guardar un snapshot del periodo actual en `PageViewArchive` y empezar a contar desde cero

**Archivos modificados/creados:**
- `server/prisma/schema.prisma` - modelos `PageView` y `PageViewArchive`; campo `pageViewCollectionStartedAt` en `ClubConfig`
- `server/prisma/migrations/20260307000000_add_page_views/migration.sql` - migración manual
- `server/src/controllers/pageViewController.ts` - nuevo: `trackPageView`, `getAnalytics`, `getUserPageViews`, `archiveAndReset`
- `server/src/routes/pageViewRoutes.ts` - nuevo: rutas `/api/pageviews`
- `server/src/index.ts` - registro de `pageViewRoutes`
- `client/src/hooks/usePageTracking.ts` - nuevo: hook que dispara POST fire-and-forget en cada cambio de ruta
- `client/src/App.tsx` - componente `PageTracker` dentro de `AuthProvider`
- `client/src/pages/admin/Dashboard.tsx` - sección de analytics con buscador de usuario por nombre/email

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

### ✨ Mejoras

#### Feedback: comentarios abiertos a todos los usuarios con aviso de moderación
- Cualquier usuario autenticado puede ahora escribir comentarios en cualquier reporte (antes solo el autor del reporte y los admins podían hacerlo)
- Aparece un aviso bajo el textarea: *"Los comentarios están sujetos a moderación. Puedes editar o eliminar los tuyos propios."*

**Archivos modificados:**
- `server/src/controllers/reportController.ts` - eliminada comprobación `if (!isAdmin && !isCreator)` en `createReportComment`
- `client/src/pages/Feedback.tsx` - condición de visibilidad del input cambiada de `(isAdmin || esAutor)` a `!!user`

#### Feedback: edición de comentarios propios con historial
- Cada usuario puede editar sus propios comentarios con un editor inline (textarea con botones Guardar/Cancelar)
- Los comentarios editados muestran el indicador `(editado)` junto al timestamp
- El contenido previo se guarda íntegramente en la tabla `ReportCommentHistory` para auditoría y moderación (no visible en la UI)
- Nueva ruta `PATCH /api/reports/:id/comments/:commentId` para actualizar un comentario

**Archivos modificados:**
- `server/prisma/schema.prisma` - campo `editedAt DateTime?` en `ReportComment` + nuevo modelo `ReportCommentHistory`
- `server/src/controllers/reportController.ts` - nueva función `updateReportComment` con guardado atómico del historial
- `server/src/routes/reportRoutes.ts` - nueva ruta `PATCH /:id/comments/:commentId`
- `client/src/pages/Feedback.tsx` - estado `editingCommentId/editingCommentText`, mutation `updateCommentMutation`, UI inline y badge `(editado)`

#### Feedback: fecha y hora en reportes
- El timestamp de cada reporte muestra ahora tanto la fecha como la hora (ej. `01/03/2026, 18:45`) en lugar de solo la fecha

**Archivos modificados:**
- `client/src/pages/Feedback.tsx` - `toLocaleDateString` → `toLocaleString` con opciones de hora

#### Feedback: contador de comentarios en tiempo real
- Al añadir un comentario, el contador `💬 Comentarios (N)` de la tarjeta se actualiza inmediatamente sin necesidad de recargar la página

**Archivos modificados:**
- `client/src/pages/Feedback.tsx` - `queryClient.invalidateQueries({ queryKey: ['reports'] })` en `createCommentMutation.onSuccess`

#### Feedback: limpiar selector de archivo al enviar
- Tras enviar un nuevo reporte con captura de pantalla adjunta, el campo de archivo se vacía automáticamente

**Archivos modificados:**
- `client/src/pages/Feedback.tsx` - `screenshotInputRef` + limpieza en `onSuccess`

#### Notificaciones: badge hasta 99+
- El globo rojo de notificaciones no leídas muestra el número exacto hasta 99; a partir de 100 muestra `99+` (antes el umbral era 9+)

**Archivos modificados:**
- `client/src/components/notifications/NotificationBell.tsx` - umbral cambiado de `> 9` a `> 99`

### 🐛 Corrección de errores

#### Feedback: textarea de edición de comentarios demasiado pequeño
- El textarea al editar un comentario pasa de 2 filas a 4 y cambia de `resize-none` a `resize-y`, permitiendo al usuario redimensionarlo manualmente

**Archivos modificados:**
- `client/src/pages/Feedback.tsx` - `rows={4}` y clase `resize-y`

#### Notificaciones: doble llamada a `/api/notifications/unread-count`
- **Problema:** `NotificationBell` estaba montado dos veces en el Header (uno para escritorio y otro para móvil), provocando dos peticiones simultáneas al intervalo de polling cada 30 segundos
- **Solución:** Eliminadas las dos instancias y sustituidas por una sola en un contenedor compartido; el botón hamburguesa pasa a tener `md:hidden`

**Archivos modificados:**
- `client/src/components/layout/Header.tsx` - instancia única de `<NotificationBell />`

#### Estadísticas: partidas jugadas contaban desde medianoche en lugar de la hora fin
- **Problema:** `completePassedEvents()` comparaba solo la fecha del evento (medianoche) con el momento actual, de modo que los eventos se marcaban como completados nada más pasar la medianoche aunque la partida no hubiese terminado
- **Solución:** Se calcula la hora fin real sumando `startHour + startMinute + durationHours + durationMinutes`; solo entonces se marca el evento como completado

**Archivos modificados:**
- `server/src/controllers/statsController.ts` - cálculo de `endDate` con hora de inicio y duración

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

**Última actualización:** 10 de Marzo de 2026
