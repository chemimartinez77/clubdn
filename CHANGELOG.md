# 📋 Changelog - Club Dreadnought

Registro de cambios y nuevas funcionalidades implementadas en la aplicación.

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
