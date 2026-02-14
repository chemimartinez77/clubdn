# UAT - Tester 4: Administración
## Club Dreadnought

**Tester:** [Nombre del Tester 4]
**Fecha de Inicio:** ___/___/2026
**Fecha de Finalización:** ___/___/2026
**Rol:** ADMIN o SUPER_ADMIN (requerido)

---

## 📋 Resumen de Asignación

**Total de Casos:** 13 casos de prueba
**Tiempo Estimado:** 4-5 horas
**Complejidad:** Media-Alta
**Enfoque:** Panel administrativo completo

---

## 🎯 Áreas de Testing Asignadas

- ✅ Dashboard de Administración (1 caso)
- ✅ Aprobar Usuarios (3 casos)
- ✅ Gestión de Pagos (4 casos)
- ✅ Directorio de Miembros (4 casos)
- ✅ Gestión Financiera (1 caso)
- ✅ Configuración del Club (1 caso - parcial)

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total casos asignados | 13 |
| Casos ejecutados | __ / 13 |
| Casos PASADOS ✅ | __ |
| Casos FALLADOS ❌ | __ |
| Defectos encontrados | __ |
| Severidad crítica | __ |
| Severidad alta | __ |
| Severidad media | __ |
| Severidad baja | __ |

---

## ⚠️ IMPORTANTE: Coordinación con Tester 1

**Este tester debe aprobar el usuario creado por Tester 1 en TC-001.1**

- [ ] Verificar que Tester 1 ha completado TC-001.1 (Registro)
- [ ] Aprobar usuario "uat.tester1@clubdn.com" antes que Tester 1 ejecute TC-001.2
- [ ] Comunicar a Tester 1 cuando el usuario esté aprobado

---

## 🧪 Casos de Prueba Asignados

---

### **TC-011: Dashboard de Administración**

---

#### ✅ TC-011.1: Ver Dashboard Admin
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización del panel de administración

**Precondiciones:**
- Usuario con rol ADMIN o SUPER_ADMIN

**Pasos a Ejecutar:**
1. [ ] Navegar a "/admin/dashboard"
2. [ ] Observar título y descripción de la página
3. [ ] Revisar todas las métricas mostradas
4. [ ] Observar gráfico de crecimiento
5. [ ] Revisar lista de usuarios recientes
6. [ ] Verificar que los números coinciden con datos reales

**Resultado Esperado:**
- [ ] **Título y subtítulo correctos:**
  - [ ] "Dashboard de Administración"
  - [ ] "Visión general del sistema"

- [ ] **Estadísticas generales (4 cards en fila):**
  - [ ] **Total Usuarios:** 64 (o número actual)
  - [ ] **Nuevos (7 días):** X usuarios
  - [ ] **Pendiente Aprobación:** X usuarios
  - [ ] **Logins (24h):** X logins (X fallidos)

- [ ] **Sección "Usuarios por Estado":**
  - [ ] Pendiente verificación: X (X%)
  - [ ] Pendiente aprobación: X (X%)
  - [ ] Aprobados: X (X%)
  - [ ] Rechazados: X (X%)
  - [ ] Suspendidos: X (X%)
  - [ ] Percentages suman 100%
  - [ ] Badges de color según estado

- [ ] **Usuarios Recientes (últimos 5):**
  - [ ] Tabla con columnas: Avatar, Nombre, Email, Estado, Fecha
  - [ ] Avatar o inicial visible
  - [ ] Estado con badge (APPROVED, PENDING, etc.)
  - [ ] Fecha formateada: "29 ene 2026"
  - [ ] Ordenados por fecha descendente

- [ ] **Gráfico "Crecimiento de Usuarios":**
  - [ ] Últimos 7 días: X nuevos registros
  - [ ] Últimos 30 días: X nuevos registros
  - [ ] Usuarios Activos: X aprobados
  - [ ] Valores actualizados y correctos

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

### **TC-012: Aprobar Usuarios**

---

#### ✅ TC-012.1: Ver Solicitudes Pendientes
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar lista de usuarios pendientes de aprobación

**Precondiciones:**
- Al menos un usuario en estado PENDING_APPROVAL
- **Tester 1 debe haber completado TC-001.1 primero**

**Pasos a Ejecutar:**
1. [ ] Navegar a "/admin/pending-approvals"
2. [ ] Observar título de la página
3. [ ] Verificar botón "Actualizar"
4. [ ] Revisar lista de usuarios pendientes
5. [ ] Hacer clic en "Actualizar" para refrescar
6. [ ] Observar contador de usuarios

**Resultado Esperado:**
- [ ] **Título correcto:** "Aprobar Usuarios"
- [ ] **Subtítulo:** "Gestiona las solicitudes de registro de nuevos usuarios"
- [ ] **Botón "Actualizar" funcional:**
  - [ ] Icono de refresh
  - [ ] Al hacer clic, recarga la lista
  - [ ] Se deshabilita durante carga
- [ ] **Card con header:**
  - [ ] "Usuarios Pendientes de Aprobación"
  - [ ] Contador: "X usuarios" (badge azul)
- [ ] **Tabla con columnas:**
  - [ ] Usuario (avatar, nombre, email)
  - [ ] Fecha de Registro
  - [ ] Acciones
- [ ] **Por cada usuario pendiente:**
  - [ ] Avatar con inicial en círculo
  - [ ] Nombre en negrita
  - [ ] Email debajo del nombre
  - [ ] Fecha formateada: "29 de enero de 2026, 10:12"
  - [ ] Botón "Aprobar" (verde)
  - [ ] Botón "Rechazar" (rojo)
- [ ] **Usuarios ya procesados:**
  - [ ] Fondo gris claro
  - [ ] Texto más tenue
  - [ ] "Aprobada por [Nombre Admin]" o "Rechazada por [Nombre Admin]"
- [ ] **Si no hay pendientes:**
  - [ ] Icono de check grande
  - [ ] "No hay solicitudes pendientes"
  - [ ] "Todas las solicitudes han sido procesadas"

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-012.2: Aprobar Usuario
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar flujo de aprobación de usuario

**Precondiciones:**
- Usuario en estado PENDING_APPROVAL (el de Tester 1)

**Usuario a Aprobar:**
- Email: uat.tester1@clubdn.com
- Nombre: Usuario Prueba UAT 1

**Pasos a Ejecutar:**
1. [ ] Localizar usuario "uat.tester1@clubdn.com" en la lista
2. [ ] Hacer clic en botón "Aprobar" (verde con check)
3. [ ] Observar modal de confirmación
4. [ ] (Opcional) Añadir mensaje personalizado: "Bienvenido al Club DN - UAT Test"
5. [ ] Hacer clic en "Confirmar" o "Aprobar"
6. [ ] Observar notificación
7. [ ] Verificar que usuario desaparece de pendientes
8. [ ] **Comunicar a Tester 1 que el usuario está aprobado**

**Resultado Esperado:**
- [ ] **Modal de confirmación abre:**
  - [ ] Título: "Aprobar Usuario"
  - [ ] Muestra nombre del usuario
  - [ ] Muestra email del usuario
  - [ ] Campo opcional: "Mensaje personalizado de bienvenida"
  - [ ] Botón "Confirmar" o "Aprobar"
  - [ ] Botón "Cancelar"

- [ ] **Al confirmar aprobación:**
  - [ ] Modal se cierra
  - [ ] Usuario actualizado a estado APPROVED en BD
  - [ ] Usuario removido de lista de pendientes (o movido a "procesados")
  - [ ] Notificación de éxito: "Usuario aprobado exitosamente"
  - [ ] Email de bienvenida enviado al usuario
  - [ ] Lista se actualiza automáticamente (sin refresh manual)

- [ ] **En historial del usuario:**
  - [ ] Marca visible: "Aprobada por [Tu Nombre]"
  - [ ] Fecha de aprobación
  - [ ] Mensaje personalizado guardado (si se añadió)

- [ ] **Usuario ahora puede:**
  - [ ] Iniciar sesión correctamente
  - [ ] Acceder a todas las funcionalidades del club

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-012.3: Rechazar Usuario
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar flujo de rechazo de usuario

**Precondiciones:**
- Usuario en estado PENDING_APPROVAL
- **Crear un usuario de prueba temporal para este test**

**Usuario Temporal de Prueba:**
- Registrar cuenta: "rechazo.uat@clubdn.com"
- Nombre: "Usuario Rechazo UAT"
- Verificar email
- Esperar que aparezca en pendientes

**Pasos a Ejecutar:**
1. [ ] Localizar usuario "rechazo.uat@clubdn.com"
2. [ ] Hacer clic en botón "Rechazar" (rojo con X)
3. [ ] Observar modal de rechazo
4. [ ] Seleccionar razón: "Datos incompletos" o "Otro"
5. [ ] Añadir mensaje personalizado (opcional): "Datos de registro incompletos"
6. [ ] Confirmar rechazo
7. [ ] Observar resultado

**Resultado Esperado:**
- [ ] **Modal de rechazo abre:**
  - [ ] Título: "Rechazar Usuario"
  - [ ] Muestra nombre y email del usuario
  - [ ] Campo "Razón del rechazo":
    - [ ] Opciones: Datos incompletos / Duplicado / Otro
    - [ ] Dropdown o radio buttons
  - [ ] Campo "Mensaje personalizado" (opcional)
  - [ ] Botón "Confirmar Rechazo"
  - [ ] Botón "Cancelar"

- [ ] **Al confirmar rechazo:**
  - [ ] Usuario actualizado a estado REJECTED
  - [ ] Usuario removido de lista de pendientes
  - [ ] Notificación: "Usuario rechazado"
  - [ ] Email de rechazo enviado (si configurado)
  - [ ] Lista actualizada automáticamente

- [ ] **En historial:**
  - [ ] "Rechazada por [Tu Nombre]"
  - [ ] Razón del rechazo guardada
  - [ ] Mensaje personalizado guardado

- [ ] **Usuario rechazado:**
  - [ ] No puede iniciar sesión
  - [ ] Recibe email de rechazo (si aplica)

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

### **TC-013: Gestión de Pagos**

---

#### ✅ TC-013.1: Ver Panel de Pagos
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización del panel de gestión de pagos

**Pasos a Ejecutar:**
1. [ ] Navegar a "/admin/membership"
2. [ ] Observar título y descripción
3. [ ] Revisar todos los controles y filtros
4. [ ] Observar tabla de pagos
5. [ ] Revisar encabezados de columnas

**Resultado Esperado:**
- [ ] **Título correcto:** "Gestión de Pagos"
- [ ] **Subtítulo:** "Control de pagos mensuales de membresías"

- [ ] **Selector de año:**
  - [ ] Label: "Año:"
  - [ ] Dropdown con opciones: 2025, 2026, 2027
  - [ ] Año actual seleccionado por defecto (2026)

- [ ] **Filtros disponibles:**
  - [ ] **Barra de búsqueda:**
    - [ ] Placeholder: "Buscar por nombre..."
    - [ ] Filtra en tiempo real mientras escribes

  - [ ] **Filtro por tipo de membresía:**
    - [ ] "Cualquier tipo de miembro"
    - [ ] COLABORADOR
    - [ ] SOCIO
    - [ ] FAMILIAR
    - [ ] EN PRUEBAS
    - [ ] BAJA

  - [ ] **Checkboxes de estado:**
    - [ ] ☑️ Nuevo
    - [ ] ☑️ Pendiente
    - [ ] ☑️ Impagado
    - [ ] ☑️ Pagado
    - [ ] ☑️ Año completo
    - [ ] Todos marcados por defecto

- [ ] **Tabla principal:**
  - [ ] **Columnas:**
    - [ ] Nombre (con badge de tipo de membresía)
    - [ ] Estado (badge de color)
    - [ ] Acciones (botón "Año completo")
    - [ ] ENE, FEB, MAR, ABR, MAY, JUN, JUL, AGO, SEP, OCT, NOV, DIC (12 columnas)

  - [ ] **Por cada usuario:**
    - [ ] Nombre visible
    - [ ] Badge de tipo (SOCIO/COLABORADOR/etc.)
    - [ ] Badge de estado con color:
      - Nuevo: azul
      - Pendiente: amarillo
      - Impagado: rojo
      - Pagado: verde
      - Año completo: color primario
    - [ ] Botón "Año completo"
    - [ ] 12 checkboxes (uno por mes)

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-013.2: Marcar Pago Mensual
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar marcado de pago individual

**Usuario de Prueba:**
- Buscar: "Adriancito Romero" (o cualquier usuario real)

**Pasos a Ejecutar:**
1. [ ] Buscar usuario "Adriancito Romero" en barra de búsqueda
2. [ ] Localizar checkbox de "ENE" (Enero)
3. [ ] Verificar estado actual (marcado/desmarcado)
4. [ ] Hacer clic en checkbox de "ENE"
5. [ ] Observar cambios
6. [ ] Verificar estado del usuario
7. [ ] Hacer clic de nuevo para desmarcar
8. [ ] Observar cambios al desmarcar

**Resultado Esperado:**
- [ ] **Al marcar checkbox:**
  - [ ] Checkbox se marca inmediatamente
  - [ ] Cambio guardado en BD sin delay perceptible
  - [ ] Si es el **primer pago del año** y usuario es "NUEVO":
    - [ ] Estado cambia a "PENDIENTE"
    - [ ] Badge actualizado
  - [ ] Si ya tenía pagos, no cambia estado
  - [ ] Contador interno de meses pagados se actualiza

- [ ] **Al desmarcar checkbox:**
  - [ ] Checkbox se desmarca
  - [ ] Pago removido de BD
  - [ ] Si era el único mes pagado:
    - [ ] Estado vuelve a "NUEVO"
  - [ ] Si quedan otros meses pagados:
    - [ ] Estado se mantiene

- [ ] **Persistencia:**
  - [ ] Al refrescar página, cambio persiste
  - [ ] Estado correcto en BD

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-013.3: Marcar Año Completo
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar marcado de todos los meses del año

**Usuario de Prueba:**
- Buscar un usuario con algunos meses sin pagar

**Pasos a Ejecutar:**
1. [ ] Buscar usuario
2. [ ] Verificar que NO todos los meses están pagados
3. [ ] Hacer clic en botón "Año completo"
4. [ ] Observar confirmación
5. [ ] Confirmar acción
6. [ ] Observar resultado

**Resultado Esperado:**
- [ ] **Al hacer clic en "Año completo":**
  - [ ] Confirmación solicitada:
    - [ ] Mensaje: "¿Marcar todos los meses del ciclo en curso como pagados?"
    - [ ] Botones: "Sí" / "Cancelar"

- [ ] **Al confirmar:**
  - [ ] Todos los 12 checkboxes se marcan
  - [ ] Estado del usuario cambia a "ANO_COMPLETO"
  - [ ] Badge actualizado con color primario (verde/azul)
  - [ ] Notificación de éxito visible
  - [ ] Cambios guardados en BD

- [ ] **Validaciones:**
  - [ ] Si todos los meses ya están pagados, botón podría estar deshabilitado
  - [ ] Estado "AÑO_COMPLETO" persiste

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-013.4: Filtrar por Estado de Pago
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar filtros de estado

**Pasos a Ejecutar:**
1. [ ] Observar número total de usuarios en tabla
2. [ ] Desmarcar checkbox "Pagado"
3. [ ] Observar cambios en lista
4. [ ] Desmarcar checkbox "Año completo"
5. [ ] Observar resultados
6. [ ] Volver a marcar todos los checkboxes
7. [ ] Probar combinación de filtros:
   - Tipo: "SOCIO"
   - Estado: Solo "Pendiente"
   - Año: 2026

**Resultado Esperado:**
- [ ] **Filtros funcionan correctamente:**
  - [ ] Al desmarcar "Pagado":
    - [ ] Solo se muestran usuarios NO en estado "PAGADO"
    - [ ] Lista se actualiza inmediatamente

  - [ ] Al desmarcar "Año completo":
    - [ ] Solo se muestran usuarios NO en estado "ANO_COMPLETO"

  - [ ] Con solo "Nuevo", "Pendiente" e "Impagado" marcados:
    - [ ] Solo esos estados visibles
    - [ ] Usuarios "Pagado" y "Año completo" ocultos

- [ ] **Contador actualizado:**
  - [ ] "Mostrando X de Y juegos" (si hay contador)
  - [ ] Refleja filtros aplicados

- [ ] **Combinación de filtros:**
  - [ ] Filtros múltiples funcionan en conjunto
  - [ ] Tipo + Estado + Búsqueda funcionan simultáneamente
  - [ ] Resultados correctos según todos los criterios

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

### **TC-014: Directorio de Miembros**

---

#### ✅ TC-014.1: Ver Directorio
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar lista completa de miembros

**Pasos a Ejecutar:**
1. [ ] Navegar a "/admin/members"
2. [ ] Observar título y controles
3. [ ] Revisar tabla de miembros
4. [ ] Probar paginación
5. [ ] Observar información de cada miembro

**Resultado Esperado:**
- [ ] **Título:** "Directorio de Miembros"
- [ ] **Subtítulo:** "Gestiona y consulta la información de todos los miembros del club"

- [ ] **Botones de acción:**
  - [ ] "Actualizar" (icono refresh)
  - [ ] "Exportar CSV" (icono download)

- [ ] **Filtros disponibles:**
  - [ ] Buscar por nombre o email (input text)
  - [ ] Tipo de membresía (dropdown):
    - Todos / SOCIO / COLABORADOR / FAMILIAR / EN_PRUEBAS / BAJA
  - [ ] Estado de pago (dropdown):
    - Todos / Nuevo / Pendiente / Pagado / Impagado / Año completo
  - [ ] Fecha desde (date picker)
  - [ ] Fecha hasta (date picker)
  - [ ] Registros por página: 25 (dropdown: 10/25/50/100)
  - [ ] Botón "Limpiar filtros"

- [ ] **Contador:**
  - [ ] "Mostrando 25 de 54 miembros" (ejemplo)

- [ ] **Tabla con columnas:**
  - [ ] Nombre
  - [ ] Email
  - [ ] Tipo (badge)
  - [ ] Fecha Incorporación
  - [ ] Estado de Pago (badge)
  - [ ] Acciones: "Ver" | "Dar de baja"

- [ ] **Por cada miembro:**
  - [ ] Nombre completo
  - [ ] Email válido
  - [ ] Badge de tipo con color
  - [ ] Fecha formateada: "12 de abril de 2023"
  - [ ] Badge de estado de pago con color
  - [ ] Botón "Ver" (verde/azul)
  - [ ] Botón "Dar de baja" (rojo)

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-014.2: Exportar CSV
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar exportación de datos

**Pasos a Ejecutar:**
1. [ ] **Prueba 1: Exportar todos**
   - Sin filtros aplicados
   - Hacer clic en "Exportar CSV"
   - Verificar descarga

2. [ ] **Prueba 2: Exportar con filtros**
   - Aplicar filtro: Tipo = "SOCIO"
   - Hacer clic en "Exportar CSV"
   - Verificar que solo exporta socios

3. [ ] Abrir archivo CSV descargado
4. [ ] Verificar contenido y formato

**Resultado Esperado:**
- [ ] **Descarga exitosa:**
  - [ ] Archivo CSV descargado
  - [ ] Nombre de archivo: "miembros_YYYYMMDD.csv" o similar

- [ ] **Contenido del CSV:**
  - [ ] **Columnas incluidas:**
    - Nombre
    - Email
    - Tipo
    - Fecha Incorporación
    - Estado de Pago
  - [ ] Datos correctos para cada usuario
  - [ ] Formato CSV válido (comas, comillas si es necesario)
  - [ ] Encoding correcto (UTF-8, caracteres especiales visibles)

- [ ] **Respeta filtros:**
  - [ ] Si filtros aplicados, solo exporta usuarios filtrados
  - [ ] Sin filtros, exporta todos los usuarios

- [ ] **Se puede abrir en:**
  - [ ] Excel
  - [ ] Google Sheets
  - [ ] Editor de texto

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-014.3: Ver Detalle de Miembro
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar vista detallada de un miembro

**Pasos a Ejecutar:**
1. [ ] Seleccionar un usuario de la lista
2. [ ] Hacer clic en botón "Ver"
3. [ ] Revisar información mostrada
4. [ ] Cerrar modal/vista

**Resultado Esperado:**
- [ ] **Modal o página de detalle abre**
- [ ] **Información completa visible:**
  - [ ] **Datos personales:**
    - Nombre completo
    - Email
    - Teléfono
    - Fecha de nacimiento
    - Tipo de membresía
    - Fecha de incorporación

  - [ ] **Historial de pagos:**
    - Meses pagados del año actual
    - Años anteriores (si aplica)
    - Estado de pago actual

  - [ ] **Eventos asistidos:**
    - Lista de eventos
    - Fechas
    - Juegos jugados

  - [ ] **Badges desbloqueados:**
    - Lista de logros
    - Fechas de desbloqueo

  - [ ] **Actividad reciente:**
    - Últimas acciones
    - Último login

- [ ] **Cerrar vista funciona**

**Nota:** Si esta funcionalidad no está implementada, documentarlo como funcionalidad faltante.

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-014.4: Dar de Baja a Miembro
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar proceso de baja de usuario

**⚠️ PRECAUCIÓN:**
- Usar usuario de prueba temporal
- NO dar de baja a usuarios reales del sistema
- Crear cuenta "baja.uat@clubdn.com" para esta prueba

**Usuario de Prueba:**
- Crear cuenta: "baja.uat@clubdn.com"
- Aprobar usuario
- Usar para prueba de baja

**Pasos a Ejecutar:**
1. [ ] Localizar usuario "baja.uat@clubdn.com"
2. [ ] Hacer clic en botón "Dar de baja" (rojo)
3. [ ] Observar confirmación
4. [ ] Confirmar acción
5. [ ] Observar resultado
6. [ ] Intentar login con ese usuario

**Resultado Esperado:**
- [ ] **Confirmación solicitada:**
  - [ ] Mensaje claro: "¿Estás seguro de dar de baja a este usuario?"
  - [ ] Advertencia sobre consecuencias
  - [ ] Botones: "Confirmar" / "Cancelar"

- [ ] **Al confirmar:**
  - [ ] Tipo de membresía cambia a "BAJA"
  - [ ] Badge actualizado con color gris
  - [ ] Usuario NO eliminado (solo marcado como baja)
  - [ ] Email de notificación enviado al usuario (opcional)
  - [ ] Lista actualizada
  - [ ] Usuario aún visible en directorio con tipo "BAJA"

- [ ] **Usuario dado de baja:**
  - [ ] No puede iniciar sesión
  - [ ] Mensaje: "Tu cuenta ha sido desactivada"
  - [ ] Datos preservados en BD (no eliminados)

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

### **TC-016: Gestión Financiera**

---

#### ✅ TC-016.1: Ver Panel Financiero
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar panel de gestión financiera

**Pasos a Ejecutar:**
1. [ ] Navegar a "/financiero"
2. [ ] Observar interfaz del panel
3. [ ] Revisar métricas mostradas
4. [ ] Verificar gráficos (si hay)
5. [ ] Probar filtros de fecha (si hay)

**Resultado Esperado:**
- [ ] Panel financiero accesible
- [ ] **Resumen financiero visible:**
  - [ ] Ingresos del mes actual
  - [ ] Ingresos del año actual
  - [ ] Comparativa mes anterior

- [ ] **Ingresos por membresías:**
  - [ ] Desglose por tipo (SOCIO/COLABORADOR/etc.)
  - [ ] Total recaudado
  - [ ] Pendiente de cobro

- [ ] **Gastos del club:** (si aplica)
  - [ ] Categorías de gastos
  - [ ] Total gastado

- [ ] **Balance general:**
  - [ ] Ingresos - Gastos = Balance
  - [ ] Gráfico de evolución (si aplica)

**Nota:** Si esta página no existe o está en desarrollo, documentarlo.

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

### **TC-017: Configuración del Club**

---

#### ✅ TC-017.1: Ver Configuración
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar panel de configuración general

**Pasos a Ejecutar:**
1. [ ] Navegar a "/admin/config"
2. [ ] Observar secciones de configuración
3. [ ] Revisar opciones editables
4. [ ] NO realizar cambios (solo observar)

**Resultado Esperado:**
- [ ] Panel de configuración accesible
- [ ] **Configuraciones generales editables:**
  - [ ] Nombre del club
  - [ ] Descripción
  - [ ] Logo
  - [ ] Datos de contacto

- [ ] **Parámetros del sistema:**
  - [ ] Cuota mensual por defecto
  - [ ] Número máximo de jugadores por partida
  - [ ] Configuración de emails

- [ ] **Integraciones:**
  - [ ] Configuración de BGG (API key, etc.)
  - [ ] Otras integraciones activas

- [ ] **Botón "Guardar cambios"** visible

**Nota:** NO realizar cambios reales en configuración. Solo verificar acceso y visibilidad.

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Tiempo de Ejecución:** ___ minutos

---

## 📝 Registro de Defectos Encontrados

### DEF-T4-001
**Severidad:** ⬜ Crítico | ⬜ Alto | ⬜ Medio | ⬜ Bajo
**Caso de Prueba:** TC-___._
**Título:** [Descripción breve]

**Descripción:**
```
[Descripción detallada del problema]
```

**Pasos para Reproducir:**
1.
2.
3.

**Resultado Esperado:**
```
[Qué debería pasar]
```

**Resultado Actual:**
```
[Qué pasa realmente]
```

**Navegador/Dispositivo:**
```
[Chrome 120 / Firefox 121 / Mobile Safari iOS 17]
```

**Captura de Pantalla:**
```
[Ruta o descripción]
```

---

## 📋 Notas Adicionales

**Observaciones Generales:**
```
[Cualquier nota, sugerencia o comentario sobre la experiencia de testing]
```

**Mejoras Sugeridas:**
```
[Ideas de mejora que no son defectos]
```

**Coordinación con Tester 1:**
```
- [ ] Usuario uat.tester1@clubdn.com aprobado
- [ ] Comunicado a Tester 1 que puede continuar con TC-001.2
- Fecha/hora de aprobación: _______________
```

**Usuarios de Prueba Creados:**
```
[Listar usuarios creados durante testing]
1. rechazo.uat@clubdn.com (para TC-012.3)
2. baja.uat@clubdn.com (para TC-014.4)
```

---

## ✅ Checklist de Finalización

- [ ] Todos los casos ejecutados
- [ ] Resultados documentados
- [ ] Defectos reportados con formato correcto
- [ ] Capturas adjuntas donde sea necesario
- [ ] Usuario de Tester 1 aprobado exitosamente
- [ ] Coordinación completada
- [ ] Usuarios de prueba documentados
- [ ] Documento enviado al coordinador UAT

---

## 🗑️ Tareas de Limpieza Post-UAT

Después de completar el UAT, **decidir qué hacer con**:
- [ ] Usuario "rechazo.uat@clubdn.com" (mantener rechazado o eliminar)
- [ ] Usuario "baja.uat@clubdn.com" (mantener dado de baja o eliminar)

---

**Firma del Tester:** _____________________
**Fecha de Entrega:** ___/___/2026

---

**Fin del Documento - Tester 4**
