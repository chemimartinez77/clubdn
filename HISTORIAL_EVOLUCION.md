# Historial de Evolución — Club Dreadnought App

Documento cronológico que narra cómo ha crecido la aplicación desde el primer commit hasta hoy.
Generado el 2026-04-09. Total de commits: ~518.

---

## Fase 1 — Arranque del proyecto (13–16 dic 2025)

La aplicación nace como una herramienta interna para gestionar el Club Dreadnought.

### Primer commit: 13 de diciembre de 2025
- Se crea el README inicial del club.
- Al día siguiente se añaden el **sistema de registro de usuarios** y el **contexto de autenticación** (JWT).
- El servidor Express se inicializa con registro de usuarios y **aprobación manual por un admin**.
- Se añaden endpoints de gestión de perfil y estadísticas de usuario.

### 15 de diciembre: primer despliegue
- Se prueba despliegue en Render (varios commits de configuración de `render.yaml`).
- Se prueba también despliegue en Vercel para el frontend.
- Se añade servidor Express para servir la app React compilada en producción.
- Primeros intentos de resolver errores TypeScript y de configuración CORS.

### 16 de diciembre: sistema de temas
- Se implementa un **sistema de temas dinámicos** (3 temas iniciales) con variables CSS.
- Se añade un `ThemeSelector` en el perfil del usuario.
- Se coloca el **logo real del club** en el header.
- Se migra el despliegue de Render a **Railway** (plataforma definitiva).

---

## Fase 2 — Core de la aplicación (17–26 dic 2025)

### 17 de diciembre: catálogo de juegos + documentos
- Se añade integración con **BoardGameGeek (BGG)**: modelo `Game`, rutas, búsqueda de juegos.
- Se implementa gestión de documentos del club (subida, descarga, estadísticas).
- Imágenes de juegos cargadas desde BGG.

### 20 de diciembre: panel de administración
- Se crea la página de **directorio de miembros** en el panel de admin.
- Se añade un **seed script** para la base de datos.
- Se mejoran los filtros de membresía.
- Se añade menú desplegable de admin en el header.

### 21 de diciembre: catálogo de juegos del club
- Se añade la página **Juegos** con modal de detalle, logo BGG y búsqueda avanzada.
- Se amplían los temas (rojo, marrón).

### 22 de diciembre: configuración del club + estadísticas + secciones nuevas
- Se implementa **ClubConfig**: configuración centralizada del club (aforo, cuotas, etc.).
- Se añaden páginas esqueleto de **Ludoteca**, **Documentos** y **Financiero**.
- Se implementa el **dashboard de estadísticas** completo con múltiples métricas.
- Acceso a documentos restringido a roles admin.

### 25–26 de diciembre: ludoteca
- Se implementa la **Ludoteca** con paginación y opciones de visualización.
- Se añaden modales de detalle de juego con miniaturas desde BGG.
- Se muestra el nombre completo "Club Dreadnought" en la interfaz.

---

## Fase 3 — Sistema de partidas y calendario (ene 2026)

### 14 de enero: calendario interactivo
- El calendario mensual permite **crear partidas directamente haciendo clic en un día**.
- `CreatePartida` preselecciona la fecha al llegar desde el calendario.

### 17 de enero: sistema de invitaciones y fotos de eventos
- Se implementa el **sistema de invitaciones por QR**: los organizadores pueden invitar a personas externas con un código QR.
- Subida de **fotos de eventos** con integración a Cloudinary.
- Se añade la tarjeta de identidad de socio (modal "ID") en el menú.

### 18–19 de enero: mejoras del detalle de evento
- Lista de asistentes con badge "Invitado" para visitantes.
- Filtros de capacidad y participantes en la lista de eventos.
- Búsqueda de juegos mejorada en BGG.

### 22 de enero: acciones avanzadas en eventos
- **Compartir por WhatsApp**: mensaje con datos del evento, participantes y enlace.
- Re-registro con cooldown.
- **Eliminación de partidas** para admin/creador.
- Avatar para usuarios (subida a Cloudinary desde cualquier dispositivo).
- Vistas de calendario semanal y diaria.

### 23 de enero: email + UX del header
- Integración de **Nodemailer** para envíos de email (luego migrado a Gmail SMTP y finalmente a Resend).
- Avatar en el header con fallback a inicial.
- Confirmación de borrado de asistentes.
- Botón WhatsApp con estilo propio.

### 25 de enero: sistema de notificaciones
- Se implementa el **sistema de notificaciones** completo: backend con API, campana en header, preferencias por usuario.
- Los admins reciben notificación al registrarse un nuevo usuario.
- Se abren los pendientes directamente desde las notificaciones.

### 27 de enero: sistema de membresías + tema oscuro/claro
- **Toggle modo oscuro/claro** con doble paleta de colores.
- Se implementa el **historial de cambios de tipo de membresía** (con campo de motivo).
- El administrador puede cambiar el tipo de membresía desde el directorio.
- **Noughter**: personaje personalizable por usuario con selector de color.
- Mejoras de perfiles de usuario con campos editables.

### 28–29 de enero: sistema de logros (badges) + reportes
- Se implementa el **sistema de badges** con categorías, niveles, progreso y desbloqueo automático.
- Se añade el **sistema de reportes/feedback** (bug reports, votos, controles de admin).
- Recuperación de contraseña por email.
- Configuración de CORS para el dominio definitivo `app.clubdreadnought.org`.

### 31 de enero: mejoras de UI y Railway
- Temas de calendario mejorados (colores adaptados a cada tema).
- Validación de subida de fotos (solo dentro de la ventana de la partida).
- No se puede eliminar participantes de partidas pasadas o en curso.
- Se añade `railway.json` para el despliegue correcto.

---

## Fase 4 — Funcionalidades sociales y juegos (feb 2026)

### 3–5 de febrero: badges, onboarding y tema verde
- El tema por defecto cambia a **"Verde Elegante"**.
- Se añade la categoría de badge `CATALOGADOR` para categorizadores de juegos en BGG.
- El campo `badgeCategory` se guarda en el modelo `Game` para asignar badges al crear partidas.
- Mejoras UX en el formulario de creación de partidas.

### 10 de febrero: badges dinámicos desde BD
- Las categorías de badge se cargan dinámicamente desde la base de datos en lugar de estar hardcodeadas.

### 14 de febrero: gestión financiera
- Se implementa el módulo de **Gestión Financiera**: categorías de movimientos, registro de ingresos/gastos, visualización.

### 15 de febrero: sistema de aprobación de partidas + PWA
- Se añade un sistema de **aprobación de partidas** (los eventos pueden requerir aprobación del organizador).
- Notificaciones a admins cuando se registra un nuevo usuario (email + campanita).
- **PWA support**: la app se puede instalar en el móvil.
- Suite de tests UAT con infraestructura PostgreSQL local.
- Documentación de Plan de Recuperación ante Desastres.

### 19–20 de febrero: filtros y notificaciones mejoradas
- Navegación desde notificaciones directamente al contenido relevante.
- Filtros en la página de Feedback (reportes).
- Se muestran mensajes correctos para eventos que ya han empezado o terminado.

### 21 de febrero: documentos en Cloudinary
- Los documentos del club se migran de almacenamiento local a **Cloudinary**.
- Corrección de links en la página de inicio.
- Mejora del sistema de auditoría de invitaciones.

### 22 de febrero: panel de admin + edición de eventos
- Acceso directo al "Panel de Admin" desde las acciones rápidas del dashboard.
- **Edición de eventos** desde el panel de admin.
- Funcionalidad para **añadir miembros a un evento** desde admin.
- Barra de progreso para subidas de ficheros grandes.
- Subida de PDFs a Cloudinary como "raw" (no imagen).
- Exportación CSV de miembros.
- **Reactivar miembros** dados de baja.

### 25 de febrero: documentos + rol Super Admin
- Se puede editar el título y visibilidad de documentos.
- El header muestra "Super Administrador" correctamente para el rol `SUPER_ADMIN`.

### 27 de febrero: tours guiados + reveal de badges
- Se añaden **tours interactivos** para guiar a nuevos usuarios en las secciones clave (calendario, feedback, creación de partidas).
- Los badges se pueden revelar con animación.
- Categorías expandibles en la cuadrícula de badges.
- Se puede adjuntar capturas de pantalla a los reportes.

### 28 de febrero: persistencia de logros + completar partidas
- Las partidas se marcan como completadas automáticamente.
- Los **badges se calculan por partidas jugadas** (no por juegos distintos).
- Contadores de badges descubiertos/por descubrir.
- Candados en badges no desbloqueados.
- **Pegatina** de badge personalizable en el perfil.
- Franja horaria favorita con tooltip explicativo.

---

## Fase 5 — Módulo Azul + mejoras sociales (mar 2026)

### 1 de marzo: juego Azul completo
- Se implementa el **módulo Azul** completo: sandbox local sin login y sala online "Dreadnought Combat Zone".
- El sandbox soporta 2, 3 y 4 jugadores con motor de juego compartido entre cliente y servidor.
- Se resaltan los últimos movimientos del rival en la vista online.

### 2–3 de marzo: UX general + juego Viernes
- Se muestra la duración estimada de los eventos y la hora de fin.
- Las próximas partidas aparecen en el dashboard.
- Mejoras de modales con fondo blur.
- Se empieza a implementar el **juego Viernes** (solitario de aventuras).
- Exportación de eventos a **calendario ICS** (suscripción + por evento).
- Comentarios de reportes mejorados: historial de ediciones, moderación, hilos.

### 4–6 de marzo: juego Viernes + perfil de usuario + validación de solapamientos
- Se añaden imágenes de cartas al juego Viernes.
- Se implementa el **perfil público de usuario** con popover al hacer clic en un nombre.
- Se añade el **nick de usuario** editable.
- **Validación de solapamientos** de horario al apuntarse o crear una partida.
- Impersonación de usuarios para admins (para soporte).

### 7 de marzo: Viernes — habilidades especiales + dashboard
- Se implementan todas las habilidades especiales de las cartas del juego Viernes.
- El dashboard de admin mejora con búsqueda de historial de usuarios por nombre/email.

### 9–10 de marzo: invitaciones + DNI + tests
- El organizador y admins no necesitan aprobación propia al invitar.
- Validación de DNI/NIE español con normalización.
- Se añade infraestructura de tests de integración con PostgreSQL local.
- Tooltips en badges de estado de invitación.

### 12 de marzo: nuevos logros + WhatsApp
- Nuevos badges implementados.
- Botón de compartir invitaciones por WhatsApp.

### 13 de marzo: teléfono en invitaciones + Viernes completo
- El DNI se sustituye por teléfono en el formulario de invitaciones para visitantes.
- Representación visual de los tableros del juego Viernes.
- Tip del día modal con consejos.

### 14 de marzo: seguridad + lógica de registro
- Se añade **express-rate-limit** y **helmet** para seguridad del servidor.
- Se mejora la lógica de estados de los botones de registro en eventos pasados.

### 17 de marzo: previsión semanal
- Se implementa la **Previsión Semanal**: vista de todas las partidas de la semana exportable como imagen para compartir por WhatsApp.
- Colores adaptativos según el tema (claro/oscuro) y destacado de socios.

### 23 de marzo: pantalla de login con partículas
- **Efecto de partículas** en la pantalla de login (blanco / neón / tema), configurable por el super admin.
- Color aleatorio del efecto al cargar.

### 24 de marzo: sistema de fidelidad + disputa de partidas
- Se implementa el **sistema de fidelidad de miembros**: historial de asistencia y estadísticas.
- Sistema de **confirmación/disputa de partidas**: un usuario puede disputar el registro de una partida.

### 25–26 de marzo: badges de validación
- Badge **VALIDADOR**: se obtiene validando la asistencia de otro socio mediante QR.
- Validación de partidas por QR.
- Ficha de miembro adaptada al modo oscuro/claro.

### 28–29 de marzo: enlace de invitación + hCaptcha
- Mejora del flujo del enlace de invitación y modal de cierre de plazas.
- Se añade **hCaptcha** en los formularios de login y registro.
- Rate limiting escalonado en el login.

---

## Fase 6 — Módulos avanzados y configuración (abr 2026)

### 1–2 de abril: tablón de anuncios + administración
- Se implementa el **Tablón de Anuncios**: los super admins pueden publicar anuncios visibles en la app.
- Botón "Notificar" (icono sobre) para enviar notificaciones push desde un anuncio.
- Se añade el **Panel de Control** al menú de administración.
- **Privacidad al compartir por WhatsApp**: el enlace no expone participantes públicamente.
- **Historial de invitaciones** con log de acciones.
- Límites editables desde ClubConfig.
- Categorías financieras agrupadas.
- Importación de miembros desde el sistema anterior.
- Modo mantenimiento (página "en construcción").
- **Contador de descargas** por documento.

### 3–4 de abril: cron de cierre + acordeón + BGG
- **Cron job** que cierra automáticamente los eventos pasados (se ejecuta cada hora entre 12:00 y 02:00).
- Vista lista de eventos con **acordeón** plegable por día de la semana, con colores por día.
- Separadores de fecha en la lista.
- Enlace a BGG con logo oficial en la modal de info del juego.
- Confirmación al eliminar fotos, botón cerrar y descarga en galería.

### 5 de abril: me gusta + WhatsApp + aprobaciones
- **Me gusta en el tablón de anuncios** con meeple, actualización optimista y rate limit.
- Mejoras en el mensaje de compartir por WhatsApp (negrita fecha/hora, descripción antes de plazas).
- Mejoras en el sistema de aprobación de partidas (validación QR y notificaciones).

### 6 de abril: bloqueo de usuarios dados de baja + calendario
- Los usuarios dados de baja (estado BAJA) no pueden acceder a la app.
- Colores de días del calendario adaptados al modo claro/oscuro.
- Ajustes del calendario ICS para compatibilidad con Outlook.

### 7 de abril: emails de eventos + preferencias de vista + campo memberSince
- **Emails de eventos**: se envían emails al organizador cuando alguien se apunta/abandona, al participante cuando le expulsan y a todos cuando el organizador cancela. Controlados por la preferencia `emailUpdates` del perfil.
- **Preferencias de vista de eventos** en el perfil (lista/calendario, modo acordeón).
- Campo `memberSince` para registrar la antigüedad real en el club (datos importados del sistema anterior).
- **Redirección al detalle de la partida** tras crearla (en lugar de al calendario).
- **Imagen OG de fallback** (`og-image.png`) para eventos sin imagen de juego.
- Previsualización de WhatsApp: proxy de imagen BGG para que el link preview muestre la carátula del juego.
- Libros ROL en la ludoteca cargados desde **RPGGeek** con miniaturas en caché.

### 7–8 de abril: previsión semanal v2
- Todos los eventos del club visibles en la previsión semanal con indicador de socios confirmados.
- **Bloques solapados** agrupados visualmente en un solo bloque con texto vertical y aviso.
- Legibilidad mejorada de bloques y leyenda.
- Fixes de hora de inicio y solapamientos.

### 9 de abril: onboarding + nuevos badges + admin mejorado

#### Formulario de onboarding obligatorio para nuevos socios
- Los nuevos usuarios deben completar un formulario de onboarding al primer acceso.
- Los socios existentes tienen `onboardingCompleted = true` vía backfill en migración.

#### Toggle BGG/RPGGeek y nuevos badges
- En la búsqueda de juegos, se puede alternar entre BGG (eurojuegos/estrategia) y RPGGeek (rol/narrativo).
- Nueva categoría `CARTAS_LCG_TCG`.
- **Badge Conocedor de Géneros**: los usuarios que votan la misma categoría para un juego (≥2 votos coincidentes) reciben 1 punto cada uno y la categoría queda fijada en la BD.
- **Badge Fotógrafo**: 1 punto por cada partida en la que el usuario sube al menos una foto.
- Descripciones en todos los badges.
- Botón "Cerrar sesión" en el onboarding.

#### Badges Testigo de Mesa y Auditor Lúdico
- **TESTIGO_MESA**: badge para testigos de disputas de partidas.
- **AUDITOR_LÚDICO**: badge para auditores de disputas.
- Corrección de roles scannerId/scannedId en VALIDADOR.
- Expiración de notificaciones de disputa.

#### Admin: creación de usuarios, columnas separadas y job de promoción
- Los admins pueden **crear usuarios directamente** desde el Directorio de Miembros (modal con todos los campos del onboarding, solo nombre y apellidos obligatorios).
- **Directorio de Miembros**: columnas Nombre y Apellidos separadas, ordenación server-side por cualquier columna, miembros en BAJA visibles con columna de Estado.
- **Gestión de Pagos**: columnas Nombre y Apellidos separadas, ordenación client-side con normalización de tildes.
- **Icono ⚠️** real en la previsión semanal (emoji nativo en lugar de carácter Unicode).
- **Job automático de promoción**: cron diario a las 08:00 que promueve los miembros `EN_PRUEBAS` a `COLABORADOR` cuando llevan 60 días en el club, notificando a admins por campanita y email.

---

## Resumen estadístico

| Métrica | Valor |
|---|---|
| Primer commit | 13 de diciembre de 2025 |
| Último commit | 9 de abril de 2026 |
| Duración del desarrollo | ~4 meses |
| Total de commits | ~518 |
| Ramas principales | `main`, `staging` |
| Plataforma de deploy | Railway |
| BD | PostgreSQL (Prisma ORM) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |

## Módulos implementados

| Módulo | Fecha aproximada |
|---|---|
| Autenticación (JWT, registro, aprobación admin) | Dic 2025 |
| Perfil de usuario y avatares | Ene 2026 |
| Sistema de partidas/eventos | Ene 2026 |
| Calendario interactivo | Ene 2026 |
| Invitaciones por QR | Ene–Mar 2026 |
| Sistema de notificaciones | Ene 2026 |
| Sistema de membresías | Ene 2026 |
| Tema claro/oscuro | Ene 2026 |
| Sistema de badges/logros | Ene–Abr 2026 |
| Módulo Financiero | Feb 2026 |
| PWA | Feb 2026 |
| Aprobación de partidas | Feb 2026 |
| Tours guiados | Feb 2026 |
| Juego Azul (sandbox + online) | Mar 2026 |
| Juego Viernes (solitario) | Mar 2026 |
| Previsión semanal exportable | Mar 2026 |
| Sistema de fidelidad | Mar 2026 |
| Validación QR de partidas | Mar 2026 |
| Disputa de partidas | Mar 2026 |
| hCaptcha | Mar 2026 |
| Tablón de anuncios | Abr 2026 |
| Emails de eventos | Abr 2026 |
| Libros ROL (RPGGeek) en ludoteca | Abr 2026 |
| Onboarding obligatorio | Abr 2026 |
| Cron de cierre automático de eventos | Abr 2026 |
| Cron de promoción de EN_PRUEBAS | Abr 2026 |
| Creación de usuarios desde admin | Abr 2026 |
