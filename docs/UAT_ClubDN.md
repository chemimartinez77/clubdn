# Plan de User Acceptance Testing (UAT)
## Club Dreadnought - Plataforma Web

**Versión:** 1.0
**Fecha:** 14 de febrero de 2026
**Preparado por:** Equipo de Desarrollo Club DN

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Objetivos del UAT](#objetivos-del-uat)
3. [Alcance](#alcance)
4. [Roles y Responsabilidades](#roles-y-responsabilidades)
5. [Criterios de Aceptación](#criterios-de-aceptación)
6. [Casos de Prueba](#casos-de-prueba)
7. [Datos de Prueba](#datos-de-prueba)
8. [Registro de Defectos](#registro-de-defectos)

---

## 📖 Introducción

Este documento define el plan de User Acceptance Testing (UAT) para la plataforma web del Club Dreadnought. El objetivo es validar que todas las funcionalidades cumplan con los requisitos del negocio y las expectativas de los usuarios finales.

---

## 🎯 Objetivos del UAT

- Validar que el sistema cumple con los requisitos funcionales
- Asegurar que los flujos de usuario son intuitivos y funcionales
- Verificar la integración correcta con BoardGameGeek (BGG)
- Confirmar que el sistema de badges funciona correctamente
- Validar los flujos de administración y gestión de usuarios

---

## 🔍 Alcance

### Funcionalidades Incluidas:
✅ Autenticación y gestión de usuarios
✅ Dashboard de usuario
✅ Gestión de eventos y partidas
✅ Ludoteca del club
✅ Sistema de badges/logros
✅ Gestión de documentos
✅ Sistema de feedback
✅ Notificaciones
✅ Panel de administración
✅ Gestión de pagos/membresías
✅ Integración con BGG

### Funcionalidades Excluidas:
❌ Rendimiento bajo carga
❌ Seguridad/penetración
❌ Testing multi-navegador exhaustivo

---

## 👥 Roles y Responsabilidades

| Rol | Responsabilidad | Persona |
|-----|----------------|---------|
| **Product Owner** | Aprobar criterios de aceptación | [Nombre] |
| **Tester UAT** | Ejecutar casos de prueba | [Nombre] |
| **Administrador** | Probar funcionalidades admin | [Nombre] |
| **Usuario Final** | Probar flujos de usuario normal | [Nombre] |
| **Desarrollador** | Resolver defectos encontrados | Equipo Dev |

---

## ✅ Criterios de Aceptación

Para que una funcionalidad sea **APROBADA**, debe cumplir:

1. ✓ Funcionalidad completa según especificaciones
2. ✓ Sin errores críticos (bloqueantes)
3. ✓ Errores menores documentados y aceptables
4. ✓ Experiencia de usuario fluida e intuitiva
5. ✓ Datos persistentes correctamente
6. ✓ Notificaciones funcionando adecuadamente

### Clasificación de Defectos:

| Severidad | Descripción | Acción |
|-----------|-------------|--------|
| **Crítico** | El sistema no funciona, pérdida de datos | Bloquea aprobación |
| **Alto** | Funcionalidad principal afectada | Debe corregirse |
| **Medio** | Funcionalidad afectada pero hay workaround | Corregir si es posible |
| **Bajo** | Problema cosmético o menor | Documentar para después |

---

## 🧪 Casos de Prueba

### **TC-001: Registro e Inicio de Sesión**

#### TC-001.1: Registro de Nuevo Usuario
**Objetivo:** Verificar que un nuevo usuario puede registrarse correctamente

**Precondiciones:**
- Usuario no registrado previamente
- Email válido disponible

**Pasos:**
1. Navegar a la página de registro
2. Completar formulario con:
   - Nombre: "Usuario Prueba UAT"
   - Email: "uat.test@clubdn.com"
   - Contraseña: "TestUAT2026!"
   - Confirmar contraseña
3. Hacer clic en "Registrarse"
4. Verificar recepción de email de verificación
5. Hacer clic en enlace de verificación

**Resultado Esperado:**
- ✓ Usuario creado con estado "PENDING_APPROVAL"
- ✓ Email de verificación recibido
- ✓ Email verificado correctamente
- ✓ Usuario redirigido a página de espera de aprobación
- ✓ Notificación visible para administradores

**Datos de Prueba:**
```
Email: uat.test@clubdn.com
Nombre: Usuario Prueba UAT
Contraseña: TestUAT2026!
```

---

#### TC-001.2: Login de Usuario Aprobado
**Objetivo:** Verificar que un usuario aprobado puede iniciar sesión

**Precondiciones:**
- Usuario registrado y aprobado por admin
- Email verificado

**Pasos:**
1. Navegar a "/login"
2. Ingresar credenciales:
   - Email: usuario aprobado
   - Contraseña: correcta
3. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- ✓ Login exitoso
- ✓ Redirigido al dashboard (página de inicio)
- ✓ Nombre de usuario visible en header
- ✓ Avatar o inicial visible

---

#### TC-001.3: Login con Credenciales Incorrectas
**Objetivo:** Verificar manejo de errores en login

**Pasos:**
1. Intentar login con contraseña incorrecta
2. Intentar login con email no registrado

**Resultado Esperado:**
- ✓ Mensaje de error claro
- ✓ No revela si el email existe o no (seguridad)
- ✓ Usuario permanece en página de login

---

### **TC-002: Dashboard de Usuario**

#### TC-002.1: Visualización del Dashboard
**Objetivo:** Verificar que el dashboard muestra información correcta del usuario

**Precondiciones:**
- Usuario autenticado

**Pasos:**
1. Navegar al inicio "/"
2. Observar sección de bienvenida
3. Revisar estadísticas personales
4. Verificar "Acciones rápidas"

**Resultado Esperado:**
- ✓ Saludo personalizado: "Buenas [momento del día], [Nombre]!"
- ✓ Fecha/hora de último acceso visible
- ✓ Estadísticas correctas:
  - Eventos asistidos
  - Partidas jugadas
  - Horario favorito
  - Próximos eventos
- ✓ Juegos más jugados listados
- ✓ Compañeros frecuentes mostrados
- ✓ Días que más juega visibles

**Validaciones Adicionales:**
- Verificar que los números coinciden con datos reales del usuario
- Los enlaces de "Acciones rápidas" funcionan
- La imagen del Noughter se muestra correctamente

---

### **TC-003: Gestión de Eventos y Partidas**

#### TC-003.1: Ver Calendario de Eventos
**Objetivo:** Verificar visualización correcta del calendario

**Pasos:**
1. Navegar a "/events"
2. Cambiar entre vistas: Mes / Semana / Día
3. Navegar entre diferentes meses
4. Observar eventos programados

**Resultado Esperado:**
- ✓ Calendario renderiza correctamente
- ✓ Eventos visibles en fechas correctas
- ✓ Cambio de vista funciona sin errores
- ✓ Navegación entre fechas fluida
- ✓ Indicadores visuales:
  - "Con plazas" (días con eventos disponibles)
  - "Completo" (eventos sin plazas)
  - "Hoy" destacado
- ✓ Número de partidas por día visible

---

#### TC-003.2: Ver Detalle de Evento
**Objetivo:** Verificar que se puede ver información completa de un evento

**Pasos:**
1. Desde el calendario, hacer clic en un evento
2. Revisar información mostrada

**Resultado Esperado:**
- ✓ Modal/página de detalle abre
- ✓ Información visible:
  - Nombre del juego con imagen BGG
  - Fecha y hora
  - Ubicación
  - Descripción
  - Capacidad (X/Y asistentes)
  - Organizador
  - Estado (Programado/Completo)
- ✓ Lista de asistentes e invitados
- ✓ Botones de acción visibles según contexto:
  - "Apuntarme" si hay plazas
  - "Añadir invitado" si eres asistente
  - "WhatsApp" para compartir
  - "Cerrar plazas" si eres admin
  - "Eliminar" si eres admin/organizador

---

#### TC-003.3: Crear Nueva Partida
**Objetivo:** Verificar que un usuario puede organizar una partida

**Precondiciones:**
- Usuario autenticado
- Permisos para crear partidas

**Pasos:**
1. Navegar a "/events/crear-partida"
2. Buscar juego en BGG (opcional): "Catan"
3. Seleccionar categoría del juego (si se busca en BGG)
4. Completar formulario:
   - Título: "Partida de Catan - UAT"
   - Descripción: "Partida de prueba para UAT"
   - Fecha: [fecha futura]
   - Hora: 17:00
   - Duración estimada: 3h
   - Número de jugadores: 4
   - Ubicación: "Club DN"
5. Marcar "Asistir a la partida"
6. Hacer clic en "Crear Partida"

**Resultado Esperado:**
- ✓ Búsqueda de BGG funciona y muestra resultados
- ✓ Al seleccionar juego, categorías se cargan automáticamente
- ✓ Formulario se completa sin errores
- ✓ Partida creada exitosamente
- ✓ Mensaje de confirmación visible
- ✓ Evento aparece en calendario
- ✓ Organizador listado como asistente
- ✓ Notificación enviada a miembros del club

**Validaciones Adicionales:**
- Si no se encuentra juego en BGG, se puede crear partida sin juego
- El campo "categoría" solo es visible si se selecciona juego con categorías en BD

---

#### TC-003.4: Apuntarse a una Partida
**Objetivo:** Verificar que un usuario puede registrarse en un evento

**Precondiciones:**
- Evento con plazas disponibles

**Pasos:**
1. Abrir detalle de evento con plazas
2. Hacer clic en "Apuntarme"
3. Confirmar acción

**Resultado Esperado:**
- ✓ Usuario añadido a lista de asistentes
- ✓ Contador de plazas actualizado
- ✓ Botón cambia a "Eliminar" (darse de baja)
- ✓ Notificación de confirmación visible
- ✓ Notificación enviada al organizador (si configurado)

---

#### TC-003.5: Darse de Baja de una Partida
**Objetivo:** Verificar que un usuario puede salirse de un evento

**Precondiciones:**
- Usuario apuntado a un evento

**Pasos:**
1. Abrir detalle de evento
2. Hacer clic en "Eliminar" o "Darse de baja"
3. Confirmar acción

**Resultado Esperado:**
- ✓ Usuario removido de lista
- ✓ Plaza liberada
- ✓ Notificación de confirmación

---

### **TC-004: Ludoteca del Club**

#### TC-004.1: Ver Catálogo de Juegos
**Objetivo:** Verificar visualización de la ludoteca

**Pasos:**
1. Navegar a "/ludoteca"
2. Observar estadísticas generales
3. Revisar juegos listados

**Resultado Esperado:**
- ✓ Estadísticas visibles:
  - Total Juegos: 1204
  - Del Club: 814
  - De Socios: 390
  - Propietarios: 19
- ✓ Juegos mostrados con:
  - Imagen de BGG
  - Nombre
  - ID de BGG
  - Idioma
  - Condición (Bueno/Regular/Malo)
  - Propietario
  - Botón "Ver detalle"
- ✓ Paginación funcional (10 por página)

---

#### TC-004.2: Buscar y Filtrar Juegos
**Objetivo:** Verificar funcionalidad de búsqueda y filtros

**Pasos:**
1. Usar barra de búsqueda: "Catan"
2. Aplicar filtro de tipo: "Juego de Mesa"
3. Aplicar filtro de condición: "Malo"
4. Aplicar filtro de propietario: "Todos los propietarios"

**Resultado Esperado:**
- ✓ Búsqueda filtra resultados en tiempo real
- ✓ Filtros se aplican correctamente
- ✓ Resultados coinciden con criterios
- ✓ Contador de resultados actualizado: "Mostrando 1 - 4 de 4 juegos"

---

#### TC-004.3: Ver Detalle de Juego
**Objetivo:** Verificar modal de información del juego

**Pasos:**
1. Hacer clic en "Ver detalle" de un juego
2. Revisar información mostrada

**Resultado Esperado:**
- ✓ Modal/página abre con:
  - Imagen grande del juego
  - Nombre completo
  - Información de BGG:
    - Nota BGG
    - Bayes
    - Peso
    - Ranking
    - Número de jugadores
    - Duración
    - Edad mínima
    - Año de publicación
  - Descripción completa
  - Categorías
  - Mecánicas
  - Diseñadores
  - Editoriales
  - Estadísticas de comunidad (lo tienen, lo quieren, en wishlist)
- ✓ Botón "Cerrar" funciona

---

### **TC-005: Sistema de Badges (Logros)**

#### TC-005.1: Ver Badges en Perfil
**Objetivo:** Verificar visualización de badges del usuario

**Pasos:**
1. Navegar a "/profile"
2. Scroll hasta sección "Logros y Badges"
3. Observar badges desbloqueados y bloqueados

**Resultado Esperado:**
- ✓ Progreso general visible: "0 / 48 desbloqueados (0% completado)"
- ✓ Filtros por categoría funcionan:
  - Todas
  - Eurogames 🎲
  - Temáticos 🎭
  - Wargames ⚔️
  - Rol 🎲
  - Miniaturas 🗿
  - Warhammer 🔥
  - Fillers / Party 🎉
  - Catalogador 📚
- ✓ Badges bloqueados mostrados en gris/deshabilitados
- ✓ Badges desbloqueados mostrados con color

---

#### TC-005.2: Desbloquear Badge Automáticamente
**Objetivo:** Verificar que badges se desbloquean al cumplir requisitos

**Pasos:**
1. Crear/participar en una partida de un juego de categoría "Eurogames"
2. Completar la partida
3. Verificar perfil

**Resultado Esperado:**
- ✓ Badge de nivel 1 de Eurogames desbloqueado
- ✓ Notificación de logro desbloqueado
- ✓ Progreso actualizado
- ✓ Badge visible en perfil

**Nota:** Esta funcionalidad depende del sistema de asignación automática de badges según categorías de juegos.

---

### **TC-006: Gestión de Documentos**

#### TC-006.1: Ver Documentos del Club
**Objetivo:** Verificar acceso a documentos compartidos

**Pasos:**
1. Navegar a "/documentos"
2. Observar documentos disponibles

**Resultado Esperado:**
- ✓ Estadísticas visibles:
  - Total Documentos: 1
  - Documentos Públicos: 1
  - Solo Admins: 0
  - Espacio Usado: 0.05 MB
- ✓ Documento "coffee" visible
- ✓ Información mostrada:
  - Nombre: coffee
  - Archivo: coffee.png
  - Tamaño: 49.1 KB
  - Fecha: 18/1/2026
  - Visibilidad: "Todos los miembros"
- ✓ Botones de acción:
  - Descargar (icono de descarga)
  - Eliminar (solo admin, icono rojo)

---

#### TC-006.2: Subir Nuevo Documento (Admin)
**Objetivo:** Verificar que administradores pueden subir documentos

**Precondiciones:**
- Usuario con rol ADMIN

**Pasos:**
1. Hacer clic en "Subir Documento"
2. Completar formulario:
   - Título: "Reglamento UAT"
   - Archivo: [seleccionar PDF < 20MB]
   - Visibilidad: "Público" o "Solo Admins"
3. Hacer clic en "Subir"

**Resultado Esperado:**
- ✓ Archivo cargado exitosamente
- ✓ Documento aparece en lista
- ✓ Notificación de éxito (si es público, notificar a miembros)
- ✓ Espacio usado actualizado

---

#### TC-006.3: Descargar Documento
**Objetivo:** Verificar descarga de documentos

**Pasos:**
1. Hacer clic en botón de descarga
2. Verificar descarga

**Resultado Esperado:**
- ✓ Archivo descargado correctamente
- ✓ Nombre de archivo correcto
- ✓ Contenido íntegro

---

### **TC-007: Sistema de Feedback**

#### TC-007.1: Enviar Reporte de Bug
**Objetivo:** Verificar envío de feedback/bug reports

**Pasos:**
1. Navegar a "/feedback"
2. Completar formulario:
   - Tipo: "Bug"
   - Gravedad: "Me molesta"
   - Título: "No puedo subir una foto del evento"
   - Descripción: "Pos eso"
   - Captura: [subir imagen opcional]
3. Hacer clic en "Enviar reporte"

**Resultado Esperado:**
- ✓ Reporte enviado exitosamente
- ✓ Mensaje de confirmación visible
- ✓ Reporte aparece en "Tablero público"
- ✓ Estado inicial: "Nuevo"
- ✓ Gravedad: "Me molesta"
- ✓ Fecha de reporte visible
- ✓ Nombre de reportador visible

---

#### TC-007.2: Ver Reportes Públicos
**Objetivo:** Verificar visualización de reportes enviados

**Pasos:**
1. Scroll a "Tablero público"
2. Cambiar filtros:
   - "Mis reportes"
   - "Más votados"
   - Estado: "todos"
3. Votar en un reporte (icono de fuego)

**Resultado Esperado:**
- ✓ Filtros funcionan correctamente
- ✓ Reportes visibles con:
  - Título
  - Descripción
  - Estado (Nuevo/En progreso/Resuelto)
  - Tipo (Bug/Mejora/Otro)
  - Gravedad
  - Votos (🔥)
  - Reportador
  - Fecha
  - Captura (si la hay)
- ✓ Botón de voto funciona
- ✓ Contador de votos aumenta

---

### **TC-008: Notificaciones**

#### TC-008.1: Recibir Notificaciones
**Objetivo:** Verificar sistema de notificaciones

**Precondiciones:**
- Usuario con notificaciones habilitadas

**Escenarios de Notificación:**
1. Nuevo usuario pendiente de aprobación (admin)
2. Nueva partida disponible
3. Cambios en evento inscrito
4. Evento cancelado
5. Usuario aprobado (para el nuevo usuario)

**Pasos:**
1. Realizar acción que genere notificación
2. Observar icono de campana en header
3. Hacer clic en la campana

**Resultado Esperado:**
- ✓ Badge de número visible en campana
- ✓ Panel de notificaciones abre
- ✓ Notificación mostrada con:
  - Icono representativo
  - Título
  - Mensaje descriptivo
  - Fecha/hora relativa ("29 ene", "26 ene")
  - Botón "X" para cerrar
- ✓ Notificaciones ordenadas por fecha (más reciente primero)
- ✓ Al hacer clic en notificación, redirige a contexto relevante

**Ejemplos de Notificaciones:**
```
🆕 Nuevo usuario pendiente
José Luis Viadel (joluvice@gmail.com) ha verificado su email y espera aprobación.
29 ene

📅 Nueva partida disponible
Se ha creado una nueva partida: "Baghdad: The City of Peace". Fecha: 31/1/2026
26 ene
```

---

### **TC-009: Mi Perfil**

#### TC-009.1: Ver Información Personal
**Objetivo:** Verificar visualización del perfil

**Pasos:**
1. Navegar a "/profile"
2. Revisar información mostrada

**Resultado Esperado:**
- ✓ Avatar/foto de perfil visible
- ✓ Nombre completo
- ✓ Email
- ✓ Información personal:
  - Teléfono
  - Fecha de nacimiento
- ✓ Preferencias de juego:
  - Juegos favoritos (tags)
  - Estilo de juego (Estratégico/Casual/etc.)
- ✓ Redes sociales:
  - Discord
  - Telegram
- ✓ Configuración de notificaciones:
  - En la aplicación
  - Por email
  - Nuevas partidas
  - Cambios en eventos
  - Eventos cancelados
  - Estado de invitaciones
- ✓ Tema de la aplicación:
  - Claro/Oscuro
  - Color del Noughter
- ✓ Botón "Editar Perfil"

---

#### TC-009.2: Editar Perfil
**Objetivo:** Verificar edición de información personal

**Pasos:**
1. Hacer clic en "Editar Perfil"
2. Cambiar avatar (hover sobre foto)
3. Modificar información:
   - Teléfono: "696305837"
   - Fecha de nacimiento: "01/09/1977"
   - Biografía: "Cuéntanos sobre ti..."
   - Juegos favoritos: "Catán, Ticket to Ride, Lacerda"
   - Estilo de juego: "Estratégico"
   - Discord: "usuario#1234"
   - Telegram: "@usuario"
4. Cambiar preferencias de notificaciones
5. Cambiar tema: "Verde Elegante"
6. Cambiar color de Noughter: "Marrón"
7. Guardar cambios

**Resultado Esperado:**
- ✓ Formulario de edición funcional
- ✓ Avatar se actualiza al cambiar
- ✓ Todos los campos editables
- ✓ Validaciones funcionan (email, formato)
- ✓ Cambios guardados exitosamente
- ✓ Mensaje de confirmación visible
- ✓ Perfil actualizado inmediatamente
- ✓ Tema aplicado en toda la app
- ✓ Vista previa del Noughter actualizada

---

#### TC-009.3: Cambiar Contraseña
**Objetivo:** Verificar cambio de contraseña desde perfil

**Pasos:**
1. En perfil, sección "Seguridad"
2. Hacer clic en "Cambiar Contraseña"
3. Completar:
   - Contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña
4. Guardar

**Resultado Esperado:**
- ✓ Validación de contraseña actual
- ✓ Validación de fortaleza de nueva contraseña
- ✓ Validación de coincidencia
- ✓ Contraseña actualizada
- ✓ Sesión mantenida (no logout)
- ✓ Notificación de éxito

---

### **TC-010: Funcionalidad "ID"**

#### TC-010.1: Ver Modal de ID
**Objetivo:** Verificar modal de identificación del usuario

**Pasos:**
1. Hacer clic en "ID" en el menú
2. Observar información mostrada

**Resultado Esperado:**
- ✓ Modal abre correctamente
- ✓ Avatar grande visible
- ✓ Nombre completo
- ✓ Tipo de membresía (Socio/Colaborador/Miembro)
- ✓ **Hora en tiempo real** actualizada cada segundo
- ✓ Formato: "viernes, 14 de febrero de 2026, 16:30:45"
- ✓ Modal se cierra al hacer clic fuera o en "X"

---

## 🔐 **Casos de Prueba: Administración**

### **TC-011: Dashboard de Administración**

#### TC-011.1: Ver Dashboard Admin
**Objetivo:** Verificar visualización del panel de administración

**Precondiciones:**
- Usuario con rol ADMIN o SUPER_ADMIN

**Pasos:**
1. Navegar a "/admin/dashboard"
2. Revisar métricas mostradas

**Resultado Esperado:**
- ✓ Título: "Dashboard de Administración"
- ✓ Subtítulo: "Visión general del sistema"
- ✓ Estadísticas generales:
  - **Total Usuarios:** 64
  - **Nuevos (7 días):** 0
  - **Pendiente Aprobación:** 0
  - **Logins (24h):** 1 (0 fallidos)
- ✓ Sección "Usuarios por Estado":
  - Pendiente verificación: 4 (6%)
  - Pendiente aprobación: 0 (0%)
  - Aprobados: 54 (84%)
  - Rechazados: 5 (8%)
  - Suspendidos: 1 (2%)
- ✓ **Usuarios Recientes** (últimos 5):
  - Avatar/inicial
  - Nombre
  - Email
  - Estado (APPROVED)
  - Fecha de registro
- ✓ Gráfico "Crecimiento de Usuarios":
  - Últimos 7 días: 0 nuevos registros
  - Últimos 30 días: 4 nuevos registros
  - Usuarios Activos: 54 aprobados

---

### **TC-012: Aprobar Usuarios**

#### TC-012.1: Ver Solicitudes Pendientes
**Objetivo:** Verificar lista de usuarios pendientes de aprobación

**Precondiciones:**
- Al menos un usuario en estado PENDING_APPROVAL

**Pasos:**
1. Navegar a "/admin/pending-approvals"
2. Observar lista

**Resultado Esperado:**
- ✓ Título: "Aprobar Usuarios"
- ✓ Subtítulo: "Gestiona las solicitudes de registro de nuevos usuarios"
- ✓ Botón "Actualizar" funcional
- ✓ Contador: "X usuarios" en badge
- ✓ Tabla con columnas:
  - Usuario (avatar, nombre, email)
  - Fecha de Registro
  - Acciones
- ✓ Si no hay pendientes: "No hay solicitudes pendientes"

---

#### TC-012.2: Aprobar Usuario
**Objetivo:** Verificar flujo de aprobación de usuario

**Pasos:**
1. En lista de pendientes, hacer clic en "Aprobar" (botón verde)
2. Revisar modal de confirmación
3. (Opcional) Añadir mensaje personalizado de bienvenida
4. Confirmar aprobación

**Resultado Esperado:**
- ✓ Modal de confirmación abre
- ✓ Muestra nombre y email del usuario
- ✓ Campo opcional para mensaje personalizado
- ✓ Al confirmar:
  - Usuario actualizado a estado APPROVED
  - Usuario removido de lista de pendientes
  - Email de bienvenida enviado al usuario
  - Notificación de éxito: "Usuario aprobado exitosamente"
  - Lista actualizada automáticamente
  - En historial: "Aprobada por [Nombre Admin]"

---

#### TC-012.3: Rechazar Usuario
**Objetivo:** Verificar flujo de rechazo de usuario

**Pasos:**
1. Hacer clic en "Rechazar" (botón rojo)
2. Completar modal:
   - Razón del rechazo (opcional)
   - Mensaje personalizado (opcional)
3. Confirmar rechazo

**Resultado Esperado:**
- ✓ Modal de rechazo abre
- ✓ Opciones de razón disponibles
- ✓ Al confirmar:
  - Usuario actualizado a estado REJECTED
  - Email de rechazo enviado (si configurado)
  - Notificación: "Usuario rechazado"
  - Lista actualizada
  - En historial: "Rechazada por [Nombre Admin]"

---

### **TC-013: Gestión de Pagos**

#### TC-013.1: Ver Panel de Pagos
**Objetivo:** Verificar visualización del panel de gestión de pagos

**Pasos:**
1. Navegar a "/admin/membership"
2. Revisar interfaz

**Resultado Esperado:**
- ✓ Título: "Gestión de Pagos"
- ✓ Subtítulo: "Control de pagos mensuales de membresías"
- ✓ Selector de año funcional (2025, 2026, 2027)
- ✓ Barra de búsqueda por nombre
- ✓ Filtro por tipo de membresía:
  - Cualquier tipo
  - COLABORADOR
  - SOCIO
  - FAMILIAR
  - EN PRUEBAS
  - BAJA
- ✓ Checkboxes de estado:
  - Nuevo ☑️
  - Pendiente ☑️
  - Impagado ☑️
  - Pagado ☑️
  - Año completo ☑️
- ✓ Tabla con:
  - Nombre (con badge de tipo)
  - Estado (badge de color)
  - Botón "Año completo"
  - Checkboxes por mes (ENE-DIC)

---

#### TC-013.2: Marcar Pago Mensual
**Objetivo:** Verificar marcado de pago individual

**Pasos:**
1. Buscar usuario: "Adriancito Romero"
2. Hacer clic en checkbox de "ENE" (Enero)
3. Observar cambio

**Resultado Esperado:**
- ✓ Checkbox marcado
- ✓ Estado actualizado en BD
- ✓ Si es primer pago del año y el usuario es "NUEVO":
  - Estado cambia a "PENDIENTE"
- ✓ Contador de meses pagados actualizado

---

#### TC-013.3: Marcar Año Completo
**Objetivo:** Verificar marcado de todos los meses del año

**Pasos:**
1. Hacer clic en botón "Año completo"
2. Confirmar acción

**Resultado Esperado:**
- ✓ Confirmación solicitada: "¿Marcar todos los meses del ciclo en curso como pagados?"
- ✓ Todos los checkboxes marcados
- ✓ Estado cambia a "ANO_COMPLETO"
- ✓ Badge actualizado a color primario
- ✓ Notificación de éxito

---

#### TC-013.4: Filtrar por Estado de Pago
**Objetivo:** Verificar filtros de estado

**Pasos:**
1. Desmarcar "Pagado"
2. Desmarcar "Año completo"
3. Observar lista

**Resultado Esperado:**
- ✓ Solo usuarios con estado NUEVO, PENDIENTE o IMPAGADO visibles
- ✓ Contador actualizado: "Mostrando X de Y juegos"
- ✓ Filtros múltiples funcionan en conjunto

---

### **TC-014: Directorio de Miembros**

#### TC-014.1: Ver Directorio
**Objetivo:** Verificar lista completa de miembros

**Pasos:**
1. Navegar a "/admin/members"
2. Revisar interfaz

**Resultado Esperado:**
- ✓ Título: "Directorio de Miembros"
- ✓ Subtítulo: "Gestiona y consulta la información de todos los miembros del club"
- ✓ Botones de acción:
  - "Actualizar"
  - "Exportar CSV"
- ✓ Filtros:
  - Buscar por nombre o email
  - Tipo de membresía (Todos)
  - Estado de pago (Todos)
  - Fecha desde / Fecha hasta
  - Registros por página (25)
- ✓ Botón "Limpiar filtros"
- ✓ Contador: "Mostrando 25 de 54 miembros"
- ✓ Tabla con columnas:
  - Nombre
  - Email
  - Tipo (badge)
  - Fecha Incorporación
  - Estado de Pago (badge)
  - Acciones: "Ver" | "Dar de baja" (rojo)

---

#### TC-014.2: Exportar CSV
**Objetivo:** Verificar exportación de datos

**Pasos:**
1. (Opcional) Aplicar filtros
2. Hacer clic en "Exportar CSV"

**Resultado Esperado:**
- ✓ Archivo CSV descargado
- ✓ Contiene todos los usuarios (respetando filtros si hay)
- ✓ Columnas incluidas:
  - Nombre
  - Email
  - Tipo
  - Fecha
  - Estado

---

#### TC-014.3: Ver Detalle de Miembro
**Objetivo:** Verificar vista detallada de un miembro

**Pasos:**
1. Hacer clic en "Ver" de un usuario
2. Revisar información

**Resultado Esperado:**
- ✓ Modal/página con información completa:
  - Datos personales
  - Historial de pagos
  - Eventos asistidos
  - Badges desbloqueados
  - Actividad reciente

---

#### TC-014.4: Dar de Baja a Miembro
**Objetivo:** Verificar proceso de baja de usuario

**Pasos:**
1. Hacer clic en "Dar de baja"
2. Confirmar acción

**Resultado Esperado:**
- ✓ Confirmación solicitada
- ✓ Al confirmar:
  - Tipo de membresía cambia a "BAJA"
  - Usuario desactivado (no puede login)
  - Email de notificación enviado (opcional)
  - Lista actualizada

---

### **TC-015: Gestión de Eventos (Admin)**

#### TC-015.1: Ver Panel de Gestión de Eventos
**Objetivo:** Verificar panel administrativo de eventos

**Precondiciones:**
- Usuario ADMIN

**Pasos:**
1. Navegar a "/admin/events"
2. Revisar opciones disponibles

**Resultado Esperado:**
- ✓ Lista de todos los eventos (pasados y futuros)
- ✓ Filtros avanzados
- ✓ Opciones de edición/eliminación para cualquier evento
- ✓ Estadísticas de asistencia

---

### **TC-016: Gestión Financiera**

#### TC-016.1: Ver Panel Financiero
**Objetivo:** Verificar panel de gestión financiera

**Pasos:**
1. Navegar a "/financiero"
2. Revisar métricas

**Resultado Esperado:**
- ✓ Resumen financiero del mes/año
- ✓ Ingresos por membresías
- ✓ Gastos del club
- ✓ Balance general

---

### **TC-017: Configuración del Club**

#### TC-017.1: Ver Configuración
**Objetivo:** Verificar panel de configuración general

**Pasos:**
1. Navegar a "/admin/config"
2. Revisar opciones

**Resultado Esperado:**
- ✓ Configuraciones generales del club editables
- ✓ Parámetros del sistema
- ✓ Integraciones (BGG, etc.)

---

## 📊 Datos de Prueba

### Usuarios de Prueba

| Rol | Email | Contraseña | Estado | Uso |
|-----|-------|------------|--------|-----|
| Super Admin | chemimartinez@gmail.com | [actual] | APPROVED | Testing admin completo |
| Admin | admin.test@clubdn.com | Admin2026! | APPROVED | Testing admin básico |
| Usuario Normal | user.test@clubdn.com | User2026! | APPROVED | Testing usuario estándar |
| Usuario Pendiente | pending.test@clubdn.com | Pending2026! | PENDING_APPROVAL | Testing aprobación |
| Usuario Rechazado | rejected.test@clubdn.com | - | REJECTED | Testing histórico |

### Juegos de Prueba (BGG IDs)

| Juego | ID BGG | Categoría | Uso |
|-------|--------|-----------|-----|
| Catan | 13 | Eurogames | Testing básico |
| Ticket to Ride | 9209 | Eurogames | Testing badges |
| Risk | 181 | Wargames | Testing categorías |
| Dominion | 36218 | Eurogames | Testing eventos |

### Eventos de Prueba

| Nombre | Fecha | Estado | Uso |
|--------|-------|--------|-----|
| Partida de Catan | [Hoy + 7 días] | Con plazas | Testing registro |
| Partida de Dominion | [Pasado] | Completo | Testing histórico |
| Torneo Risk | [Hoy + 14 días] | Programado | Testing notificaciones |

---

## 🐛 Registro de Defectos

### Plantilla de Reporte de Defecto

```markdown
**ID:** DEF-XXX
**Severidad:** [Crítico / Alto / Medio / Bajo]
**Caso de Prueba:** TC-XXX.X
**Título:** [Descripción breve]

**Descripción:**
[Descripción detallada del problema]

**Pasos para Reproducir:**
1. [Paso 1]
2. [Paso 2]
3. [...]

**Resultado Esperado:**
[Qué debería pasar]

**Resultado Actual:**
[Qué pasa realmente]

**Captura de Pantalla:**
[Adjuntar si es posible]

**Navegador/Dispositivo:**
[Chrome 120 / Firefox 121 / Mobile Safari iOS 17]

**Fecha de Reporte:**
[DD/MM/YYYY]

**Reportado por:**
[Nombre]

**Estado:**
[Nuevo / En Progreso / Resuelto / Cerrado / No es un bug]

**Prioridad:**
[Alta / Media / Baja]
```

### Ejemplo de Defecto:

```markdown
**ID:** DEF-001
**Severidad:** Alto
**Caso de Prueba:** TC-003.3
**Título:** No se pueden crear partidas sin seleccionar juego de BGG

**Descripción:**
Al intentar crear una partida sin buscar/seleccionar un juego en BoardGameGeek, el formulario muestra un error y no permite continuar, aunque el campo "Elige un juego" está marcado como opcional.

**Pasos para Reproducir:**
1. Ir a "/events/crear-partida"
2. NO usar la búsqueda de BGG
3. Completar el resto del formulario (título, fecha, etc.)
4. Hacer clic en "Crear Partida"

**Resultado Esperado:**
La partida debe crearse sin juego asociado, ya que el campo es opcional.

**Resultado Actual:**
Mensaje de error: "Debes seleccionar un juego"

**Navegador:** Chrome 120
**Fecha:** 14/02/2026
**Reportado por:** Tester UAT
**Estado:** Nuevo
**Prioridad:** Alta
```

---

## 📝 Checklist de Preparación UAT

Antes de iniciar las pruebas UAT, asegurarse de:

- [ ] Base de datos poblada con datos de prueba
- [ ] Usuarios de prueba creados con diferentes roles
- [ ] Eventos de prueba programados (pasados, presentes, futuros)
- [ ] Juegos en ludoteca con diferentes estados
- [ ] Documentos de prueba subidos
- [ ] Notificaciones configuradas correctamente
- [ ] Integración con BGG funcional
- [ ] Emails de prueba configurados
- [ ] Sistema de badges configurado
- [ ] Ambiente de UAT estable y accesible

---

## ✅ Criterios de Finalización

El UAT se considera **COMPLETADO** cuando:

1. ✓ Todos los casos de prueba ejecutados
2. ✓ Al menos **90%** de casos de prueba PASADOS
3. ✓ **0 defectos críticos** abiertos
4. ✓ **< 3 defectos de severidad alta** abiertos
5. ✓ Product Owner aprueba formalmente
6. ✓ Documento de defectos finalizado
7. ✓ Plan de corrección de defectos aprobado

---

## 📞 Contactos

| Rol | Nombre | Email |
|-----|--------|-------|
| Product Owner | [Nombre] | [email] |
| Lead Developer | Equipo Dev | [email] |
| UAT Coordinator | [Nombre] | [email] |

---

## 📅 Cronograma de UAT (Sugerido)

| Fase | Duración | Actividades |
|------|----------|-------------|
| **Preparación** | 2 días | Setup de ambiente, datos de prueba |
| **Ejecución** | 5 días | Ejecutar casos de prueba |
| **Correcciones** | 3 días | Resolver defectos encontrados |
| **Re-testing** | 2 días | Verificar correcciones |
| **Sign-off** | 1 día | Aprobación final |

**Total:** ~2 semanas

---

## 📄 Aprobaciones

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Product Owner | | | |
| UAT Lead | | | |
| Development Lead | | | |

---

**Fin del Documento UAT**

*Versión 1.0 - Generado el 14/02/2026*
