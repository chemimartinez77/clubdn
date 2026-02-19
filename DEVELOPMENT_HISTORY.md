# Historial de Desarrollo - Club Dreadnought

## Infraestructura y Configuración Inicial

### Setup Base
- Inicialización del servidor con sistema de registro de usuarios y aprobación por admin
- Configuración de autenticación con JWT
- Implementación de contexto de autenticación en el frontend
- Preparación para despliegue en Render (posteriormente migrado a Railway)

### Deployment y CI/CD
- Configuración inicial para Vercel (descartado)
- Migración a Render con configuración de servicios frontend/backend
- Sistema de build con Express para servir la app React
- Migración final a Railway con PostgreSQL
- Scripts específicos de Railway (`build-railway.sh`, `start-railway.sh`)
- Manejo de migraciones Prisma con sistema de baseline para bases de datos existentes
- Configuración de variables de entorno (`CLIENT_URL`, `DATABASE_URL`)

---

## Sistema de Autenticación

### Gestión de Usuarios
- Registro de usuarios con verificación de email
- Sistema de aprobación/rechazo de solicitudes por administradores
- Login con JWT y manejo de sesiones
- Perfil de usuario con estadísticas personales
- Sistema de roles (SUPER_ADMIN, ADMIN, SOCIO, COLABORADOR, INVITADO)

### Recuperación de Contraseña
- Implementación de reset password con tokens
- Envío de emails con nodemailer
- Migración de Resend a SMTP Gmail
- Configuración STARTTLS en puerto 587
- Fix: URLs de reset usando `CLIENT_URL` en producción (no localhost)

---

## Sistema de Membresías

### Tipos y Gestión
- Tipos: SOCIO, COLABORADOR, FAMILIAR, EN_PRUEBAS
- Campo de tipo de membresía en perfiles
- Creación automática de membresía desde directorio
- Preservación de datos al actualizar perfil

### Historial de Cambios
- Sistema de auditoría de cambios de tipo de membresía
- Modal para registrar motivo de cambios
- Endpoint de historial de membresía
- Tracking de quién aprobó/rechazó solicitudes

### Filtros y Estados
- Filtrado por tipo de membresía
- Gestión de estados de pago
- Exportación de miembros a CSV
- Directorio completo de miembros aprobados

---

## Sistema de Eventos y Partidas

### Creación y Gestión
- Crear eventos/partidas con integración BGG
- Búsqueda de juegos en BoardGameGeek
- Selector de juego con datos BGG (nombre, imagen, año)
- Campos opcionales: ubicación, dirección
- El creador puede apuntarse al crear
- Permitir comas y punto y coma en juegos favoritos

### Registro de Asistentes
- Sistema de registro con límite de plazas
- Estados: CONFIRMED, WAITING_LIST, CANCELLED
- Cooldown de 24h para re-registro tras cancelar
- Prevención de cancelación cuando el evento ya comenzó
- Confirmación manual de usuarios en lista de espera
- Invitados mostrados con badge "(Invitado)"

### Sistema de Invitados
- Generación de códigos QR para invitaciones
- Modal de invitación con datos del invitado
- Gestión de invitados por evento
- Campos: nombre, email, teléfono (opcionales)
- Cancelación de invitaciones con auditoría

### Control de Aforo y Permisos
- Validación de plazas disponibles
- Cierre automático cuando se completa
- Permisos diferenciados para eliminar asistentes
- Solo admin/creador pueden eliminar partidas
- Confirmación de borrado con modal
- Bloqueo de acciones cuando la partida ya empezó
- Prevención de eliminación de participantes en eventos pasados/iniciados

### Auditoría de Eventos
- Tracking de cambios en aforo
- Registro de acciones (registro, cancelación, confirmación)
- Historial de invitaciones

---

## Visualización de Eventos

### Vistas de Calendario
- Vista mensual con días coloreados por tipo de asistentes
  - Verde: días con socios registrados
  - Amarillo: días con colaboradores
  - Colores adaptados por tema
- Vista semanal con previsión
- Vista diaria con detalle de partidas
- Navegación entre vistas (Mes/Semana/Día)
- Click en día abre vista detallada
- Sistema de leyenda con colores temáticos

### Mejoras de UI en Calendario
- Miniaturas de juegos en vista diaria
- Imagen del juego agrandada (~25%)
- Eliminación de badges redundantes (hora, ubicación)
- Carga de eventos por mes según vista activa
- Indicador visual de "Hoy" con borde de color primario
- Contador de plazas libres/ocupadas
- Badge "COMPLETO" cuando se llena

### Compartir Eventos
- Botón de compartir en WhatsApp
- Mensaje con detalles del evento y confirmados
- Previsión semanal compartible
- Layout responsive para móvil

---

## Detalle de Eventos

### Información del Evento
- Portada con imagen del juego de BGG
- Modal de detalle BGG al pulsar imagen/título
- Datos: fecha, hora, ubicación, descripción
- Link a BoardGameGeek
- Estadísticas: confirmados, en espera, plazas

### Listas de Asistentes
- Lista de confirmados con badge de tipo (Socio/Colaborador)
- Lista de espera
- Invitados con badge "(Invitado)"
- Avatares de usuarios
- Acciones de admin: eliminar/mover a confirmados

### Galería de Fotos
- Sistema de subida de fotos del evento
- Máximo 8 fotos por evento
- Solo usuarios registrados confirmados pueden subir
- Validación: evento debe haber comenzado para subir fotos
- Modal de advertencia si el evento no ha empezado
- Límite 10MB por foto
- Formatos: JPG, PNG, GIF, WebP
- Miniaturas automáticas con Cloudinary
- Caption opcional
- Ver quién subió cada foto
- Eliminar propias fotos o admin puede eliminar cualquiera

---

## Integración con BoardGameGeek

### Búsqueda y Datos
- API de búsqueda de juegos BGG
- Parser XML con xml2js
- Cache de búsquedas
- Sincronización de IDs BGG para eventos

### Visualización
- Imágenes de juegos en eventos
- Miniaturas en calendario
- Modal de detalle con datos BGG
- Logo BGG en páginas de juegos
- Thumbnails en ludoteca

---

## Sistema de Juegos del Club

### Página de Juegos
- Búsqueda en BGG desde la app
- Modal de detalle de juego
- Guardado de juegos favoritos del club
- Modelo Game en base de datos
- Rutas API para gestión de juegos

### Ludoteca
- Gestión de ítems de la ludoteca
- Paginación de listado
- Opciones de visualización
- Modal de detalle de ítem
- Click en ítem muestra detalle
- Miniaturas de juegos
- Estadísticas de la colección

---

## Sistema de Estadísticas

### Estadísticas de Usuario
- Partidas jugadas
- Juegos únicos jugados
- Próximas partidas
- Historial personal

### Estadísticas del Club
- Dashboard con cards clickeables
- Modal de eventos por rango de tiempo
- Juegos más jugados del club
- Estadísticas por slot horario
- Recuento total de juegos
- Top games con navegación a eventos
- Endpoints completos de estadísticas

---

## Gestión Administrativa

### Panel de Administración
- Menú dropdown con opciones admin
- Gestión de solicitudes pendientes
- Aprobación/rechazo con notificaciones
- Página de miembros con filtros
- Exportación de datos

### Gestión de Membresías
- Cambio de tipo con modal de motivo
- Actualización de estados de pago
- Filtros por tipo y estado
- Preservación de avatar al editar

### Configuración del Club
- Modelo ClubConfig
- Gestión de ajustes globales
- Restricción de acceso a documentos
- Categorías financieras (cambio de "Iberdrola" a "Luz")

---

## Sistema de Documentos

### Gestión de Archivos
- Subida de documentos
- Descarga con permisos
- Estadísticas de documentos
- Restricción de acceso configurables
- Página de Documentos en navegación

---

## Sistema Financiero

### Páginas y Configuración
- Página Financiero con layout inicial
- Categorías de gastos/ingresos
- Integración con configuración del club

---

## Sistema de Notificaciones

### Backend de Notificaciones
- API completa de notificaciones
- Preferencias de usuario
- Tipos: REGISTRO_APROBADO, REGISTRO_RECHAZADO, EVENTO_CONFIRMADO, etc.
- Generación automática para admins
- Funciona sin configuración de email

### Frontend de Notificaciones
- Componente de campana en header
- Badge con contador de no leídas
- Preferencias en perfil de usuario
- Modal de pendientes accesible desde notificaciones
- Auto-refresh al navegar a pendientes
- Rutas correctas para evitar 404

---

## Sistema de Avatares

### Subida de Imágenes
- Integración con Cloudinary
- Subida desde perfil (usuario)
- Subida desde admin (gestión de miembros)
- Soporte móvil, tablet y PC
- Fallback a inicial si no hay avatar
- Mostrar avatar en header, listas, detalle

### Visualización
- Avatar en círculo en header
- Inicial como fallback
- Avatar en listados de eventos
- Avatar en directorio de miembros

---

## Sistema de Temas

### Temas Disponibles
1. **Púrpura** (default)
2. **Azul Corporativo**
3. **Verde Elegante**
4. **Rojo Oscuro**
5. **Marrón**
6. **Negro** (estilo Discord)

### Funcionalidad
- Selector de tema en perfil
- Modo claro/oscuro por tema
- Variables CSS dinámicas
- Gradientes en cards según tema
- Colores específicos para calendario
- Soporte de logo dinámico por tema
- Mejoras en temas oscuros (brown, black)

### Variables de Tema
- Colores primarios, secundarios
- Backgrounds, surfaces, borders
- Text colors (primary, secondary)
- Colores de calendario (días con socios/colaboradores)
- Hover states, accents

---

## Mejoras de UX/UI

### Componentes de UI
- Cards con soporte de gradientes
- Botones con cursor pointer
- Modales mejorados
- Toast notifications (success/error)
- Loading states
- Confirmaciones de acciones destructivas

### Responsive Design
- Layout móvil/tablet/desktop
- Header con navegación adaptativa
- Calendario responsive
- Detalle de eventos apilado en móvil
- Botones full-width en móvil

### Accesibilidad
- Tooltips informativos
- Mensajes de confirmación claros
- Estados visuales de loading
- Feedback inmediato de acciones

---

## Sistema de Perfil de Usuario

### Información Personal
- Nombre, email, teléfono
- Avatar personalizado
- Selector de color Noughter
- Cambio de color sin modo edición
- Juegos favoritos
- Estadísticas personales

### Preferencias
- Selector de tema
- Preferencias de notificaciones
- Configuración de privacidad

---

## Sistema de ID de Miembro

### Carnet Digital
- Modal con foto del usuario
- Nombre y tipo de membresía
- Reloj en tiempo real
- Acceso desde menú "ID"
- Datos de membresía en `/api/auth/me`

---

## Sistema de Badges/Insignias

### Tracking Automático
- Sistema de seguimiento de logros
- Progreso de badges
- BadgeDisplay y BadgeGrid
- Tracking sin theme props
- Fundación del sistema de insignias

---

## Animaciones y Efectos

### Login y Páginas
- Animación de partículas en login
- Efectos de hover mejorados
- Transiciones suaves
- Brightness en hover de calendario

---

## Optimizaciones y Fixes

### Performance
- Carga de eventos por mes
- Paginación en ludoteca
- Cache de búsquedas BGG
- Optimización de imágenes con Cloudinary

### Fixes TypeScript
- Corrección de tipos en controladores
- Imports type-only
- Eliminación de warnings
- Build limpio para Railway

### Fixes de Datos
- Validación de IDs en reportes
- Corrección de conteo de asistentes
- Igualar conteo usando invitaciones activas
- Preservar avatar al guardar
- Migración correcta de campos

---

## Migraciones de Base de Datos

### Sistema de Migraciones
- Prisma migrations
- Campo `cancelledAt` y `cancelledById`
- Sistema de invitaciones
- Auditoría de eventos
- Notificaciones
- Resolución de migraciones fallidas
- Baseline automático en Railway

---

## Configuración y DevOps

### Scripts de Build
- `build.sh` - Build con migraciones
- `build-railway.sh` - Build sin DB
- `start-railway.sh` - Start con baseline
- Prisma generate y migrate
- Limpieza de dist

### Variables de Entorno
- `DATABASE_URL`
- `CLIENT_URL`
- `JWT_SECRET`
- `CLOUDINARY_*` (cloud_name, api_key, api_secret)
- SMTP config para emails

### Dependencias Clave
- Express, Prisma, PostgreSQL
- React Query, Axios
- Cloudinary, Multer
- Nodemailer, xml2js
- JWT, bcrypt

---

## Testing y Validación

### Validaciones
- Express-validator en endpoints
- Validación de permisos por rol
- Verificación de plazas disponibles
- Límites de tamaño de archivo
- Formato de emails y campos requeridos

### Manejo de Errores
- Try-catch en controladores
- Mensajes descriptivos
- Rollback en operaciones fallidas
- Logs de errores

---

## Funcionalidades Pendientes (según plan)

### Sistema de Documentos Completo
- Almacenamiento en PostgreSQL (BYTEA)
- Gestión de permisos (PUBLIC, ADMIN, SUPER_ADMIN)
- Límite 20MB por archivo
- Tipos: PDF, Word, Excel, Imágenes

### Reestructuración de Menú
- Menú: Inicio → Calendario → Juegos▼ → Documentos → [Admin▼] → Usuario▼
- Dropdown "Juegos" con Ludoteca y Buscados
- Dropdown usuario con Perfil

---

## Resumen de Commits Totales

**Total de commits**: 244 commits
**Período**: Desde el inicio del proyecto hasta 2026-01-31
**Rama principal**: main

### Distribución por Categorías
- **Infraestructura y Deploy**: ~20 commits
- **Autenticación y Usuarios**: ~25 commits
- **Eventos y Partidas**: ~60 commits
- **Temas y UI**: ~30 commits
- **Estadísticas**: ~15 commits
- **Notificaciones**: ~10 commits
- **Ludoteca y Juegos**: ~20 commits
- **Membresías**: ~15 commits
- **Fixes y Optimizaciones**: ~49 commits

---

*Documento generado automáticamente el 31 de enero de 2026*
*Aplicación web del Club Dreadnought - Sistema de gestión de club de juegos de mesa*
