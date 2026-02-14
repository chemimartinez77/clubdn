# UAT - Tester 3: Documentos y Feedback
## Club Dreadnought

**Tester:** [Nombre del Tester 3]
**Fecha de Inicio:** ___/___/2026
**Fecha de Finalización:** ___/___/2026
**Rol:** Usuario con permisos ADMIN (para TC-006.2)

---

## 📋 Resumen de Asignación

**Total de Casos:** 6 casos de prueba
**Tiempo Estimado:** 2-3 horas
**Complejidad:** Baja
**Enfoque:** Gestión de documentos, sistema de feedback y eventos admin

---

## 🎯 Áreas de Testing Asignadas

- ✅ Gestión de Documentos (3 casos)
- ✅ Sistema de Feedback (2 casos)
- ✅ Gestión de Eventos Admin (1 caso)

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total casos asignados | 6 |
| Casos ejecutados | __ / 6 |
| Casos PASADOS ✅ | __ |
| Casos FALLADOS ❌ | __ |
| Defectos encontrados | __ |
| Severidad crítica | __ |
| Severidad alta | __ |
| Severidad media | __ |
| Severidad baja | __ |

---

## 🧪 Casos de Prueba Asignados

---

### **TC-006: Gestión de Documentos**

---

#### ✅ TC-006.1: Ver Documentos del Club
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar acceso a documentos compartidos

**Pasos a Ejecutar:**
1. [ ] Navegar a "/documentos"
2. [ ] Observar estadísticas en la parte superior
3. [ ] Revisar documentos listados
4. [ ] Observar información de cada documento
5. [ ] Usar barra de búsqueda (si hay documentos)
6. [ ] Probar filtro de visibilidad

**Resultado Esperado:**
- [ ] Estadísticas visibles:
  - [ ] Total Documentos: (número actual)
  - [ ] Documentos Públicos: (número)
  - [ ] Solo Admins: (número)
  - [ ] Espacio Usado: X.XX MB
- [ ] Cada documento muestra:
  - [ ] Icono según tipo de archivo (PDF, PNG, etc.)
  - [ ] Nombre del documento
  - [ ] Nombre del archivo con extensión
  - [ ] Tamaño (KB/MB)
  - [ ] Fecha de subida: DD/MM/YYYY
  - [ ] Visibilidad: Badge "Todos los miembros" o "Solo Admins"
  - [ ] Botón de descarga (icono azul)
  - [ ] Botón de eliminar (icono rojo, solo si eres admin)
- [ ] Barra de búsqueda funciona
- [ ] Filtro "Todas las visibilidades" funciona
- [ ] Panel informativo visible:
  - [ ] Texto explicativo sobre documentos del club
  - [ ] Tamaño máximo: 20MB por archivo

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

#### ✅ TC-006.2: Subir Nuevo Documento (Admin)
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que administradores pueden subir documentos

**Precondiciones:**
- Usuario con rol ADMIN o SUPER_ADMIN
- Archivo de prueba preparado (PDF < 20MB)

**Archivos de Prueba a Subir:**
1. **Documento PDF:** "Reglamento_UAT_Test.pdf" (~500KB)
2. **Imagen PNG:** "Logo_Club_Test.png" (~100KB)
3. **Documento grande:** Archivo de ~15MB (para probar límite)

**Pasos a Ejecutar:**
1. [ ] **Prueba 1: Documento PDF Público**
   - Hacer clic en "Subir Documento"
   - Completar formulario:
     - Título: "Reglamento de Prueba UAT"
     - Archivo: [Seleccionar PDF]
     - Visibilidad: "Público"
   - Hacer clic en "Subir"
   - Observar resultado

2. [ ] **Prueba 2: Imagen Solo Admins**
   - Hacer clic en "Subir Documento"
   - Completar:
     - Título: "Logo Interno UAT"
     - Archivo: [Seleccionar PNG]
     - Visibilidad: "Solo Admins"
   - Subir
   - Verificar que solo admins pueden verlo

3. [ ] **Prueba 3: Archivo Grande**
   - Intentar subir archivo de ~15MB
   - Verificar que se permite

4. [ ] **Prueba 4: Archivo Demasiado Grande**
   - Intentar subir archivo > 20MB (si es posible)
   - Verificar mensaje de error

**Resultado Esperado:**
- [ ] **Modal de subida abre correctamente**
- [ ] **Campos del formulario:**
  - [ ] Campo "Título" (texto)
  - [ ] Campo "Archivo" (file upload)
  - [ ] Campo "Visibilidad" (select: Público/Solo Admins)
- [ ] **Subida exitosa:**
  - [ ] Archivo cargado correctamente
  - [ ] Documento aparece en lista inmediatamente
  - [ ] Notificación de éxito visible
  - [ ] Espacio usado actualizado
  - [ ] Si es público: Notificación enviada a todos los miembros
- [ ] **Validaciones:**
  - [ ] No permite archivos > 20MB
  - [ ] Muestra mensaje de error claro si excede tamaño
  - [ ] Acepta formatos: PDF, PNG, JPG, DOC, DOCX, XLS, XLSX
- [ ] **Visibilidad:**
  - [ ] Documentos "Solo Admins" tienen badge correcto
  - [ ] Documentos "Público" visibles para todos

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Nota:** Después de las pruebas, **eliminar los documentos de prueba** para no saturar el sistema.

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-006.3: Descargar Documento
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar descarga de documentos

**Pasos a Ejecutar:**
1. [ ] Localizar un documento en la lista (usar uno subido en TC-006.2)
2. [ ] Hacer clic en botón de descarga (icono azul)
3. [ ] Verificar descarga en navegador
4. [ ] Abrir archivo descargado
5. [ ] Verificar integridad del contenido

**Resultado Esperado:**
- [ ] Click en botón de descarga inicia descarga inmediatamente
- [ ] Archivo descargado correctamente
- [ ] Nombre de archivo correcto (sin caracteres extraños)
- [ ] Extensión correcta (.pdf, .png, etc.)
- [ ] Contenido íntegro (archivo se abre correctamente)
- [ ] Tamaño del archivo coincide con el mostrado

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

### **TC-007: Sistema de Feedback**

---

#### ✅ TC-007.1: Enviar Reporte de Bug
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar envío de feedback/bug reports

**Pasos a Ejecutar:**
1. [ ] Navegar a "/feedback"
2. [ ] Observar interfaz del formulario
3. [ ] **Reporte 1: Bug con captura**
   - Tipo: "Bug"
   - Gravedad: "Me molesta"
   - Título: "No puedo subir foto del evento"
   - Descripción: "Al intentar subir una foto del evento, aparece un error y la imagen no se carga correctamente."
   - Captura: [Subir imagen de prueba]
   - Clic en "Enviar reporte"

4. [ ] **Reporte 2: Mejora sin captura**
   - Tipo: "Mejora"
   - Gravedad: "Sería genial"
   - Título: "Añadir filtro por fecha en eventos"
   - Descripción: "Sería útil poder filtrar eventos por rango de fechas en el calendario."
   - Captura: [Dejar vacío]
   - Enviar

5. [ ] **Reporte 3: Otro**
   - Tipo: "Otro"
   - Gravedad: "Es un bloqueante"
   - Título: "Sugerencia general de UX"
   - Descripción: "El botón de crear partida podría ser más visible en mobile."
   - Enviar

**Resultado Esperado:**
- [ ] **Formulario visible con campos:**
  - [ ] Tipo: Select (Bug / Mejora / Otro)
  - [ ] Gravedad: Select (Es un bloqueante / Me molesta / Sería genial)
  - [ ] Título: Input texto
  - [ ] Descripción: Textarea
  - [ ] Captura (opcional): File upload
  - [ ] Botón "Enviar reporte"

- [ ] **Envío exitoso:**
  - [ ] Reporte enviado correctamente
  - [ ] Mensaje de confirmación visible
  - [ ] Formulario se limpia después de enviar
  - [ ] Reporte aparece en "Tablero público" inmediatamente

- [ ] **En Tablero Público:**
  - [ ] Reporte visible con:
    - [ ] Badge "Nuevo" (estado)
    - [ ] Badge de tipo (Bug/Mejora/Otro)
    - [ ] Badge de gravedad con color:
      - "Es un bloqueante" = Rojo
      - "Me molesta" = Amarillo
      - "Sería genial" = Verde
    - [ ] Título
    - [ ] Descripción (completa o truncada)
    - [ ] Fecha de reporte
    - [ ] Nombre del reportador
    - [ ] Contador de votos 🔥 (inicialmente 0)
    - [ ] Imagen de captura (si se subió)

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

#### ✅ TC-007.2: Ver Reportes Públicos
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización de reportes enviados

**Pasos a Ejecutar:**
1. [ ] Scrollear a sección "Tablero público"
2. [ ] Observar reportes existentes (incluidos los del TC-007.1)
3. [ ] Probar filtro "Mis reportes"
4. [ ] Probar filtro "Más votados"
5. [ ] Cambiar filtro de estado:
   - [ ] Todos
   - [ ] Nuevo
   - [ ] En progreso
   - [ ] Resuelto
6. [ ] Votar en un reporte (hacer clic en 🔥)
7. [ ] Intentar votar de nuevo en el mismo reporte

**Resultado Esperado:**
- [ ] **Filtros funcionan correctamente:**
  - [ ] "Mis reportes" muestra solo reportes del usuario actual
  - [ ] "Más votados" ordena por número de votos (descendente)
  - [ ] Filtro de estado (todos/nuevo/en progreso/resuelto) funciona
  - [ ] Se pueden combinar filtros

- [ ] **Reportes visibles con toda la información:**
  - [ ] Título destacado
  - [ ] Descripción completa
  - [ ] Estado con badge de color
  - [ ] Tipo (Bug/Mejora/Otro)
  - [ ] Gravedad con badge de color
  - [ ] Votos 🔥 con contador
  - [ ] Reportador: "Reportado por [Nombre]"
  - [ ] Fecha: "3/2/2026" (formato)
  - [ ] Captura visible si la hay (imagen expandible)

- [ ] **Sistema de votos:**
  - [ ] Botón de voto (🔥) funciona
  - [ ] Contador aumenta inmediatamente
  - [ ] No se puede votar múltiples veces en el mismo reporte
  - [ ] Mensaje de error o botón deshabilitado si ya votaste

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

### **TC-015: Gestión de Eventos (Admin)**

---

#### ✅ TC-015.1: Ver Panel de Gestión de Eventos
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar panel administrativo de eventos

**Precondiciones:**
- Usuario con rol ADMIN o SUPER_ADMIN

**Pasos a Ejecutar:**
1. [ ] Navegar a "/admin/events"
2. [ ] Observar interfaz del panel
3. [ ] Revisar lista de eventos mostrada
4. [ ] Probar filtros disponibles
5. [ ] Observar opciones de acción por evento
6. [ ] Revisar estadísticas (si hay)

**Resultado Esperado:**
- [ ] Panel de gestión de eventos accesible
- [ ] Lista completa de eventos visible:
  - [ ] Eventos pasados
  - [ ] Eventos presentes
  - [ ] Eventos futuros
- [ ] Información por evento:
  - [ ] Nombre del juego
  - [ ] Fecha y hora
  - [ ] Organizador
  - [ ] Asistentes (X/Y)
  - [ ] Estado
- [ ] Filtros avanzados disponibles:
  - [ ] Por fecha
  - [ ] Por organizador
  - [ ] Por estado
  - [ ] Por juego
- [ ] Opciones de edición/eliminación:
  - [ ] Editar cualquier evento (no solo los propios)
  - [ ] Eliminar evento
  - [ ] Cerrar/abrir plazas
  - [ ] Ver asistentes
- [ ] Estadísticas visibles:
  - [ ] Total de eventos
  - [ ] Eventos completados
  - [ ] Tasa de asistencia promedio
  - [ ] Juegos más jugados

**Nota:** Si la página "/admin/events" no existe o muestra error 404, documentarlo como defecto de severidad media (funcionalidad faltante).

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

### DEF-T3-001
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

**Documentos de Prueba Creados:**
```
[Listar documentos subidos durante TC-006.2 para facilitar limpieza]
1. Reglamento_UAT_Test.pdf
2. Logo_Club_Test.png
3. [Otros]
```

**Reportes de Feedback Creados:**
```
[Listar reportes creados en TC-007.1]
1. "No puedo subir foto del evento"
2. "Añadir filtro por fecha en eventos"
3. "Sugerencia general de UX"
```

---

## ✅ Checklist de Finalización

- [ ] Todos los casos ejecutados
- [ ] Resultados documentados
- [ ] Defectos reportados con formato correcto
- [ ] Capturas adjuntas donde sea necesario
- [ ] Documentos de prueba eliminados del sistema
- [ ] Reportes de feedback dejados en el sistema (para revisión)
- [ ] Documento enviado al coordinador UAT

---

## 🗑️ Tareas de Limpieza Post-UAT

Después de completar el UAT, **eliminar**:
- [ ] Documentos subidos en TC-006.2
- [ ] (Opcional) Reportes de feedback de prueba en TC-007.1

---

**Firma del Tester:** _____________________
**Fecha de Entrega:** ___/___/2026

---

**Fin del Documento - Tester 3**
