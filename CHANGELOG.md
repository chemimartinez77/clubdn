# 📋 Changelog - Club Dreadnought

Registro de cambios y nuevas funcionalidades implementadas en la aplicación.

---

## 2026-04-09 (sesión 7)

### Mejoras visuales

#### Previsión semanal: icono de aviso abajo a la derecha y más grande

- El icono ⚠ (sin socio confirmado) se mueve de la parte superior al **rincón inferior derecho** del bloque, tanto en bloques normales como en bloques solapados (verticales). Se aumenta de 12-13px a 18px (~50% más grande) para que sea más visible sin estorbar el título.

**Archivos modificados:**
- `client/src/pages/WeeklyPreview.tsx` — `warnIcon` y el span en bloques solapados pasan a `position: absolute; bottom: 3px; right: 3px; fontSize: 18px`

---

## 2026-04-09 (sesión 6)

### Mejoras visuales

#### Previsión semanal: hora de inicio en bloques verticales

- En los bloques solapados (texto vertical), ahora se muestra primero la hora de inicio (solo la de inicio, sin el rango "– fin") y luego el nombre del juego. Antes aparecía primero el nombre y la hora al final, lo que dificultaba la lectura de un vistazo.

**Archivos modificados:**
- `client/src/pages/WeeklyPreview.tsx` — reordenados hora y nombre en bloques verticales; hora solo muestra inicio (`timeStr.split(' – ')[0]`)

---

## 2026-04-09 (sesión 5)

### Correcciones

#### Inversión de roles en badges Validador y Testigo de Mesa

- Los roles de VALIDADOR y TESTIGO_MESA estaban intercambiados. Se corrige la lógica: **VALIDADOR** lo obtiene quien muestra su propio QR (el `scannedId`), y **TESTIGO_MESA** quien escanea el QR de otro (el `scannerId`). El nombre "testigo" hace referencia a quien "ve" con la cámara, de ahí el cambio.
- Las descripciones en la UI se actualizan para reflejar el comportamiento correcto.

**Archivos modificados:**
- `server/src/controllers/badgeController.ts` — `getCategoryCount` intercambia `scannedId`/`scannerId` entre VALIDADOR y TESTIGO_MESA
- `server/src/controllers/eventController.ts` — `validateGameQr` llama a `checkAndUnlockBadges` con los IDs correctos para cada badge
- `client/src/types/badge.ts` — descripciones de VALIDADOR y TESTIGO_MESA actualizadas

---

## 2026-04-09 (sesión 4)

### Nuevas funcionalidades y correcciones

#### Nuevos badges: Testigo de Mesa y Auditor Lúdico

- Se añaden dos nuevos badges al sistema de logros:
  - **TESTIGO_MESA**: se otorga al jugador que escanea el QR de otro con la cámara al terminar una partida. 6 niveles con umbrales 5/10/20/40/70/100 (Presente y Acreditado → Leyenda del Acta).
  - **AUDITOR_LUDICO**: se otorga al organizador cuando confirma que su partida se celebró. 6 niveles con umbrales 5/10/20/40/70/100 (Inspector Novato → Guardián de la Verdad Lúdica).
- El badge **VALIDADOR** lo obtiene quien muestra su propio QR para ser escaneado (valida su presencia en la partida).
- Las notificaciones de tipo `EVENT_DISPUTE_CONFIRMATION` se eliminan automáticamente pasadas 48 horas desde su creación, evitando que queden pendientes eternamente en la bandeja del organizador.

**Archivos modificados:**
- `server/prisma/schema.prisma` — enum `BadgeCategory` con `TESTIGO_MESA` y `AUDITOR_LUDICO`
- `server/prisma/migrations/20260409030000_add_testigo_auditor_badges/migration.sql` — nuevo fichero de migración
- `server/prisma/seeds/badgeDefinitions.ts` — 12 nuevas definiciones (90 total)
- `server/src/controllers/badgeController.ts` — `getCategoryCount` separado en VALIDADOR (solo scanner) y TESTIGO_MESA (solo scanned); nuevo caso AUDITOR_LUDICO; display names actualizados
- `server/src/controllers/eventController.ts` — `validateGameQr` llama a `checkAndUnlockBadges` para TESTIGO_MESA; `confirmEventPlayed` llama a `checkAndUnlockBadges` para AUDITOR_LUDICO
- `server/src/controllers/statsController.ts` — `completePassedEvents` limpia notificaciones `EVENT_DISPUTE_CONFIRMATION` con más de 48h
- `client/src/types/badge.ts` — nuevas entradas en `BadgeCategory`, `getCategoryDisplayName`, `getCategoryDescription`, `getCategoryColor` y `getCategoryIcon` para TESTIGO_MESA y AUDITOR_LUDICO; descripción de VALIDADOR corregida

---

## 2026-04-09 (sesión 3)

### Mejoras

#### Descripciones en todos los badges + botón de cerrar sesión en onboarding

- Todos los badges muestran ahora una breve descripción de cómo se obtienen, visible directamente en el header del logro (entre el nombre y el contador), sin necesidad de desplegarlo. Anteriormente solo Catalogador, Conocedor de Géneros y Fotógrafo tenían descripción.
- Se añade botón "Cerrar sesión" en la pantalla de onboarding, para que un usuario que haya entrado con la cuenta equivocada pueda salir sin tener que manipular el navegador.

**Archivos modificados:**
- `client/src/types/badge.ts` — `getCategoryDescription` pasa de `Partial<Record>` a `Record` completo con descripción para todas las categorías
- `client/src/pages/Onboarding.tsx` — botón de cerrar sesión que limpia el token y redirige a `/login`

---

## 2026-04-09 (sesión 2)

### Nuevas funcionalidades

#### Toggle BGG / RPGGeek en el modal de búsqueda de juegos

- Al crear o editar una partida, el modal de búsqueda de juegos incluye ahora un toggle "Juego de mesa / Juego de rol" que cambia el backend de búsqueda entre BoardGameGeek y RPGGeek. Por defecto busca en BGG; si se activa el toggle, busca en RPGGeek (útil para juegos de rol que no están en BGG).
- El toggle se resetea a BGG cada vez que se abre el modal.

**Archivos modificados:**
- `server/src/services/bggService.ts` — nueva función `searchRPGGeekGames`
- `server/src/controllers/bggController.ts` — nuevo handler `searchRPGGGames`
- `server/src/routes/bggRoutes.ts` — ruta `GET /api/bgg/rpgg/search`
- `client/src/components/events/GameSearchModal.tsx` — toggle de fuente, reset al abrir

#### Nueva categoría de juego: Cartas / LCG / TCG

- Se añade la categoría `CARTAS_LCG_TCG` al enum `BadgeCategory` para poder clasificar juegos de cartas tipo Magic, Keyforge, etc.
- Aparece como opción en el selector de categoría al crear/editar partidas.

**Archivos modificados:**
- `server/prisma/schema.prisma` — nuevo valor en enum `BadgeCategory`
- `server/prisma/migrations/20260409010000_add_cartas_lcg_tcg_category/migration.sql` — `ALTER TYPE ADD VALUE`
- `client/src/types/badge.ts` — tipo, nombre (`Cartas / LCG / TCG`) e icono (`🃏`)
- `client/src/pages/CreatePartida.tsx` y `client/src/pages/EventDetail.tsx` — nueva opción en el select

#### Dos nuevos badges: Conocedor de Géneros y Fotógrafo

**Conocedor de Géneros** — sistema de votación comunitaria de categoría de juego por `bggId`:
- Cuando 2 usuarios coinciden en la categoría de un mismo juego, ambos reciben 1 punto y la categoría queda fijada en BD (`Game.confirmedCategory`). El juego puede necesitar más de 2 votos si no hay coincidencia entre los primeros.
- Una vez fijada, el selector de categoría aparece bloqueado con el mensaje "Categoría fijada por la comunidad".
- Niveles (umbrales 2/5/10/20/35/50): Aficionado Curioso, Conocedor de Géneros, Experto en Géneros, Maestro Clasificador, Gran Árbitro Lúdico, Enciclopedia Viviente.

**Fotógrafo** — se acredita 1 punto cada vez que un usuario sube al menos una foto a una partida (máximo 1 punto por partida aunque suba varias):
- Niveles (umbrales 1/5/10/20/35/60): Testigo Ocular, Cazador de Instantes, Reportero de Mesa, Fotógrafo Oficial, Maestro del Objetivo, Gran Cronista del Club.

La descripción de cómo se obtiene cada badge especial ahora aparece integrada en el header del logro (entre el nombre y el contador), visible sin necesidad de desplegar.

**Archivos modificados:**
- `server/prisma/schema.prisma` — enum `CONOCEDOR_GENEROS` y `FOTOGRAFO`, modelos `GameCategoryVote` y `GenreConsensusHistory`, campo `confirmedCategory` en `Game`
- `server/prisma/migrations/20260409020000_add_new_badges/migration.sql` — nuevas tablas y columnas
- `server/src/controllers/badgeController.ts` — contadores para nuevos badges, función `processGameCategoryVote`
- `server/src/controllers/eventController.ts` — llama a `processGameCategoryVote` al crear/actualizar eventos
- `server/src/controllers/eventPhotoController.ts` — acredita punto FOTOGRAFO al subir primera foto; migrado a singleton de Prisma
- `server/prisma/seeds/badgeDefinitions.ts` — 12 nuevas definiciones
- `client/src/types/badge.ts` — tipos, nombres, iconos y descripciones para nuevos badges
- `client/src/types/event.ts` — campo `confirmedCategory` en interfaz `Event`
- `client/src/pages/CreatePartida.tsx` y `client/src/pages/EventDetail.tsx` — select bloqueado si hay categoría confirmada
- `client/src/components/badges/BadgeGrid.tsx` — descripción visible en el header del badge

---

## 2026-04-09 (sesión 1)

### Nuevas funcionalidades

#### Formulario de onboarding obligatorio para nuevos socios

- Al aprobar un usuario, antes de poder acceder a la app debe completar una ficha de socio obligatoria. Si no la completa, se le redirige a `/onboarding` en cada acceso hasta que lo haga.
- El formulario recoge: nombre, apellidos, DNI/NIE, teléfono, dirección completa (calle, ciudad, provincia, CP), IBAN y dos consentimientos de imagen (actividades y redes sociales). Todos los campos son obligatorios excepto los consentimientos, que son opt-in.
- Al completar el formulario, los admins reciben una notificación de campanita ("Nuevo socio registrado").
- Se elimina el envío de email a todos los admins al verificar el email (era redundante con la notificación de campanita existente).
- El campo `onboardingCompleted` se añade a `UserProfile` con valor por defecto `false`. Los usuarios existentes tienen `false` y necesitarán completar el formulario en su próximo acceso — considerar hacer un script de backfill si se quiere evitar que los socios actuales tengan que rellenarlo.
- `ProtectedRoute` en el cliente consulta el perfil y redirige a `/onboarding` si `onboardingCompleted === false`.

**Archivos modificados:**
- `server/prisma/schema.prisma` — campo `onboardingCompleted Boolean @default(false)` en `UserProfile`
- `server/prisma/migrations/20260409000000_add_onboarding_completed/migration.sql` — migración ALTER TABLE
- `server/src/controllers/authController.ts` — eliminado bucle de emails a admins en `verifyEmail`
- `server/src/controllers/profileController.ts` — nuevo handler `completeOnboarding`
- `server/src/routes/profileRoutes.ts` — ruta `PATCH /me/onboarding`
- `server/src/services/notificationService.ts` — nueva función `notifyAdminsOnboardingCompleted`
- `client/src/pages/Onboarding.tsx` — nueva página con formulario de ficha de socio
- `client/src/types/profile.ts` — campo `onboardingCompleted: boolean`
- `client/src/App.tsx` — `ProtectedRoute` con comprobación de onboarding, ruta `/onboarding`

---

## 2026-04-08 (sesión 1)

### Mejoras visuales

#### Previsión semanal: ajustes de legibilidad y visibilidad

- El color de los bloques sin socio confirmado era demasiado claro (mezcla con fondo al 55%); se reduce a 25% para que sean mucho más visibles.
- El icono ⚠ era demasiado pequeño; se aumenta de 9px a 12px en bloques normales y de 10px a 13px en bloques verticales.
- El texto vertical pasa de 10px a 12px y se elimina la negrita (`fontWeight: 400`) para mejorar la legibilidad.
- El texto vertical se rota hacia la derecha (se elimina `rotate(180deg)`) para que lea de arriba hacia abajo de forma natural.
- El nombre del juego en bloques normales se marca explícitamente sin negrita.
- La leyenda inferior sube de 11px a 14px (~30% más grande) y los iconos de 10px a 13px.

**Archivos modificados:**
- `client/src/pages/WeeklyPreview.tsx` — colores, tamaños de fuente, rotación de texto vertical, leyenda

---

#### Previsión semanal: texto vertical, icono de aviso y leyenda mejorada

- Los bloques solapados son estrechos y el texto horizontal quedaba cortado. Ahora cuando un bloque tiene solapamiento (`totalColumns > 1`) el texto se renderiza en vertical (`writing-mode: vertical-rl` + `rotate(180deg)`), mostrando título y hora de forma legible.
- Se añade el símbolo `⚠` (U+26A0, sin variante emoji para poder colorearlo con CSS) en el color `accent` del tema, tanto en bloques normales (antes del título) como en bloques verticales (encima del texto). Indica que la partida no tiene ningún socio confirmado apuntado.
- Se restaura el color original del tema para todos los bloques (se revierte el intento previo de paleta de colores alternos que el usuario no aprobó).
- La leyenda inferior se actualiza: se elimina el cuadrado apagado para "sin socio", se añade el `⚠` con su color de acento, y se añade un tercer elemento con el patrón de rayas para "Partidas solapadas".

**Archivos modificados:**
- `client/src/pages/WeeklyPreview.tsx` — texto vertical en solapados, icono ⚠, leyenda actualizada

---

### Nuevas funcionalidades

#### Preferencias de vista de eventos en el perfil

- Se añaden dos nuevas preferencias al perfil del usuario: vista por defecto en la página de Eventos (Calendario / Lista) y modo de acordeones en la vista lista (Solo día actual / Todos abiertos).
- Al entrar en Eventos, la app aplica automáticamente la preferencia guardada.
- Se añaden también dos botones "Desplegar todo" / "Plegar todo" en la vista lista (estado local, sin llamada a BD).
- Se corrige que el endpoint `PUT /api/profile/me` ignoraba los campos `emailUpdates`, `eventsDefaultView` y `eventsAccordionMode` — `emailUpdates` estaba hardcodeado a `false` y los otros dos no estaban en el destructuring.
- Se corrige que los toggles y selectores del perfil no reflejaban el cambio visualmente al instante: ahora se usa `setQueryData` en lugar de solo `invalidateQueries`.

**Archivos modificados:**
- `server/prisma/schema.prisma` — campos `eventsDefaultView` y `eventsAccordionMode` en `UserProfile`
- `server/prisma/migrations/20260407200000_add_events_view_preferences/migration.sql` — migración ALTER TABLE
- `server/src/controllers/profileController.ts` — añadidos `emailUpdates`, `eventsDefaultView` y `eventsAccordionMode` al destructuring y al update
- `client/src/pages/Events.tsx` — query de perfil, inicialización de `viewMode` y `openDays` según preferencias, botones plegar/desplegar
- `client/src/pages/Profile.tsx` — selectores de vista y acordeón, `setQueryData` en `onSuccess`
- `client/src/types/profile.ts` — campos `eventsDefaultView` y `eventsAccordionMode`

#### Notificaciones por email en eventos

- El organizador recibe un email cuando un miembro se apunta (CONFIRMED) o abandona su partida, si tiene `emailUpdates` activado.
- El participante recibe siempre un email cuando es expulsado de una partida (con motivo obligatorio de una lista fija).
- Todos los participantes reciben un email cuando se cancela un evento (con motivo obligatorio).
- Los modales de expulsión y cancelación incluyen un selector desplegable con motivos predefinidos; el botón de confirmar queda desactivado hasta seleccionar uno.

**Archivos modificados:**
- `server/src/services/emailService.ts` — 4 nuevas funciones de email (apuntarse, abandonar, expulsión, cancelación)
- `server/src/controllers/eventController.ts` — lógica de envío de emails y validación de motivos
- `server/prisma/schema.prisma` — campos `cancellationReason` en `Event` y `removalReason` en `EventRegistration`
- `server/prisma/migrations/20260407100000_add_event_reasons/migration.sql` — migración ALTER TABLE
- `client/src/pages/EventDetail.tsx` — modales con selector de motivo obligatorio

#### Detalle de libros ROL desde RPGGeek en la ludoteca

- Los libros de rol de la ludoteca tienen un `bggId` que en realidad es un ID de RPGGeek. Al pulsar "Ver detalle", el modal intentaba consultar la API de BGG y fallaba.
- Se añade el endpoint `GET /api/ludoteca/:id/detail` que consulta RPGGeek para items de tipo ROL y devuelve los datos en el mismo formato que `/api/games/:id`.
- Los campos `image` y `yearPublished` se cachean en `LibraryItem` tras la primera consulta, igual que ya hacía el `thumbnail`.
- El `GameDetailModal` muestra un enlace a RPGGeek en lugar del logo de BGG para estos items.
- Se corrige que el cliente `rpggClient` no enviaba las credenciales de autenticación, causando 401.

**Archivos modificados:**
- `server/src/controllers/ludotecaController.ts` — endpoint `getLibraryItemDetail`, caché de `image` y `yearPublished`
- `server/src/routes/ludotecaRoutes.ts` — ruta `GET /:id/detail`
- `server/src/services/bggService.ts` — `rpggClient` con `authHeaders`
- `server/prisma/schema.prisma` — campos `image` y `yearPublished` en `LibraryItem`
- `server/prisma/migrations/20260407300000_add_library_item_image_year/migration.sql` — migración ALTER TABLE
- `client/src/pages/Ludoteca.tsx` — pasa `source: 'rpggeek'` al modal para items ROL
- `client/src/components/games/GameDetailModal.tsx` — prop `source`, endpoint y enlace según origen

### Correcciones

#### Previsualización WhatsApp al compartir partidas

- Al compartir una partida, WhatsApp no mostraba la imagen del juego porque BGG bloquea el hotlinking y el scraper no podía cargarla.
- Se añade la ruta `GET /preview/image/:id` que descarga la imagen desde BGG en el servidor y la sirve desde el propio dominio, evitando el bloqueo.
- Se añade detección de User-Agent en el endpoint de preview: los crawlers reciben el HTML con meta OG sin redirección; los usuarios normales son redirigidos a la app.
- El mensaje de WhatsApp ahora usa siempre la URL de preview para la previsualización, pero el enlace "Apúntate aquí" apunta directamente a la app.
- Se eliminan los emojis condicionales por User-Agent en el mensaje (móvil/escritorio) — se usa un formato único con viñetas `·` para todos los dispositivos.
- Se añade `og-image.png` (el noughter) en `client/public/` como fallback para eventos sin imagen de juego.

**Archivos modificados:**
- `server/src/controllers/previewController.ts` — proxy de imagen, detección de crawler, meta tags OG completos
- `server/src/routes/previewRoutes.ts` — ruta `GET /image/:id`
- `client/src/pages/EventDetail.tsx` — URL de preview siempre activa, formato de mensaje unificado
- `client/public/og-image.png` — imagen de fallback

#### Redirección al detalle tras crear una partida

- Al crear una partida, la app redirigía al calendario en lugar de al detalle de la partida recién creada, impidiendo añadir miembros o compartirla de inmediato.
- Se cambia la navegación post-creación a `/events/:id` usando el id devuelto por la API.

**Archivos modificados:**
- `client/src/pages/CreatePartida.tsx` — `navigate('/events')` → `navigate('/events/${data.data?.event?.id}')`

---

## 2026-04-07 (sesión 2)

### Correcciones

#### Precios de membresía dinámicos en el modal de aprobación

- El modal "Aprobar Usuario" mostraba los precios hardcodeados (`15€/mes`, `19€/mes`), ignorando la configuración real del club almacenada en BD.
- Se sustituye la lista estática por una consulta a `/api/config` (TanStack Query, caché 5 min). Los labels se generan dinámicamente con el precio y la moneda configurados. Si el precio es 0 (En Pruebas, Familiar), no se muestra importe. La opción `BAJA` se filtra y no aparece como opción de aprobación. Si la config no carga, se muestra un fallback con nombres sin precio.
- También se corrige el formato de fecha en las notificaciones de nuevas partidas: Railway corre en UTC y `toLocaleDateString('es-ES')` no respeta el locale configurado en el servidor, produciendo fechas en formato M/D/YYYY. Se sustituye por una función `formatDateEs` que construye la fecha explícitamente en formato `D/M/YYYY`.

**Archivos modificados:**
- `client/src/components/admin/ApproveUserModal.tsx` — precios leídos de la config del club vía API
- `server/src/services/notificationService.ts` — función `formatDateEs` para formato de fecha garantizado

---

## 2026-04-07 (sesión 1)

### Nuevas funcionalidades

#### Campo "Miembro desde" con antigüedad real del club

- El campo "Miembro desde" en la tarjeta de bienvenida del dashboard no tenía datos reales: se usaba `startDate` de la membresía, que corresponde al ciclo de pago actual, no a la fecha de alta histórica.
- Se añade el campo `memberSince` (nullable) al modelo `Membership` en Prisma, independiente de `startDate`.
- Se crea el script `seed-member-since.ts` que carga las fechas históricas de un CSV del club y las cruza por email (case-insensitive) para poblar el campo en BD.
- Si `memberSince` es null, el bloque "Miembro desde" no se muestra en el dashboard (en lugar de mostrar "Nunca" u otro valor incorrecto).

**Archivos modificados:**
- `server/prisma/schema.prisma` — campo `memberSince DateTime?` en modelo `Membership`
- `server/prisma/migrations/20260406000000_add_member_since/migration.sql` — migración ALTER TABLE
- `server/src/scripts/seed-member-since.ts` — script de seed con datos CSV históricos
- `client/src/types/auth.ts` — `memberSince?: string | null` en tipo `membership`
- `client/src/components/dashboard/WelcomeCard.tsx` — mostrar fecha sin hora, ocultar si es null

#### Búsqueda de miembros por nick e insensible a tildes

- Al añadir asistentes a una partida, solo se podía buscar por nombre completo, con sensibilidad a mayúsculas y tildes.
- Se amplía la búsqueda para incluir el campo `nick` del perfil. La búsqueda es insensible a tildes mediante normalización Unicode en JS (sin depender de extensiones de PostgreSQL).
- El nick se devuelve en los resultados y se muestra entre paréntesis junto al nombre en la lista de sugerencias.

**Archivos modificados:**
- `server/src/controllers/eventController.ts` — búsqueda OR por nombre/nick, normalización accent-insensitive, devuelve `nick`
- `client/src/pages/EventDetail.tsx` — muestra nick entre paréntesis en la lista de miembros

---

## 2026-04-06 (sesión 1)

### Correcciones

#### Compatibilidad de URL de calendario con Outlook

- Outlook rechazaba la URL de suscripción de calendario porque no terminaba en `.ics`, que es el formato estándar que espera.
- Se añade la extensión `.ics` al final de la URL que se muestra y copia en el perfil del usuario.
- Se registra una segunda ruta en el servidor (`/:token.ics`) que apunta al mismo controlador, manteniendo la ruta antigua (`/:token`) por compatibilidad con suscripciones ya guardadas.
- La URL con `.ics` funciona igualmente en iPhone y Google Calendar.

**Archivos modificados:**
- `client/src/pages/Profile.tsx` — URL generada y mostrada en el perfil ahora termina en `.ics`
- `server/src/routes/calendarRoutes.ts` — nueva ruta `GET /:token.ics` apuntando al mismo controlador

#### Búsqueda de miembros por nick e insensible a tildes

- Al añadir miembros a una partida, la búsqueda solo funcionaba por nombre completo y era sensible a tildes.
- Se amplía la búsqueda para incluir el campo `nick` del perfil además del nombre. La normalización de tildes se realiza en JS tras traer candidatos de la BD (Prisma/PostgreSQL no soporta búsqueda sin tildes sin la extensión `unaccent`).
- El nick se muestra ahora entre paréntesis junto al nombre en los resultados.
- Se corrige el valor por defecto de localización en los formularios de creación/edición de eventos a "Club Dreadnought".

**Archivos modificados:**
- `server/src/controllers/eventController.ts` — búsqueda por `name` OR `profile.nick`, normalización de tildes en JS, devuelve `nick` en respuesta
- `client/src/pages/EventDetail.tsx` — muestra nick en resultados, tipo de estado actualizado
- `client/src/pages/CreatePartida.tsx` — localización por defecto corregida
- `client/src/pages/admin/EventManagement.tsx` — localización por defecto corregida

#### Corrección de desfase horario en el calendario ICS

- Los eventos aparecían 2 horas más tarde de lo esperado en Outlook (y potencialmente en otros clientes). El servidor corre en UTC en Railway, pero `startHour` se guarda como hora local de Madrid. El código anterior emitía la hora como UTC, lo que provocaba un desfase de +2h en verano y +1h en invierno.
- Se cambia el formato de `DTSTART`/`DTEND` de UTC (`...Z`) a hora local con `TZID=Europe/Madrid`, que es el estándar correcto para eventos con zona horaria fija. El cliente de calendario aplica la conversión automáticamente según la época del año.
- Además se corrige el valor incorrecto `APPROVED` en el filtro de registraciones (no existe en el enum `RegistrationStatus`), sustituyéndolo por solo `CONFIRMED`, que es el estado final tras aprobación.

**Archivos modificados:**
- `server/src/controllers/calendarController.ts` — `DTSTART`/`DTEND` con `TZID=Europe/Madrid`, nueva función `toIcsDateLocal`, filtro de status corregido a `CONFIRMED`

#### Polling automático de notificaciones y eventos

- Los datos de notificaciones y eventos no se actualizaban sin recargar la página manualmente.
- Se ajusta el intervalo de polling de notificaciones de 30s a 120s. Se añade `refetchInterval` de 10 minutos a las queries de lista de eventos y próximos eventos del dashboard. TanStack Query también refresca al volver a la pestaña (`refetchOnWindowFocus`).

**Archivos modificados:**
- `client/src/components/notifications/NotificationBell.tsx` — intervalo de polling 30s → 120s
- `client/src/pages/Events.tsx` — `refetchInterval: 10 * 60 * 1000`
- `client/src/components/dashboard/UpcomingEventsCard.tsx` — `refetchInterval: 10 * 60 * 1000`

---

## 2026-04-05 (sesión 4)

### Seguridad

#### Bloqueo de acceso a usuarios dados de baja

- Los usuarios importados del CSV con `estado = "canceled"` habían quedado como `APPROVED` en la BD al no mapear ese campo durante la importación. Podían iniciar sesión y usar la app.
- Se añade el estado `BAJA` al flujo de login: si el usuario tiene ese estado, se devuelve 403 con mensaje "Tu cuenta está dada de baja. Si crees que es un error, contacta con el club." y no se genera token.
- Se añade comprobación en el middleware `authenticate`: en cada petición autenticada se consulta el estado actual del usuario en BD. Si es `BAJA` o `SUSPENDED`, se devuelve 403 inmediatamente, invalidando sesiones activas sin esperar a que expire el JWT (365 días).
- Corrección de datos en producción: UPDATE directo en BD para marcar 58 usuarios como `BAJA` identificados por email desde el CSV original.

**Archivos modificados:**
- `server/src/controllers/authController.ts` — bloque `BAJA` en login, con log del intento fallido
- `server/src/middleware/auth.ts` — consulta a BD en cada request para verificar `status` actual

---

## 2026-04-05 (sesión 3)

### Correcciones

#### Colores de días del calendario en tema claro

- Los encabezados de días en la vista de lista del calendario usaban colores hardcodeados para tema oscuro (`bg-*-900/30`, `text-*-300`), lo que resultaba en texto pastel sobre fondo pastel ilegible en tema claro (reportado por una usuaria).
- Se usa `useTheme` para detectar `themeMode` y seleccionar el mapa de colores adecuado: variantes `/30` con texto `-300` en oscuro, variantes `-100` con texto `-800` en claro.

**Archivos modificados:**
- `client/src/pages/Events.tsx` — importa `useTheme`, `themeMode` condiciona `dayColors`

---

### Nuevas funcionalidades

#### Me gusta en el tablón de anuncios

- Se añade un botón "Me gusta" en cada anuncio, tanto en la vista pública (`/announcements`) como en la vista de administración (`/admin/announcements`).
- El botón se posiciona fuera de la card, anclado en la esquina inferior derecha (CSS `position: absolute`, `-bottom-3 right-4`) para que solape visualmente el borde inferior de la tarjeta.
- Cuando el usuario ha dado Me gusta, aparece el icono `meeple.blue.png` a la izquierda del texto y el botón se rellena con el color primario. Al quitarlo, el meeple desaparece.
- Se muestra el contador de likes si es mayor que 0.
- Actualización optimista con TanStack Query: el estado cambia al instante y se revierte si hay error.
- Rate limit de 5 segundos en memoria (servidor) por usuario y anuncio; si se supera, el servidor devuelve 429 y el frontend muestra un toast de aviso.
- Separación entre cards aumentada de `space-y-3` a `space-y-6` para dejar espacio al botón flotante.

**Archivos modificados:**
- `server/prisma/schema.prisma` — nuevo modelo `AnnouncementLike` con `@@unique([announcementId, userId])` y relaciones en `Announcement` y `User`
- `server/src/controllers/announcementController.ts` — `listAnnouncements` incluye `likeCount` y `userHasLiked`; nuevo controlador `toggleLike` con rate limit en Map
- `server/src/routes/announcementRoutes.ts` — nueva ruta `POST /:id/like`
- `client/src/types/announcement.ts` — añadidos campos `likeCount` y `userHasLiked`
- `client/src/pages/Announcements.tsx` — botón Me gusta con meeple, posicionado fuera de card, actualización optimista
- `client/src/pages/admin/Announcements.tsx` — ídem en vista admin
- `client/public/meeple.blue.png` — nuevo asset (meeple azul)

---

## 2026-04-05 (sesión 2)

### Nuevas funcionalidades

#### Cancelar solicitud pendiente de aprobación

- Un jugador con registro en estado `PENDING_APPROVAL` no podía borrarse de la partida porque `canUnregister` excluía explícitamente ese estado. Ahora puede cancelar su solicitud desde el detalle del evento.
- El botón muestra "Cancelar solicitud" en lugar de "No asistiré" cuando el estado es `PENDING_APPROVAL`.
- La modal de confirmación adapta su título y texto según el estado: "Cancelar solicitud / Se notificará al organizador" vs "Abandonar partida / Se notificará al organizador y al resto de jugadores".
- Al cancelar una solicitud pendiente, solo se notifica al organizador (no al resto de jugadores). Al abandonar estando confirmado, se notifica a todos.
- Los textos de notificación diferencian ambos casos: "ha cancelado su solicitud" vs "ha abandonado la partida".

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — `canUnregister` sin excluir `PENDING_APPROVAL`, texto del botón y modal dinámicos
- `server/src/controllers/eventController.ts` — `notifyPlayersOfAbandonment` solo se llama si era `CONFIRMED`; `notifyRegistrationCancelled` recibe `wasConfirmed`
- `server/src/services/notificationService.ts` — `notifyRegistrationCancelled` con títulos/mensajes distintos según estado; `notifyPlayersOfAbandonment` excluye al organizador si ya fue notificado por separado

---

#### Re-registro respeta `requiresApproval`

- Al re-apuntarse a una partida con aprobación requerida (tras haber cancelado previamente), el registro se reactivaba directamente como `CONFIRMED` en lugar de `PENDING_APPROVAL`. Corregido para respetar `event.requiresApproval` también en el flujo de re-registro.

**Archivos modificados:**
- `server/src/controllers/eventController.ts` — rama de re-registro usa `reRegStatus` y notifica al organizador si corresponde

---

#### Campo `updatedAt` en `EventRegistration` para fecha de solicitud fiable

- La fecha de solicitud mostrada en el panel de solicitudes pendientes usaba `createdAt`, que no se actualizaba al re-apuntarse. Se añade `updatedAt` al modelo (con `@updatedAt`) para reflejar siempre la fecha de la última acción.
- El frontend usa `updatedAt ?? createdAt` al mostrar "Solicitó el...".

**Archivos modificados:**
- `server/prisma/schema.prisma` — `updatedAt DateTime @default(now()) @updatedAt` en `EventRegistration`
- `client/src/pages/EventDetail.tsx` — fecha de solicitud usa `registration.updatedAt ?? registration.createdAt`

---

### Correcciones

#### Ventana de validación QR usaba hora local en lugar de UTC

- El cálculo de la ventana de validación de QR reconstruía la hora de inicio con `setHours(startHour, startMinute)`, que interpreta la hora en la zona local del servidor. Como `event.date` ya almacena la hora en UTC, el resultado era un desfase de 2h (UTC+2 en verano), haciendo que la ventana no se abriera hasta 2h después de lo esperado.
- Corregido usando `event.date` directamente como `eventStart`, igual que se hizo en `completePassedEvents`. El `windowClose` pasa a usar `setUTCHours`.

**Archivos modificados:**
- `server/src/controllers/eventController.ts` — `validateGameQr` usa `eventDate` directamente y `setUTCHours` para el cierre

---

#### Emojis en mensaje de WhatsApp se corrompían en algunos entornos

- Los emojis del mensaje de WhatsApp se definían con `String.fromCodePoint()`, que en algunos entornos (Railway) producía el carácter de reemplazo Unicode (`%EF%BF%BD`) al codificar la URL. Sustituidos por literales UTF-8 directos.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — `emojiCalendar`, `emojiClock`, `emojiLocation` como literales `📅`, `🕐`, `📍`

---

#### Notificaciones de anuncios: formato de título y mensaje

- El header de la notificación mostraba el título del anuncio y el mensaje mostraba el contenido. Cambiado para que el header sea siempre "Tablón de anuncios" y el mensaje sea el título del anuncio (o el inicio del contenido si no tiene título).

**Archivos modificados:**
- `server/src/services/notificationService.ts` — `notifyNewAnnouncement` actualizado

---

## 2026-04-05 (sesión 1)

### Nuevas funcionalidades

#### Botón "Notificar" manual en el tablón de anuncios (solo SUPER_ADMIN)

- El tablón de anuncios creaba automáticamente una `GlobalNotification` al publicar cada anuncio, sin control del administrador. Ahora la notificación es manual: se añade un botón con icono de sobre visible únicamente para el rol `SUPER_ADMIN` en cada fila del listado de anuncios.
- Se elimina la llamada automática a `notifyNewAnnouncement` del controlador `createAnnouncement`, evitando notificaciones dobles cuando el admin pulsa el botón después de crear.
- El endpoint `POST /api/announcements/:id/notify` está protegido con el middleware `requireSuperAdmin`.

**Archivos modificados:**
- `server/src/controllers/announcementController.ts` — eliminada llamada automática a `notifyNewAnnouncement` en `createAnnouncement`
- `server/src/controllers/notificationController.ts` — `getNotifications` y `getUnreadCount` incluyen `ANNOUNCEMENT_CREATED` además de `EVENT_CREATED`
- `server/src/middleware/auth.ts` — nuevo middleware `requireSuperAdmin`
- `server/src/routes/announcementRoutes.ts` — ruta `POST /:id/notify` con `requireSuperAdmin`
- `client/src/pages/admin/Announcements.tsx` — `notifyMutation`, icono de sobre, visible solo si `isSuperAdmin`

#### Previsualización de imagen del juego al compartir por WhatsApp

- Al compartir una partida por WhatsApp con el botón existente, WhatsApp no generaba previsualización de imagen porque la app es una SPA y el bot de WhatsApp no ejecuta JavaScript.
- Se añade un endpoint Express `GET /preview/events/:id` (sin autenticación) que devuelve HTML estático con meta OG tags: `og:image` apunta a `event.gameImage` (URL de BGG guardada en BD), `og:title` incluye el nombre del juego, y `og:description` muestra fecha, hora y plazas disponibles. El HTML redirige automáticamente al usuario a `/events/:id`.
- En el frontend se añade un segundo botón "WA + imagen" (solo visible si el evento tiene `gameImage`) que envía únicamente la URL de preview a WhatsApp, permitiendo que el bot la rastree y genere la previsualización con la portada del juego.

**Archivos añadidos/modificados:**
- `server/src/controllers/previewController.ts` — nuevo, genera HTML con OG tags dinámicos
- `server/src/routes/previewRoutes.ts` — nuevo, `GET /events/:id`
- `server/src/index.ts` — registra `app.use('/preview', previewRoutes)` sin autenticación
- `client/src/pages/EventDetail.tsx` — `handleSharePreview` y botón "WA + imagen"

---

### Correcciones

#### Notificaciones de anuncios no aparecían en el badge de la campana

- El controlador de notificaciones filtraba las `GlobalNotification` por `type: 'EVENT_CREATED'` de forma hardcodeada, por lo que los registros de tipo `ANNOUNCEMENT_CREATED` nunca se contaban ni se mostraban en el panel de notificaciones.
- Cambiado el filtro a `type: { in: ['EVENT_CREATED', 'ANNOUNCEMENT_CREATED'] }` en los tres lugares donde se consultan globales: listado completo, listado unreadOnly y conteo de no leídas.

**Archivos modificados:**
- `server/src/controllers/notificationController.ts` — filtro de tipo ampliado en `getNotifications` y `getUnreadCount`

---

## 2026-04-04 (sesión 1)

### Correcciones

#### Campos nullable en schema Prisma para invitaciones sin DNI

- Tras hacer opcionales los campos DNI/NIE en el formulario de invitaciones (sesión 2026-04-02), el schema de Prisma seguía declarando `guestPhone` y `guestDniNormalized` como `String` (NOT NULL) en los modelos `Invitation` y `EventGuest`. Esto producía un `PrismaClientKnownRequestError P2011` al intentar crear invitaciones sin DNI, tanto en local como en producción.
- Se corrigen ambos campos a `String?` (nullable) en el schema. También se actualiza `maskDni` para aceptar `string | null | undefined`.
- El cambio se aplicó a producción con `prisma db push` apuntando directamente a la BD de Railway, ya que Railway no ejecuta `db push` automáticamente en el deploy.

**Archivos modificados:**
- `server/prisma/schema.prisma` — `guestPhone` y `guestDniNormalized` opcionales en `Invitation`; `guestPhone` opcional en `EventGuest`
- `server/src/controllers/invitationController.ts` — `maskDni` acepta `null`

---

#### Partidas en progreso visibles en la home hasta su hora de fin

- Las partidas desaparecían del panel "Tus próximas partidas" en cuanto llegaba su hora de inicio, porque el endpoint filtraba por `event.date >= now`. El usuario no podía acceder desde la home para subir fotos u otras acciones mientras la partida estaba en curso.
- Corregido el backend para traer eventos con una ventana de 24h hacia atrás y filtrar en código comparando la hora de **fin** (`startTime + duración`) con la hora actual.
- En el frontend se añade la función `getEffectiveStatus` que calcula si una partida está "En curso" comparando la hora actual con el intervalo inicio-fin, mostrando el badge "En curso" (ámbar) aunque el status en BD siga siendo `SCHEDULED`.

**Archivos modificados:**
- `server/src/controllers/statsController.ts` — `getUserUpcomingEvents` filtra por hora de fin
- `client/src/components/dashboard/UpcomingEventsCard.tsx` — `getEffectiveStatus` para badge "En curso"

---

#### Eliminación de participantes permitida hasta el final del día del evento

- El backend bloqueaba la eliminación de un participante en cuanto pasaba la hora de inicio del evento (`eventDate <= now`). En la práctica esto impedía corregir la lista de asistentes si alguien avisaba tarde o no se presentaba.
- Cambiada la validación para permitir eliminar participantes hasta las 23:59:59 UTC del día del evento. A partir del día siguiente se bloquea.

**Archivos modificados:**
- `server/src/controllers/eventController.ts` — validación en `removeParticipant`

---

#### Enlace a BoardGameGeek en la modal de info del juego

- Al abrir la modal de información de un juego desde el detalle de un evento, ahora aparece al pie un enlace "Ver en BoardGameGeek" junto al logo "Powered by BGG", ambos enlazando a la página del juego en BGG. Solo aparece si el evento tiene `bggId`.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — enlace y logo BGG al pie de la modal de juego

---

#### Vista lista de eventos: acordeón por día con color por día de la semana

- La vista lista del calendario de eventos mostraba todas las partidas en un grid continuo sin separación visual por día, lo que dificultaba distinguir qué partidas eran de cada jornada.
- Se implementa un acordeón: cada día agrupa sus partidas bajo una cabecera coloreada según el día de la semana (lunes azul, martes morado, miércoles verde, jueves amarillo, viernes rojo, sábado teal, domingo naranja). El primer día aparece desplegado y el resto plegados. Cada día se puede plegar/desplegar de forma independiente.

**Archivos modificados:**
- `client/src/pages/Events.tsx` — agrupación por día, acordeón y colores

---

#### Mejoras en la galería de fotos del evento

- El botón de eliminar foto ahora abre una modal de confirmación antes de proceder, evitando borrados accidentales.
- Se añade un botón "Cerrar" explícito en la modal de visualización de foto.
- Se añade un botón de descarga (icono flecha hacia abajo) que permite guardar la foto directamente.

**Archivos modificados:**
- `client/src/components/events/EventPhotoGallery.tsx` — modal de confirmación, botón cerrar y botón descarga

---

#### CORS: origen de staging añadido a la lista permitida

- El entorno de staging no podía conectar con la API porque `clubdn-web-staging.up.railway.app` no estaba en la lista de `allowedOrigins` del backend.

**Archivos modificados:**
- `server/src/index.ts` — añadido origen de staging

---

#### Dos bugs en `completePassedEvents` que impedían el cierre automático de eventos

**Bug 1 — Desfase UTC en el cálculo de hora de fin:**
La función reconstruía la hora de fin haciendo `new Date(event.date)` + `setHours(startHour, startMinute)`, lo que sobreescribía la hora del timestamp UTC con la hora local del evento, produciendo un desfase de 2 horas (UTC+2 en horario de verano). El resultado era que eventos como "Coimbra 17:00-20:00" se calculaban como finalizados a las 22:00 UTC (00:00 hora española) en lugar de a las 18:00 UTC (20:00 hora española). Corregido usando directamente `event.date.getTime() + durationMinutes * 60 * 1000`, ya que la BD almacena la hora de inicio ya convertida a UTC.

**Bug 2 — `disputeAsked: true` bloqueaba el cierre del evento:**
Si por cualquier motivo un evento tenía `disputeAsked: true` pero seguía en estado SCHEDULED (caso real en producción), el `continue` impedía que se marcara como COMPLETED. Separada la lógica: el status se actualiza siempre; la notificación al organizador solo se envía si `disputeAsked` era `false`.

**Archivos modificados:**
- `server/src/controllers/statsController.ts` — función `completePassedEvents`

---

## 2026-04-03 (sesión 1)

### Nuevas funcionalidades

#### Cron job de cierre automático de eventos

- Los eventos pasaban a COMPLETED solo cuando un admin lo hacía manualmente. La lógica `completePassedEvents` ya existía en `statsController.ts` pero nunca se llamaba de forma autónoma.
- Se añade un cron job con `node-cron` que ejecuta `completePassedEvents` cada hora en punto. Al arrancar el servidor se registra el job (solo fuera de entorno `test`).
- El proceso marca como COMPLETED todos los eventos cuya hora de fin ya ha pasado, y envía la notificación `EVENT_DISPUTE_CONFIRMATION` al organizador para que confirme si la partida se disputó. La lógica `disputeAsked` evita notificaciones duplicadas.
- Esto hace que las estadísticas de "Partidas jugadas" y "Eventos asistidos" se actualicen sin intervención manual.

**Archivos modificados/añadidos:**
- `server/src/jobs/eventCompletionJob.ts` — nuevo, registra el cron `0 * * * *`
- `server/src/controllers/statsController.ts` — `completePassedEvents` exportada
- `server/src/index.ts` — llama a `startEventCompletionJob()` al arrancar el servidor
- `server/package.json` + `server/package-lock.json` — dependencia `node-cron ^4.2.1` + tipos

### Correcciones

#### Filtro de socios en compartir por WhatsApp

- El mensaje "Hay socios apuntados" se mostraba también cuando había colaboradores apuntados, ya que la condición comprobaba cualquier valor en `membership.type`. Corregido para que solo aparezca cuando hay al menos un participante con `type === 'SOCIO'`.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — condición `hasSocios` ajustada

---

## 2026-04-02 (sesión 8)

### Correcciones

#### DNI opcional en invitaciones

- El campo DNI/NIE al crear una invitación pasa de obligatorio a opcional. Si se rellena, se sigue validando el formato; si se deja vacío, la invitación se crea igualmente.
- La comprobación de límite anual por invitado (`inviteMaxGuestYear`) ahora solo se ejecuta si se ha proporcionado DNI, evitando consultas innecesarias a la BD.
- El campo `guestDniNormalized` (y `guestPhone`, que almacenaba el mismo valor) se guarda como `null` cuando no se facilita.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — label cambiado a "DNI / NIE (opcional)", validación y `disabled` del botón actualizados
- `server/src/controllers/invitationController.ts` — validación, conteo anual y guardado condicionales al valor del DNI

### Nuevas funcionalidades

#### Tablón de anuncios

- Se añade un sistema de anuncios gestionado por admins/super admins, accesible para todos los usuarios registrados.
- Los anuncios pueden tener título opcional, contenido, y opción de fijarlos arriba. Al publicar uno se genera automáticamente una notificación global para todos los usuarios.
- El menú de navegación "Feedback" se renombra a **"Comunidad"** y pasa a ser un desplegable con dos opciones: "Sugerencias y reportes" (antes "Feedback") y "Tablón de anuncios". El cambio aplica tanto en desktop como en móvil.
- El panel de administración incluye una nueva sección "Tablón de anuncios" (`/admin/announcements`) para crear, editar, eliminar y fijar anuncios.

**Archivos modificados/añadidos:**
- `server/prisma/schema.prisma` — modelo `Announcement` + enum `ANNOUNCEMENT_CREATED` en `NotificationType`
- `server/src/controllers/announcementController.ts` — nuevo, CRUD completo
- `server/src/routes/announcementRoutes.ts` — nuevo, rutas `GET/POST/PUT/DELETE /api/announcements`
- `server/src/index.ts` — registro de `announcementRoutes`
- `server/src/services/notificationService.ts` — función `notifyNewAnnouncement`
- `client/src/types/announcement.ts` — nuevo, tipos `Announcement` y `AnnouncementFormData`
- `client/src/pages/Announcements.tsx` — nuevo, vista pública `/anuncios`
- `client/src/pages/admin/Announcements.tsx` — nuevo, gestión admin
- `client/src/components/layout/Header.tsx` — menú "Comunidad" (desplegable desktop + acordeón móvil)
- `client/src/App.tsx` — rutas `/anuncios` y `/admin/announcements`

#### Pantalla de inicio configurable tras login

- El usuario puede elegir en su perfil a qué pantalla aterriza después de hacer login: **Inicio** o **Calendario**. La preferencia se guarda al instante (igual que las notificaciones) y se aplica en el siguiente login. Si existe un `?redirect=` explícito en la URL, se respeta sobre la preferencia del usuario.

**Archivos modificados:**
- `server/prisma/schema.prisma` — campo `defaultScreen String @default("home")` en `UserProfile`
- `server/src/controllers/profileController.ts` — acepta y guarda `defaultScreen`
- `client/src/types/profile.ts` — campo `defaultScreen` en `UserProfile` y `UpdateProfileData`
- `client/src/pages/Profile.tsx` — sección "Pantalla de inicio" con botones Inicio/Calendario
- `client/src/pages/Login.tsx` — tras login sin redirect explícito, consulta el perfil y navega según `defaultScreen`

#### Privacidad en compartir evento por WhatsApp

- Al compartir un evento por WhatsApp se eliminan los datos personales de los participantes (nombres, tipo de membresía, invitados). Ahora solo se indica "Hay socios apuntados" si hay al menos un socio confirmado.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — función `handleShareWhatsApp`, bloque de participantes

---

## 2026-04-02 (sesión 7)

### Refactorización

#### Modelo de notificaciones global para eventos — de N filas a 1

- La tabla `Notification` acumulaba ~310 filas por cada evento creado (una por usuario). Con 100 usuarios activos en el primer día ya había 3.000+ filas, con riesgo de crecimiento exponencial.
- Se introduce un modelo de **notificación global**: al crear un evento se genera 1 sola fila en `GlobalNotification`. El estado de lectura/descarte de cada usuario se registra bajo demanda en `GlobalNotificationRead` (solo cuando el usuario interactúa con la notificación).
- El controller fusiona ambas fuentes en cada respuesta, exponiendo al cliente exactamente la misma forma de objeto (`{ id, type, title, message, metadata, read, readAt, createdAt }`). Las notificaciones globales llevan el prefijo `global_` en el `id` para que el routing interno del controller distinga entre ambos tipos sin cambios en el frontend.
- Las notificaciones 1-a-1 existentes (aprobaciones, registros, reportes, etc.) no se modifican.
- Los ~3.000 registros históricos de `EVENT_CREATED` permanecen en `Notification` y se siguen sirviendo normalmente.
- La preferencia `notifyNewEvents` pasa a filtrarse en la lectura (en lugar de en la creación), lo que permite cambiar la preferencia con efecto inmediato.

**Archivos modificados:**
- `server/prisma/schema.prisma` — modelos `GlobalNotification` y `GlobalNotificationRead` añadidos; relación `globalNotificationReads` en `User`
- `server/prisma/migrations/20260402100000_add_global_notifications/migration.sql` — migración aplicada directamente a Railway con `prisma db execute` + `migrate resolve`
- `server/src/services/notificationService.ts` — `notifyNewEvent` usa `prisma.globalNotification.create` en lugar de `createBulkNotifications`
- `server/src/controllers/notificationController.ts` — las cinco funciones (`getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `deleteNotification`) fusionan `Notification` personal y `GlobalNotification`

---

## 2026-04-02 (sesión 6)

### Nuevas funcionalidades

#### Panel de Control accesible desde el menú de administración
- La ruta `/admin/dashboard` solo era accesible desde un botón en la pantalla de inicio. Ahora aparece como primera entrada ("Panel de Control") en el menú desplegable de escritorio y en el menú hamburguesa de móvil.

**Archivos modificados:**
- `client/src/components/layout/Header.tsx` — entrada "Panel de Control" añadida al inicio de la sección admin en ambos menús

### Correcciones

#### Tooltips de configuración del club no funcionaban en móvil y se cortaban en bordes
- Los tooltips de los campos de configuración (ícono `ⓘ`) se mostraban solo con hover, que no existe en dispositivos táctiles.
- Además, al posicionarse relativos al ícono (`absolute`), se salían del viewport cuando el ícono estaba cerca de un borde.
- Convertido a posicionamiento `fixed` calculado en tiempo de render: se mide la posición del ícono con `getBoundingClientRect()` y se ajusta horizontalmente para que el tooltip no se salga por ningún lado. Un overlay transparente cierra el tooltip al tocar fuera.

**Archivos modificados:**
- `client/src/pages/admin/ClubConfig.tsx` — `Tooltip` usa `useState` + `useRef` + `fixed` con posición calculada

---

## 2026-04-02 (sesión 5)

### Nuevas funcionalidades

#### Contador de descargas en documentos
- Cada documento muestra ahora cuántas veces ha sido descargado. El contador aparece junto al botón de descarga cuando es mayor que 0.
- Al descargar un documento se llama al endpoint `POST /api/documents/:id/download` en segundo plano (no bloquea la descarga).
- El incremento es atómico en BD (`{ increment: 1 }`).

**Archivos modificados:**
- `server/prisma/schema.prisma` — campo `downloadCount Int @default(0)` en modelo `Document`
- `server/prisma/migrations/20260402000000_add_document_download_count/migration.sql` — migración SQL
- `server/src/controllers/documentController.ts` — función `trackDownload`, `downloadCount` en select de `getDocuments`
- `server/src/routes/documentRoutes.ts` — ruta `POST /:id/download`
- `client/src/pages/Documentos.tsx` — tipo `downloadCount`, llamada al endpoint en `handleDownload`, contador en UI

---

## 2026-04-01 (sesión 4)

### Correcciones

#### Login fallaba para emails con puntos por normalizeEmail() en el backend
- `express-validator` tiene un método `.normalizeEmail()` que por diseño elimina los puntos de emails de Gmail (comportamiento heredado de la política de Gmail de ignorar puntos). Esto hacía que `carlos.navarro.mallach@gmail.com` se buscase en BD como `carlosnavarromallach@gmail.com`, no se encontrase, y devolviese `invalid_credentials`.
- Eliminado `.normalizeEmail()` del middleware de validación en los endpoints `/login` y `/request-password-reset`. `.isEmail()` ya valida el formato correctamente sin transformar el valor.

**Archivos modificados:**
- `server/src/routes/authRoutes.ts` — eliminado `.normalizeEmail()` en login y request-password-reset

#### Login fallaba para emails con puntos por normalización del navegador
- Algunos navegadores y gestores de contraseñas normalizan los emails con `type="email"` quitando los puntos (comportamiento heredado de la política de Gmail). Los usuarios con puntos en su email (`carlos.navarro.mallach@gmail.com`, `ar.rabak@gmail.com`) llegaban al servidor sin puntos y no se encontraban en BD.
- Campo de email cambiado a `type="text"` + `inputMode="email"` (mantiene el teclado correcto en móvil) + `autoComplete="username"` (evita que los gestores de contraseñas normalicen el valor).

**Archivos modificados:**
- `client/src/pages/Login.tsx` — campo email de `type="email"` a `type="text"` con `inputMode` y `autoComplete`

#### Login fallaba en producción por configuración de proxy
- En Railway, todas las requests pasan por un proxy que añade el header `X-Forwarded-For`. `express-rate-limit` lanzaba un error de validación (`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`) porque Express no estaba configurado para confiar en ese header, lo que bloqueaba el login antes de llegar a verificar la contraseña.
- Añadido `app.set('trust proxy', 1)` para que Express confíe en el proxy de Railway.

**Archivos modificados:**
- `server/src/index.ts` — añadido `trust proxy`

### Mejoras

#### Ver QR de invitación desde la lista de asistentes
- Se añade un icono de lupa junto a cada invitado externo en la lista de asistentes de la partida, visible si el usuario logado tiene una invitación con QR para ese guest.
- Al hacer clic se abre un modal individual con el código QR y el enlace copiable, sin necesidad de abrir el modal de "Invitar externo".
- Soluciona el caso en que un SUPER_ADMIN creaba una invitación y no copiaba el QR en ese momento: ahora puede recuperarlo en cualquier momento desde la ficha de la partida, incluso si el evento ya ha pasado.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — estado `inviteQrModal`, icono de lupa en lista de asistentes, modal de QR individual

---

## 2026-04-01 (sesión 3)

### Correcciones

#### Invitaciones: campo DNI no llegaba al backend
- El frontend enviaba el DNI del invitado en el campo `guestDni` pero el backend lo esperaba en el campo antiguo `guestPhone` (nombre anterior cuando era teléfono). El backend rechazaba siempre con "DNI o NIE no válido" aunque el DNI fuese correcto.
- Corregido para aceptar ambos nombres (`guestDni` y `guestPhone`) por compatibilidad, usando `dniValue` internamente en toda la lógica de validación y guardado en BD.

**Archivos modificados:**
- `server/src/controllers/invitationController.ts` — lectura de `guestDni` con fallback a `guestPhone`, uso de `dniValue` en validación y creación

#### Script de reenvío de emails fallidos migrado a Brevo
- El script `send-failed-emails-gmail.js` se reescribió para usar la API REST de Brevo en lugar de SMTP de Gmail (que rechazaba silenciosamente los envíos entre cuentas Gmail).
- Añadida lista `EXCLUDED_EMAILS` para no reenviar a los admins.
- Añadido soporte a `ONLY_EMAIL` para envíos individuales de prueba.

**Archivos modificados:**
- `server/scripts/send-failed-emails-gmail.js` — reescrito para usar Brevo API

---

## 2026-04-01 (sesión 2)

### Infraestructura / Puesta en producción

#### Envío masivo de emails de bienvenida a miembros importados
- Script `server/scripts/send-welcome-emails.js` reescrito: obtiene todos los usuarios `APPROVED` de la BD (no lista hardcoded), excluye admins (`chemimartinez@gmail.com`, `ileonarroyo@gmail.com`), omite automáticamente a usuarios que ya tienen hash bcrypt (ya configuraron su contraseña), y añade delay aleatorio de 1-3s entre envíos para evitar rate limit.
- Opciones: `ONLY_EMAIL=x` para probar con un email concreto (ignora filtro de bcrypt), `INCLUDE_ACTIVE=true` para incluir también a usuarios con contraseña ya configurada, `RETRY_FAILED=true` para reintentar solo los emails que fallaron hoy (buscándolos en `EmailLog`).
- El token generado tiene 72 horas de validez.
- Se enviaron 173 emails correctamente. Los 124 restantes fallaron por rate limit diario de Resend (límite alcanzado).
- Script auxiliar `server/scripts/send-failed-emails-gmail.js`: reenvía los emails fallidos usando SMTP de Gmail (nodemailer) como alternativa cuando Resend está bloqueado. Lee los emails fallidos del día desde `EmailLog`.
- Script auxiliar `server/scripts/failed-emails.txt`: lista de los 124 emails pendientes de recibir el correo de bienvenida.

**Archivos nuevos/modificados:**
- `server/scripts/send-welcome-emails.js` — reescrito completo
- `server/scripts/send-failed-emails-gmail.js` — nuevo, envío por Gmail SMTP
- `server/scripts/failed-emails.txt` — lista de emails pendientes

#### Corrección de URL en emails (`CLIENT_URL`)
- La variable `CLIENT_URL` en `server/.env` apuntaba a `localhost:5173`. Actualizada a `https://app.clubdreadnought.org` para que los enlaces de reset de contraseña en los emails apunten a producción.

**Archivos modificados:**
- `server/.env` — `CLIENT_URL` corregida

#### Corrección de texto en email de reset de contraseña
- El email de reset indicaba "expirará en 1 hora" pero el token se generaba con 72h de validez. Corregido a "72 horas".

**Archivos modificados:**
- `server/src/services/emailService.ts` — texto del aviso de expiración

#### Bloqueo temporal de funcionalidades dependientes de email
- Añadida variable `EMAIL_DISABLED=true` en `server/.env` para deshabilitar temporalmente las funcionalidades que requieren envío de email, mientras Resend está bloqueado por rate limit.
- **Registro de usuarios**: bloqueado (503) con mensaje "El registro está temporalmente deshabilitado. Inténtalo de nuevo en unas horas."
- **Recuperación de contraseña**: bloqueada (503) con mensaje similar.
- **Aprobación de usuarios pendientes**: bloqueada (503) con mensaje que explica que el email no está disponible.
- **Rechazo de usuarios pendientes**: ídem.
- **Reportes**: funcionan con normalidad. El email a admins se omite silenciosamente; el mensaje de respuesta avisa de que no se notificará por email temporalmente.
- El frontend de `PendingApprovals` ahora muestra el mensaje real del servidor en el toast de error (en lugar de uno hardcodeado genérico).
- Para reactivar: cambiar `EMAIL_DISABLED=false` en Railway y hacer redeploy.

**Archivos modificados:**
- `server/.env` — `EMAIL_DISABLED=true`
- `server/src/controllers/authController.ts` — bloqueo en `register` y `requestPasswordReset`
- `server/src/controllers/adminController.ts` — bloqueo en `approveUser` y `rejectUser`
- `server/src/controllers/reportController.ts` — omisión de emails con mensaje informativo
- `client/src/pages/admin/PendingApprovals.tsx` — mensaje de error del servidor en toast

---

## 2026-04-01

### Correcciones

#### Build: campo `type` obligatorio en `FinancialCategory`
- Al añadir `type` como campo requerido en el schema, dos sitios del servidor no lo incluían al crear categorías: `financialController.ts` (`createCategory`) y el seed TypeScript `seedFinancialCategories.ts`. Corregidos para incluir `type: 'GASTO'` por defecto.

**Archivos modificados:**
- `server/src/controllers/financialController.ts` — `type` añadido al `create` de categoría
- `server/src/scripts/seedFinancialCategories.ts` — `type: 'GASTO'` añadido al `create`

### Mejoras

#### Sesión sin caducidad automática
- El token JWT de login pasa de 7 días a 365 días. La sesión solo termina cuando el usuario cierra sesión manualmente. Los usuarios existentes con token de 7 días deberán volver a hacer login cuando venza.

**Archivos modificados:**
- `server/src/controllers/authController.ts` — `expiresIn: '7d'` → `'365d'`

#### Balance financiero agrupado por tipo
- La tabla de Balance Anual en `/financiero` ahora muestra las categorías agrupadas: primero **Ingresos** (cabecera en verde) y luego **Gastos** (cabecera en rojo), cada grupo con su fila de subtotal. El total global permanece al final.
- El backend ahora incluye el campo `type` en la respuesta del balance para permitir la agrupación.

**Archivos modificados:**
- `server/src/controllers/financialController.ts` — `type` incluido en el select del balance
- `client/src/pages/Financiero.tsx` — tabla agrupada con cabeceras y subtotales por tipo

### Administración

#### Límites de invitaciones editables desde configuración del club
- La página `/admin/config` incluye una nueva sección "Límites de Invitaciones" con los cuatro parámetros editables: máx. activas simultáneas, máx. por mes, máx. veces al mismo invitado por año y permitir autovalidación.
- Cada campo muestra un tooltip (icono ⓘ) con la explicación exacta del comportamiento del límite, visible al pasar el ratón o pulsar en móvil.
- Los valores se guardan en `ClubConfig` a través del endpoint existente `PUT /api/config`.

**Archivos modificados:**
- `client/src/pages/admin/ClubConfig.tsx` — nueva sección con campos numéricos, checkbox y tooltips inline
- `client/src/types/config.ts` — campos `inviteMaxActive`, `inviteMaxMonthly`, `inviteMaxGuestYear`, `inviteAllowSelfValidation` añadidos a `ClubConfig` y `ClubConfigUpdate`

#### Historial de invitaciones (`/admin/invitations`)
- Nueva página de administración con el registro completo de todas las invitaciones del club.
- Muestra: nombre del invitado, DNI enmascarado, socio invitador (con nick si lo tiene), evento asociado, fecha de validez, estado (con color) y quién validó la entrada.
- Búsqueda en tiempo real por nombre de invitado o nombre de socio (debounce 400ms).
- Paginación de 50 registros por página.
- Nuevo endpoint `GET /api/invitations/admin/history` (solo admin) con filtros por búsqueda y paginación.
- Enlace añadido en el menú de Administración (desktop y móvil).

**Archivos nuevos/modificados:**
- `client/src/pages/admin/InvitationHistory.tsx` — nueva página
- `client/src/App.tsx` — ruta `/admin/invitations`
- `client/src/components/layout/Header.tsx` — enlace en menú admin (desktop y móvil)
- `server/src/controllers/invitationController.ts` — función `getInvitationHistory`
- `server/src/routes/invitationRoutes.ts` — `GET /admin/history`

#### Categorías financieras agrupadas por tipo en la vista Categorías
- La pestaña "Categorías" de `/financiero` ahora muestra dos bloques separados: **Ingresos** (en verde) y **Gastos** (en rojo), en lugar de una lista plana sin distinción.
- Al crear una nueva categoría, el tipo (Gasto/Ingreso) es seleccionable y el color por defecto se ajusta automáticamente al tipo elegido.

**Archivos modificados:**
- `client/src/pages/Financiero.tsx` — agrupación por `type`, campo `type` en el formulario de nueva categoría

### Infraestructura / Puesta en producción

#### Importación de miembros desde el sistema anterior
- Añadidos campos `joinedAt`, `iban` a `UserProfile` y enum `FinancialCategoryType` + campo `type` a `FinancialCategory` en el schema de Prisma. Cambios aplicados con `db push`.
- Script `server/scripts/import-members.js`: importa todos los socios desde el CSV exportado del sistema anterior. Crea `User` + `UserProfile` + `Membership` en una transacción por miembro. Deduplica por email (gana la última aparición). El usuario `chemimartinez@gmail.com` es intocable. Todos los usuarios se crean con `status: APPROVED` y `emailVerified: true`; la contraseña es aleatoria y no usable hasta que el socio haga "olvidé mi contraseña".
- Script `server/scripts/import-missing-members.js`: inserta los 2 miembros que carecían de email en el CSV (`Joel Bayona Belenguer` y `Carlos Cano Genoves`), una vez localizados sus emails.
- Resultado: 311 miembros importados, 0 errores.

#### Limpieza de BD antes de producción
- Script `server/scripts/clean-for-production.js`: vacía todas las tablas de datos de prueba (analítica, notificaciones, badges, partidas, eventos, reportes, finanzas, pagos, documentos) y elimina todos los usuarios excepto `chemimartinez@gmail.com`. Ejecutado satisfactoriamente contra Railway.
- Script SQL equivalente `server/scripts/clean-for-production.sql` conservado como referencia.

#### Seed de categorías financieras
- Script `server/scripts/seed-financial-categories.js`: inserta las 22 categorías iniciales (18 gastos + 4 ingresos) con sus emojis y colores. Ejecutado tras la limpieza.
- Categorías de gasto: Alquiler 🏠, Iberdrola ⚡, Agua 💧, Internet 🌐, Limpieza 🧹, Seguro 🛡️, Compra 🛒, Extintores 🧯, IRPF 📋, Obras 🔨, Mant. - Bricolaje/Ferreteria 🔧, Mat. Papeleria 📝, Mobiliario 🪑, Gastos Bancarios 🏦, Juegos/Mat. Ludico (Gasto) 🎲, Servicios Online 💻, Adecuación nuevo local 🏗️, Salida a Caja (Pagos de Mano) 💵.
- Categorías de ingreso: Cuotas Socios 👥, Cuotas Colaboradores 🤝, Otros Ingresos 💰, Juegos/Mat. Ludico (Venta) 🎲.

**Archivos nuevos/modificados:**
- `server/prisma/schema.prisma` — `joinedAt`, `iban` en `UserProfile`; enum `FinancialCategoryType`; campo `type` en `FinancialCategory`
- `server/scripts/import-members.js` — script de importación masiva desde CSV
- `server/scripts/import-missing-members.js` — inserción puntual de 2 miembros sin email
- `server/scripts/clean-for-production.js` — limpieza de BD para producción
- `server/scripts/clean-for-production.sql` — equivalente SQL del anterior
- `server/scripts/seed-financial-categories.js` — seed de categorías financieras
- `server/scripts/seed-financial-categories.sql` — equivalente SQL del anterior

---

## 2026-03-29

### Seguridad

#### hCaptcha en login y registro
- Añadido widget hCaptcha (checkbox) en las páginas de login y registro. El botón de envío queda deshabilitado hasta que el usuario completa la verificación.
- En login, el captcha se adapta al tema claro/oscuro. Tras cada intento fallido el captcha se resetea automáticamente.
- El backend verifica el token con la API de hCaptcha (`api.hcaptcha.com/siteverify`) antes de procesar las credenciales. Si no se envía token o la verificación falla, devuelve 400.
- Variables requeridas: `VITE_HCAPTCHA_SITE_KEY` (frontend) y `HCAPTCHA_SECRET` (backend).

**Archivos modificados:**
- `client/src/pages/Login.tsx` — widget HCaptcha, botón deshabilitado sin token, reset tras fallo
- `client/src/pages/Register.tsx` — ídem
- `client/src/contexts/AuthContext.tsx` — firma de `login` actualizada para pasar `hcaptchaToken`
- `client/src/types/auth.ts` — campo `hcaptchaToken` en `LoginData`
- `server/src/controllers/authController.ts` — función `verifyHcaptcha`, verificación en `login` y `register`

#### Rate limiting en login (bloqueo escalonado por intentos fallidos)
- Tras demasiados intentos fallidos con el mismo email, el acceso queda bloqueado temporalmente:
  - 3 fallos → 30 segundos
  - 6 fallos → 5 minutos
  - 10 fallos → 15 minutos
- El contador se resetea tras un login exitoso.
- Cuando quedan 1 o 2 intentos antes del siguiente bloqueo, el backend incluye un aviso en la respuesta que se muestra en amarillo en el frontend.
- Mientras dura el bloqueo, el frontend muestra una cuenta atrás en segundos y el botón permanece deshabilitado.
- El bloqueo opera en el backend (por email), no solo en el cliente.

**Archivos modificados:**
- `server/src/services/loginAttemptService.ts` — función `checkLoginRateLimit` con escala de bloqueos
- `server/src/controllers/authController.ts` — comprobación de rate limit antes de validar credenciales, `warningMessage` en respuestas de fallo
- `client/src/pages/Login.tsx` — cuenta atrás de freeze, banner de aviso amarillo

### Correcciones

#### Tipos TypeScript desincronizados tras cambio de teléfono a DNI
- Los tipos `Invitation`, `PendingInvitation` y `CreateInvitationPayload` todavía referenciaban `guestPhone`/`guestPhoneMasked`. Actualizados a `guestDni`/`guestDniMasked` para alinearlos con el backend.
- La página `InviteValidation.tsx` también mostraba "Tel." con el campo antiguo; corregido a "DNI:".

**Archivos modificados:**
- `client/src/types/invitation.ts` — `guestPhoneMasked` → `guestDniMasked`, `guestPhone` → `guestDni`
- `client/src/types/event.ts` — `guestPhoneMasked` → `guestDniMasked` en `PendingInvitation`
- `client/src/pages/InviteValidation.tsx` — label "Tel." → "DNI:" y campo actualizado

### Mejoras

#### Validación de DNI/NIE al invitar a un externo a una partida
- El campo para identificar al invitado vuelve a pedir el DNI o NIE (en lugar del teléfono).
- Se valida el formato completo, incluyendo la letra de control, usando el algoritmo oficial: para DNI se comprueba `letra = 'TRWAGMYFPDXBNJZSQVHLCKE'[número % 23]`; para NIE se reemplaza el prefijo X→0, Y→1, Z→2 antes del cálculo.
- La validación se realiza tanto en el frontend (botón deshabilitado si no es válido) como en el backend (error 400 si no pasa la validación antes de crear la invitación).

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — renombrado `guestPhone`→`guestDni`, función `isValidDniNie`, label/placeholder/maxLength actualizados
- `server/src/controllers/invitationController.ts` — `isValidDniNie` con algoritmo oficial, `maskDni`, mensaje de error actualizado

#### "Consejo del día" no aparece en páginas de autenticación
- El modal de consejo del día se mostraba al cargar la página de reseteo de contraseña tras un login. Corregido excluyendo las rutas `/reset-password`, `/login`, `/register`, `/verify-email` y `/forgot-password`.

**Archivos modificados:**
- `client/src/App.tsx` — `NO_TIP_PATHS` y comprobación de `pathname` en `TipController`

---

## 2026-03-28

### Mejoras

#### Enlace de invitación por WhatsApp redirige al login si no hay sesión
- Al abrir el enlace compartido, si el usuario no está autenticado se le redirige al login. Tras hacer login es llevado automáticamente a la página del evento para apuntarse.
- El login acepta el parámetro `?redirect=` para recordar el destino tras autenticarse.
- Eliminado el formulario de "solicitar plaza como invitado anónimo" de la página de enlace compartido, ya que el flujo es exclusivo para socios registrados.

**Archivos modificados:**
- `client/src/pages/JoinViaShareLink.tsx` — reescrito para redirigir al login o al evento según sesión
- `client/src/pages/Login.tsx` — navega a `?redirect=` tras login exitoso

#### Modal de confirmación para "Cerrar plazas"
- El botón de cerrar plazas usaba `window.confirm` nativo (diálogo del sistema). Reemplazado por un modal con el mismo estilo visual que el resto de confirmaciones de la página.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — nuevo estado `isCloseCapacityModalOpen` y modal de confirmación

---

## 2026-03-26

### 🐛 Correcciones

#### Botón de compartir por WhatsApp no hacía nada
- El navegador bloqueaba el `window.open` porque se llamaba tras un `await` (fuera del manejador directo del click). Corregido abriendo WhatsApp de forma síncrona con la URL del evento como fallback, e intentando actualizar a la URL personalizada una vez resuelta la petición.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — `handleShareWhatsApp` reestructurado para abrir el popup antes del `await`

#### Sección de validación QR no aparecía antes de que empezara la partida
- La sección usaba `isPast` (partida ya comenzada) en lugar de la ventana temporal real (desde 1h antes del inicio). Corregido calculando en el cliente la misma ventana que usa el backend.

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` — `canValidateQr` e `isInValidationWindow` calculados con la ventana temporal correcta

---

### Validación de partidas por QR y logro VALIDADOR

#### Sistema de validación cruzada por QR
- Cada jugador inscrito en una partida puede mostrar su QR personal en la página de detalle del evento (visible solo si la partida ya ocurrió y no está aún validada).
- Cuando un jugador escanea el QR del otro, se llama a `POST /api/events/:eventId/validate-qr/:scannedUserId`. El sistema verifica que ambos están inscritos como CONFIRMED y que el evento ya ocurrió.
- La primera validación QR marca la partida como disputada (`disputeResult: true`), cancela la notificación de disputa pendiente al organizador y procesa el `GamePlayHistory` y badges de categoría de juego para todos los inscritos.
- La validación solo está disponible desde **1 hora antes del inicio** hasta el **final del día en que termina la partida**. Fuera de esa ventana el endpoint devuelve error.
- La operación es idempotente: si la misma pareja ya validó, devuelve `alreadyValidated: true` sin error.
- Página nueva `/validate-game/:eventId/:scannedUserId` que ejecuta la validación automáticamente al abrirse (la que recibe el usuario que escanea el QR).

#### Logro VALIDADOR (6 niveles: 5, 10, 20, 40, 70, 100 partidas)
- Testigo Presencial / Fedatario del Dado / Oficial de Actas / Inspector del Tablero / Gran Notario Lúdico / Guardián del Resultado
- Cuenta partidas únicas en las que el usuario participó en una validación QR (como scanner o como escaneado).
- Añadida la categoría `VALIDADOR` al enum `BadgeCategory` en schema Prisma y en los tipos/helpers del cliente.

**Archivos modificados:**
- `server/prisma/schema.prisma` — modelo `GameValidation`, categoría `VALIDADOR` en enum, relaciones en `User` y `Event`
- `server/prisma/seeds/badgeDefinitions.ts` — 6 nuevos badges VALIDADOR
- `server/src/controllers/eventController.ts` — función `validateGameQr`
- `server/src/controllers/badgeController.ts` — contador VALIDADOR en `getCategoryCount`, nombre en helper
- `server/src/routes/eventRoutes.ts` — ruta `POST /:eventId/validate-qr/:scannedUserId`
- `client/src/types/badge.ts` — tipo, display name, color e icono para VALIDADOR
- `client/src/pages/EventDetail.tsx` — sección de QR de validación para participantes
- `client/src/pages/ValidateGame.tsx` — página nueva que recibe el escaneo
- `client/src/App.tsx` — ruta `/validate-game/:eventId/:scannedUserId`

---

## 2026-03-26

### 🐛 Correcciones

#### Badges — categorías ORGANIZADOR y REPETIDOR sin nombre
- Las categorías `ORGANIZADOR` y `REPETIDOR` existían en la base de datos pero no estaban declaradas en el tipo `BadgeCategory` ni en los helpers de `badge.ts`, por lo que su nombre aparecía vacío en la cabecera de cada grupo de logros.
- Añadidas ambas categorías al tipo, a `getCategoryDisplayName`, `getCategoryColor` y `getCategoryIcon`.

**Archivos modificados:**
- `client/src/types/badge.ts` — tipo y helpers actualizados

---

## 2026-03-25

### 🐛 Correcciones

#### Modal de confirmación de disputa — correcciones post-prueba
- Corregido error TypeScript `TS1005` en `NotificationBell.tsx` por JSX con dos raíces (faltaba fragmento `<>` envolvente).
- Al responder a la pregunta de disputa, ahora se muestra un mensaje de agradecimiento ("Gracias por tu respuesta...") antes de cerrar el modal, en vez de cerrar directamente.
- Si el organizador intenta responder de nuevo a una disputa ya confirmada, el modal muestra "Ya respondiste a esta pregunta anteriormente" en vez de un error genérico.
- La notificación `EVENT_DISPUTE_CONFIRMATION` se elimina automáticamente en el backend al confirmar la respuesta, evitando que vuelva a aparecer.
- El botón "Sí, se jugó" usaba `bg-primary` (clase Tailwind sin efecto en v4); corregido a `bg-[var(--color-primary)]` para compatibilidad con todos los temas.

**Archivos modificados:**
- `client/src/components/notifications/NotificationBell.tsx` — fragmento JSX envolvente
- `client/src/components/notifications/DisputeConfirmationModal.tsx` — estados `answered` y `alreadyAnswered`, mensaje de agradecimiento, color de botón
- `server/src/controllers/eventController.ts` — eliminación de notificación tras confirmar en `confirmEventPlayed` y `confirmEventNotPlayed`

#### Ficha de miembro — compatibilidad con temas oscuro/claro
- Los fondos `bg-yellow-50` y `bg-blue-50` de las secciones "Tipo de Membresía" y "Cambiar foto" reemplazados por variables CSS del tema.
- Los inputs de Nombre, Apellidos y DNI ahora usan `bg-[var(--color-cardBackground)]` para no mostrar fondo blanco en temas oscuros.
- Añadido `shrink-0` a los checkboxes de autorización para que tengan tamaño uniforme independientemente de la longitud del texto.

**Archivos modificados:**
- `client/src/pages/admin/Members.tsx` — colores hardcoded reemplazados por variables CSS, inputs y checkboxes corregidos

---

## 2026-03-24

### ✨ Nuevas funcionalidades

#### Score de fidelidad de miembros (solo admins)
- El modal de ficha de miembro en el panel de administración muestra ahora una sección "Fidelidad" con dos métricas:
  - **Tasa de respuesta** (organizador): porcentaje de eventos organizados en los que el organizador respondió a la pregunta de disputa. Mide responsabilidad, no éxito.
  - **Tasa de asistencia** (participante): porcentaje de participaciones confirmadas sobre el total de participaciones + cancelaciones.
- Ambas métricas muestran `—` cuando no hay datos suficientes (primer uso).
- Los conteos brutos acompañan cada porcentaje para dar contexto.

**Archivos modificados:**
- `server/src/controllers/memberController.ts` — `getMemberProfile` calcula y devuelve `reliability`
- `client/src/types/members.ts` — nueva interfaz `MemberReliability`, añadida a `MemberProfileDetails`
- `client/src/pages/admin/Members.tsx` — sección "Fidelidad" en el modal de ficha de miembro

#### Sistema de confirmación de disputa de partidas (frontend)
- Al hacer clic en una notificación de tipo `EVENT_DISPUTE_CONFIRMATION`, se abre un modal directamente en vez de navegar a ninguna página.
- El modal muestra el título de la partida y dos botones: "Sí, se jugó" y "No llegó a jugarse".
- Tras responder, la notificación desaparece de la lista automáticamente. Si el organizador prefiere responder más tarde, puede cerrar el modal sin consecuencias.
- Icono ❓ para este tipo de notificación en el dropdown.

**Archivos creados/modificados:**
- `client/src/api/events.ts` — nuevo: funciones `confirmEventPlayed` y `confirmEventNotPlayed`
- `client/src/components/notifications/DisputeConfirmationModal.tsx` — nuevo: modal de confirmación
- `client/src/components/notifications/NotificationBell.tsx` — soporte para `EVENT_DISPUTE_CONFIRMATION`

#### Sistema de confirmación de disputa de partidas (backend)
- Cuando una partida pasa su fecha y hora de finalización, el sistema ya no la marca automáticamente como completada con historial. En su lugar, notifica al organizador preguntándole si la partida llegó a disputarse.
- El organizador recibe una notificación de tipo `EVENT_DISPUTE_CONFIRMATION` con el texto "¿Se disputó esta partida?" y puede responder desde la app.
- Si confirma que **sí se jugó**: se registra el historial de partidas (`GamePlayHistory`) y se desbloquean badges para todos los participantes confirmados.
- Si confirma que **no se jugó**: no se registra historial ni se otorgan badges. La partida queda marcada como completada pero sin disputa.
- Campo `disputeAsked` evita que se pregunte más de una vez por el mismo evento.
- Base: para medir la **tasa de respuesta** del organizador (fiabilidad), visible en el panel de admin en fases posteriores.

**Archivos modificados:**
- `server/prisma/schema.prisma` — 3 campos nuevos en `Event` (`disputeAsked`, `disputeConfirmedAt`, `disputeResult`) + nuevo `NotificationType.EVENT_DISPUTE_CONFIRMATION`
- `server/src/controllers/statsController.ts` — `completePassedEvents` ahora notifica en vez de crear historial directamente; nueva función exportada `processEventPlayHistory`
- `server/src/services/notificationService.ts` — nueva función `notifyEventDisputeConfirmation`
- `server/src/controllers/eventController.ts` — nuevos controladores `confirmEventPlayed` y `confirmEventNotPlayed`
- `server/src/routes/eventRoutes.ts` — rutas `POST /api/events/:id/confirm-played` y `POST /api/events/:id/confirm-not-played`

---

## 2026-03-23

### ✨ Nuevas funcionalidades

#### Efecto de partículas en el login configurable por superadmin
- El fondo animado de la pantalla de login ahora soporta tres estilos: **Blanco** (original), **Neón** (cian, magenta, violeta, azul eléctrico y verde con efecto glow), y **Tema** (colores primarios del tema activo del club)
- El superadmin puede cambiar el estilo desde **Administración → Configuración del Club → Personalización Visual** sin necesidad de despliegue
- El valor se persiste en base de datos y se sirve a través de un nuevo endpoint público `GET /api/config/public` (sin autenticación, ya que el login no tiene usuario)

**Archivos modificados/creados:**
- `client/src/pages/Login.tsx` — lógica multiestilo en el canvas, query a `/api/config/public`
- `client/src/pages/admin/ClubConfig.tsx` — nueva card "Personalización Visual" con selector de 3 estilos
- `client/src/types/config.ts` — tipos `LoginParticleStyle` y `PublicConfig`
- `server/src/controllers/configController.ts` — nuevo handler `getPublicConfig`, `updateClubConfig` acepta `loginParticleStyle`
- `server/src/routes/configRoutes.ts` — ruta pública `GET /config/public`
- `server/prisma/schema.prisma` — campo `loginParticleStyle String @default("white")` en `ClubConfig`
- `server/prisma/migrations/20260323000000_add_login_particle_style/migration.sql` — migración aplicada

---

## 2026-03-13

### ✨ Nuevas funcionalidades

#### Juego Viernes — tableros visuales con cartas superpuestas
- Los tres tableros físicos del juego (amarillo, azul y niveles de peligro) se muestran ahora como imágenes reales con las cartas renderizadas encima en sus posiciones correctas
- Disposición vertical: un tablero por fila, totalmente responsive (`max-w-sm` centrado)
- **Tablero amarillo**: mazo de peligros apilado e inclinado (arriba derecha), descarte de Robinson boca arriba (abajo izquierda), mazo de Robinson boca abajo (abajo derecha); cada pila muestra un contador numérico
- **Tablero azul**: mazo de envejecimiento boca abajo con contador naranja, descarte aging boca arriba
- **Tablero de niveles**: tres franjas (verde/amarillo/rojo) con la activa animada (`animate-pulse ring-2 ring-white`), las superadas oscurecidas y las futuras semitransparentes

**Archivos modificados/creados:**
- `client/public/viernes/tableroamarillo.jpg` - imagen del tablero Robinson/peligros
- `client/public/viernes/tableroazul.jpg` - imagen del tablero de envejecimiento
- `client/public/viernes/tableronivelespeligros.jpg` - imagen del tablero de niveles
- `client/src/components/combatzone/viernes/ViernesBoardVisual.tsx` - nuevo: componentes `TableroAmarillo`, `TableroAzul`, `TableroNiveles` con posicionamiento absoluto porcentual
- `client/src/components/combatzone/viernes/ViernesBoard.tsx` - reemplaza el panel de estado textual por `ViernesBoardVisual`

#### Juego Viernes — habilidades especiales de cartas completamente implementadas
- Todas las habilidades especiales de las cartas de Robinson (ganadas al superar peligros) y de Comiendo se aplican al robarlas durante el combate

**Habilidades automáticas** (sin interacción, efecto inmediato al robar):
- `+2 vida` (Comiendo): recupera 2 puntos de vida
- `+1 vida` (Nutrición): recupera 1 punto de vida
- `+1 carta gratis` (Experiencia): roba una carta extra sin coste
- `Destruye aging` (Truco): descarta automáticamente la carta superior del mazo de envejecimiento
- `-1 Paso dificultad` (Lectura): retrocede un paso de dificultad (ROJO→AMARILLO o AMARILLO→VERDE)

**Habilidades interactivas** (pausan el combate en fase `SKILL_PENDING` hasta que el jugador decide):
- `1x Destruir carta` (Conocimiento): elige una carta de la mano para destruirla permanentemente sin coste
- `1x Copiar valor` (Mimetismo): la carta activadora copia el valor de otra carta en la mano
- `2x Cambiar carta` (Estrategia): devuelve hasta 2 cartas de la mano y roba nuevas; se pueden usar 1 o 2 cambios
- `1x Doblar valor` (Repetición): dobla el valor de una carta en la mano durante el combate
- `Ordenar 3 cartas` (Visión): muestra las 3 próximas cartas del mazo y permite reordenarlas libremente
- Todas las habilidades interactivas tienen botón "No usar habilidad" para descartarlas

**Archivos modificados:**
- `client/src/logic/ViernesEngine.ts` - nuevos tipos `SkillEffect`, `PendingSkillType`, `PendingSkill`; fase `SKILL_PENDING`; `applyCardDrawEffect` con efectos automáticos e interactivos; 6 nuevos handlers (`handleSkillDestroy`, `handleSkillCopy`, `handleSkillSwap`, `handleSkillDouble`, `handleSkillSort`, `handleSkillSkip`); `skillEffectLabel()` y `SKILL_EFFECT_BY_NAME` exportados; `HAZARD_DEFS` actualizado con `skillEffect` en todos los peligros
- `server/src/logic/ViernesEngine.ts` - copia exacta del engine cliente
- `client/src/components/combatzone/viernes/ViernesBoard.tsx` - nuevo `SkillPendingPanel`: muestra la habilidad activa, la carta activadora y los botones por carta elegible; para Visión muestra lista reordenable con flechas ▲▼
- `server/src/controllers/viernesController.ts` - `isViernesAction` ampliado para validar los 6 nuevos tipos de acción `SKILL_*`

#### Consejo del día
- Al iniciar sesión aparece automáticamente un modal con un consejo aleatorio sobre juegos de mesa (se muestra una vez cada 24 horas máximo)
- El modal también es accesible manualmente desde el menú de usuario ("Consejo del día") tanto en escritorio como en móvil
- Dentro del modal se puede rotar el consejo ("Ver otro consejo") sin reiniciar el temporizador de 24 horas

**Archivos modificados/creados:**
- `client/src/data/tips.ts` - nuevo: 15 consejos, `getRandomTip()`, `shouldShowTip()`, `markTipShown()` (localStorage `lastTipShown`)
- `client/src/components/tips/TipOfTheDayModal.tsx` - nuevo: modal con consejo rotable
- `client/src/App.tsx` - `TipController` detecta el momento exacto de login con `useRef` y muestra el modal si han pasado más de 24h
- `client/src/components/layout/Header.tsx` - botón "Consejo del día" en menú desktop y móvil

### 🐛 Corrección de errores

#### Campo de teléfono en invitaciones (migración DNI → teléfono)
- Los formularios de invitación por enlace y el detalle de evento mostraban referencias a DNI que debían ser teléfono tras la migración anterior
- Se completan los archivos que faltaban por actualizar y se corrige un `setGuestDni` residual que causaba error de build

**Archivos modificados:**
- `client/src/pages/EventDetail.tsx` - label, estado, validación y reset cambiados a `guestPhone`
- `client/src/pages/JoinViaShareLink.tsx` - formulario usa `phone` en lugar de `dni`; payload envía `guestPhone`
- `client/src/pages/InviteValidation.tsx` - muestra `guestPhoneMasked` en lugar de `guestDniMasked`

---

## 2026-03-14

### 🔒 Seguridad

#### Cabeceras HTTP seguras con Helmet
- Se añade `helmet` como middleware global para configurar automáticamente cabeceras HTTP de seguridad: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.

**Archivos modificados:**
- `server/src/index.ts` - `app.use(helmet())`

#### Rate limiting global y específico para autenticación
- Rate limiter global: máximo 300 peticiones por IP cada 15 minutos
- Rate limiter estricto en `/api/auth`: máximo 20 peticiones por IP cada 15 minutos para proteger contra ataques de fuerza bruta

**Archivos modificados:**
- `server/src/index.ts` - `globalLimiter` y `authLimiter` con `express-rate-limit`

#### JWT_SECRET obligatorio al arrancar el servidor
- Si `JWT_SECRET` no está definido en las variables de entorno, el servidor termina inmediatamente con un error fatal en lugar de usar el fallback `'default-secret-key'`
- Se elimina el fallback inseguro del controlador de autenticación

**Archivos modificados:**
- `server/src/index.ts` - validación `process.exit(1)` si `JWT_SECRET` no está definido
- `server/src/controllers/authController.ts` - eliminado `|| 'default-secret-key'`

### 🌱 Seed de producción

#### Script `seed-prod.ts` seguro para producción
- Nuevo script que inicializa datos esenciales en la base de datos de producción sin borrar ni sobreescribir datos existentes
- Crea `ClubConfig` (tipos de membresía, moneda) y las 60 `BadgeDefinition` de todas las categorías usando `upsert` idempotente
- Seguro de re-ejecutar en cualquier momento

**Archivos creados:**
- `server/prisma/seed-prod.ts` - seed idempotente con upsert por `category_level`

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
