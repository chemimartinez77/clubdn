# UAT - Tester 2: Eventos y Partidas
## Club Dreadnought

**Tester:** [Nombre del Tester 2]
**Fecha de Inicio:** ___/___/2026
**Fecha de Finalización:** ___/___/2026
**Rol:** Usuario estándar (sin permisos admin)

---

## 📋 Resumen de Asignación

**Total de Casos:** 10 casos de prueba
**Tiempo Estimado:** 4-5 horas
**Complejidad:** Media
**Enfoque:** Sistema de eventos, calendario, partidas y ludoteca

---

## 🎯 Áreas de Testing Asignadas

- ✅ Gestión de Eventos y Partidas (5 casos)
- ✅ Ludoteca del Club (3 casos)
- ✅ Sistema de Badges (2 casos)

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total casos asignados | 10 |
| Casos ejecutados | __ / 10 |
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

### **TC-003: Gestión de Eventos y Partidas**

---

#### ✅ TC-003.1: Ver Calendario de Eventos
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización correcta del calendario

**Pasos a Ejecutar:**
1. [ ] Navegar a "/events"
2. [ ] Observar vista por defecto (Mes/Semana/Día)
3. [ ] Cambiar a vista "Mes"
4. [ ] Cambiar a vista "Semana"
5. [ ] Cambiar a vista "Día"
6. [ ] Navegar al mes siguiente
7. [ ] Navegar al mes anterior
8. [ ] Volver a "Hoy"
9. [ ] Observar eventos programados en diferentes fechas

**Resultado Esperado:**
- [ ] Calendario renderiza correctamente
- [ ] Eventos visibles en fechas correctas
- [ ] Cambio de vista funciona sin errores
- [ ] Navegación entre fechas fluida
- [ ] Botones de navegación (< Hoy >) funcionan
- [ ] Indicadores visuales:
  - [ ] "Con plazas" (días con eventos disponibles)
  - [ ] "Completo" (eventos sin plazas)
  - [ ] "Hoy" destacado con color diferente
- [ ] Número de partidas por día visible
- [ ] Filtros disponibles:
  - [ ] "Con plazas"
  - [ ] "Completo"
  - [ ] "Sin partidas"
  - [ ] "Hoy"
  - [ ] "Clic en un día para ver el detalle"

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

#### ✅ TC-003.2: Ver Detalle de Evento
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que se puede ver información completa de un evento

**Pasos a Ejecutar:**
1. [ ] Desde el calendario, hacer clic en un evento existente
2. [ ] Revisar toda la información mostrada
3. [ ] Verificar imagen del juego (si tiene)
4. [ ] Revisar lista de asistentes
5. [ ] Cerrar modal

**Resultado Esperado:**
- [ ] Modal/página de detalle abre correctamente
- [ ] Información visible:
  - [ ] Nombre del juego con imagen de BGG
  - [ ] Fecha y hora: "Viernes, 20 De Febrero De 2026, 15:04"
  - [ ] Ubicación: "Club DN"
  - [ ] Descripción del evento
  - [ ] Capacidad: "4/6 asistentes" (ejemplo)
  - [ ] Organizador: Nombre visible
  - [ ] Estado: Badge "Programado" o "Completo"
- [ ] Lista de asistentes e invitados:
  - [ ] Avatar/inicial de cada asistente
  - [ ] Nombre
  - [ ] Tipo (Socio/Colaborador)
  - [ ] Botón "Eliminar" (si eres organizador)
- [ ] Botones de acción visibles según contexto:
  - [ ] "Apuntarme" (azul) si hay plazas libres
  - [ ] "Añadir invitado" (morado) si eres asistente
  - [ ] "WhatsApp" (verde) para compartir
  - [ ] "Cerrar plazas" (amarillo) si eres organizador/admin
  - [ ] "Eliminar" (rojo) si eres admin/organizador
- [ ] Sección "Fotos (0/8)": "No hay fotos del evento"
- [ ] Información del juego (si está asociado a BGG):
  - [ ] Nota BGG
  - [ ] Bayes
  - [ ] Peso
  - [ ] Ranking
  - [ ] Jugadores
  - [ ] Duración
  - [ ] Edad
  - [ ] Año
  - [ ] Descripción
  - [ ] Categorías
  - [ ] Mecánicas
  - [ ] Diseñadores
  - [ ] Editoriales

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

#### ✅ TC-003.3: Crear Nueva Partida
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que un usuario puede organizar una partida

**Precondiciones:**
- Usuario autenticado
- Permisos para crear partidas

**Pasos a Ejecutar:**
1. [ ] Navegar a "/events/crear-partida"
2. [ ] **Prueba 1: Con juego de BGG**
   - Buscar juego en BGG: "Catan"
   - Esperar resultados
   - Seleccionar "Catan" de la lista
   - Observar si se cargan categorías automáticamente
   - Seleccionar una categoría si aparecen opciones
3. [ ] Completar formulario:
   - Título: "Partida de Catan - UAT Tester 2"
   - Descripción: "Partida de prueba para UAT - Eventos"
   - Fecha: [Seleccionar fecha futura, ej: 7 días adelante]
   - Hora: 18:00
   - Minutos: 00
   - Duración estimada - Horas: 2h
   - Duración estimada - Minutos: 30min
   - Número de jugadores: 4
   - Ubicación: "Club DN"
   - Dirección (opcional): "Calle del Club, 123"
4. [ ] Marcar checkbox "Asistir a la partida"
5. [ ] Hacer clic en "Crear Partida"
6. [ ] Observar mensaje de confirmación
7. [ ] **Prueba 2: Sin juego de BGG**
   - Repetir proceso sin buscar juego
   - Crear partida solo con título y datos básicos

**Resultado Esperado:**
- [ ] **Con juego de BGG:**
  - [ ] Búsqueda de BGG funciona y muestra resultados
  - [ ] Se puede seleccionar un juego de la lista
  - [ ] Al seleccionar juego, categorías se cargan automáticamente (si el juego tiene categorías en BD)
  - [ ] Campo de categoría solo visible si hay categorías disponibles
- [ ] **Sin juego de BGG:**
  - [ ] Se puede crear partida sin seleccionar juego
  - [ ] Campo "Elige un juego (opcional)" permite continuar vacío
- [ ] **En ambos casos:**
  - [ ] Formulario se completa sin errores
  - [ ] Validaciones funcionan (campos requeridos)
  - [ ] Partida creada exitosamente
  - [ ] Mensaje de confirmación visible
  - [ ] Evento aparece en calendario en la fecha seleccionada
  - [ ] Organizador listado automáticamente como asistente (si marcó checkbox)
  - [ ] Contador de asistentes correcto (1/4 si el organizador se apuntó)

**Validaciones Adicionales:**
- [ ] No se puede seleccionar fecha pasada
- [ ] Número de jugadores debe ser >= 1
- [ ] Duración puede ser 0 (opcional)

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Nota:** **Crear al menos 2 eventos** para que Tester 1 pueda probar TC-003.4 y TC-003.5

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-003.4: Apuntarse a una Partida
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que un usuario puede registrarse en un evento

**Precondiciones:**
- Evento con plazas disponibles
- Usuario NO apuntado al evento

**Pasos a Ejecutar:**
1. [ ] Buscar un evento con plazas libres en el calendario
2. [ ] Hacer clic en el evento
3. [ ] Verificar que hay plazas: "X/Y asistentes" donde X < Y
4. [ ] Hacer clic en botón "Apuntarme" (azul)
5. [ ] Observar cambios en la interfaz

**Resultado Esperado:**
- [ ] Usuario añadido a lista de asistentes inmediatamente
- [ ] Contador de plazas actualizado: X+1/Y
- [ ] Tu nombre/avatar aparece en lista de asistentes
- [ ] Botón "Apuntarme" cambia a "Eliminar" o desaparece
- [ ] Notificación de confirmación visible: "Te has apuntado exitosamente"
- [ ] Si aplica: Notificación enviada al organizador

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

#### ✅ TC-003.5: Darse de Baja de una Partida
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que un usuario puede salirse de un evento

**Precondiciones:**
- Usuario apuntado a un evento (usar el del TC-003.4)

**Pasos a Ejecutar:**
1. [ ] Abrir detalle del evento al que estás apuntado
2. [ ] Verificar que tu nombre aparece en lista de asistentes
3. [ ] Hacer clic en botón "Eliminar" junto a tu nombre O botón general de darse de baja
4. [ ] Si hay confirmación, aceptar
5. [ ] Observar cambios

**Resultado Esperado:**
- [ ] Usuario removido de lista de asistentes
- [ ] Plaza liberada: Contador actualizado
- [ ] Botón vuelve a "Apuntarme"
- [ ] Notificación de confirmación: "Te has dado de baja"
- [ ] Si aplica: Notificación enviada al organizador

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

### **TC-004: Ludoteca del Club**

---

#### ✅ TC-004.1: Ver Catálogo de Juegos
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización de la ludoteca

**Pasos a Ejecutar:**
1. [ ] Navegar a "/ludoteca"
2. [ ] Observar estadísticas generales en la parte superior
3. [ ] Scrollear por la lista de juegos
4. [ ] Observar información de cada juego
5. [ ] Probar paginación (ir a página 2, 3, volver a 1)
6. [ ] Cambiar número de juegos por página (10, 25, 50)

**Resultado Esperado:**
- [ ] Estadísticas visibles correctamente:
  - [ ] Total Juegos: 1204
  - [ ] Del Club: 814
  - [ ] De Socios: 390
  - [ ] Propietarios: 19
  - [ ] (Los números deben coincidir con la BD actual)
- [ ] Cada juego mostrado con:
  - [ ] Imagen de BGG
  - [ ] Nombre del juego
  - [ ] ID de BGG (número)
  - [ ] Idioma (Castellano/Inglés/Francés/etc.)
  - [ ] Condición: Badge de color (Bueno/Regular/Malo/Nuevo)
  - [ ] Propietario: Icono + nombre (Club Dreadnought o email del socio)
  - [ ] Botón "Ver detalle"
- [ ] Paginación funcional:
  - [ ] "Mostrando 1 - 10 de 1204 juegos"
  - [ ] Botones anterior/siguiente funcionan
  - [ ] Números de página funcionan
- [ ] Selector "10 por página" funciona

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

#### ✅ TC-004.2: Buscar y Filtrar Juegos
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar funcionalidad de búsqueda y filtros

**Pasos a Ejecutar:**
1. [ ] Usar barra de búsqueda:
   - Buscar "Catan"
   - Observar resultados
   - Limpiar búsqueda
2. [ ] Aplicar filtro de tipo:
   - Seleccionar "Juego de Mesa"
   - Observar que solo aparecen juegos de mesa
3. [ ] Aplicar filtro de condición:
   - Seleccionar "Malo"
   - Observar juegos en mal estado
4. [ ] Aplicar filtro de propietario:
   - Seleccionar "Club Dreadnought"
   - Seleccionar "Todos los propietarios"
5. [ ] Combinar filtros:
   - Buscar "War" + Tipo "Wargame" + Condición "Bueno"

**Resultado Esperado:**
- [ ] Búsqueda filtra resultados en tiempo real (mientras escribes)
- [ ] Filtros se aplican correctamente
- [ ] Resultados coinciden con criterios seleccionados
- [ ] Contador actualizado: "Mostrando 1 - 4 de 4 juegos" (ejemplo)
- [ ] Combinación de filtros funciona correctamente
- [ ] Si no hay resultados: Mensaje "No se encontraron juegos"

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

#### ✅ TC-004.3: Ver Detalle de Juego
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar modal de información del juego

**Pasos a Ejecutar:**
1. [ ] Buscar juego "Catan" o "Agra" en ludoteca
2. [ ] Hacer clic en "Ver detalle"
3. [ ] Revisar información mostrada
4. [ ] Scrollear por toda la información
5. [ ] Hacer clic en "Cerrar" o fuera del modal

**Resultado Esperado:**
- [ ] Modal abre correctamente
- [ ] Información completa visible:
  - [ ] **Imagen grande del juego** (de BGG)
  - [ ] **Nombre completo**
  - [ ] **Año de publicación:** 2017 (ejemplo)
  - [ ] **Información de BGG:**
    - [ ] Jugadores: 2-4
    - [ ] Tiempo de juego: 120 min (90-120 min)
    - [ ] Edad mínima: 12+
    - [ ] Complejidad: 4.34/5
    - [ ] Rating BGG: 7.28/10 (2554 votos)
    - [ ] Ranking BGG: #1524 (Estrategia #796)
  - [ ] **Descripción completa** (en inglés, texto largo)
  - [ ] **Diseñadores:** Michael Keller (II) (botones con nombres)
  - [ ] **Artistas:** Michael Menzel (botones con nombres)
  - [ ] **Categorías:** Industry / Manufacturing (tags)
  - [ ] **Mecánicas:** Area Majority / Influence, Trading, Worker Placement (tags)
  - [ ] **Editoriales:** Quined Games, Maldito Games, One Moment Games (lista)
  - [ ] **Estadísticas de Comunidad:**
    - [ ] 4159 lo tienen
    - [ ] 143 lo quieren
    - [ ] 969 en wishlist
- [ ] Botón "Cerrar" funciona
- [ ] Click fuera del modal cierra el modal

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

### **TC-005: Sistema de Badges (Logros)**

---

#### ✅ TC-005.1: Ver Badges en Perfil
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización de badges del usuario

**Pasos a Ejecutar:**
1. [ ] Navegar a "/profile"
2. [ ] Scrollear hasta sección "Logros y Badges"
3. [ ] Observar progreso general
4. [ ] Probar cada filtro de categoría:
   - [ ] Todas
   - [ ] Eurogames 🎲
   - [ ] Temáticos 🎭
   - [ ] Wargames ⚔️
   - [ ] Rol 🎲
   - [ ] Miniaturas 🗿
   - [ ] Warhammer 🔥
   - [ ] Fillers / Party 🎉
   - [ ] Catalogador 📚
5. [ ] Observar badges bloqueados vs desbloqueados

**Resultado Esperado:**
- [ ] Sección "Logros y Badges" visible
- [ ] Progreso general: "X / 48 desbloqueados (X% completado)"
- [ ] Filtros por categoría funcionan correctamente
- [ ] Al seleccionar categoría, solo se muestran badges de esa categoría
- [ ] Badges con estructura:
  - [ ] Icono/imagen del badge
  - [ ] Nombre del badge (ej: "Euro-turista", "Capataz de Recursos")
  - [ ] Nivel (Nivel 1, Nivel 2, etc.)
  - [ ] Requisito (ej: "5 juegos diferentes", "10 juegos diferentes")
- [ ] **Badges bloqueados:**
  - [ ] Mostrados en gris/deshabilitados
  - [ ] Opacidad reducida
  - [ ] Progreso visible: "0 juegos jugados"
- [ ] **Badges desbloqueados:**
  - [ ] Mostrados con color completo
  - [ ] Destacados visualmente
  - [ ] Fecha de desbloqueo (si aplica)

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

#### ✅ TC-005.2: Desbloquear Badge Automáticamente
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que badges se desbloquean al cumplir requisitos

**Precondiciones:**
- Usuario sin badge de "Eurogames Nivel 1" desbloqueado
- Requisito: Jugar 5 juegos diferentes de categoría Eurogames

**Pasos a Ejecutar:**
1. [ ] Verificar estado inicial del badge "Euro-turista Nivel 1" en perfil
2. [ ] Crear/participar en partida de juego categoría "Eurogames":
   - Crear evento con juego BGG categoría Eurogames
   - Apuntarse al evento
   - (Si es posible) Marcar evento como completado
3. [ ] **Repetir paso 2 con diferentes juegos Eurogames hasta completar 5 juegos**
4. [ ] Volver a perfil después de cada partida
5. [ ] Verificar progreso del badge
6. [ ] Observar notificación al desbloquear

**Resultado Esperado:**
- [ ] Badge muestra progreso: "3/5 juegos jugados" (ejemplo)
- [ ] Al completar requisito (5 juegos):
  - [ ] Badge se desbloquea automáticamente
  - [ ] Notificación de logro desbloqueado visible
  - [ ] Badge cambia a color completo
  - [ ] Progreso general actualizado
  - [ ] Badge visible en perfil con fecha de desbloqueo

**Nota:** Esta funcionalidad depende del sistema de asignación automática de badges. Si no funciona automáticamente, documentarlo como defecto.

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

### DEF-T2-001
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

**Coordinación con Otros Testers:**
```
- Tester 1: [Crear eventos para que pueda probar notificaciones y registro]
- Tester 3: [Notas]
- Tester 4: [Notas]
```

---

## ✅ Checklist de Finalización

- [ ] Todos los casos ejecutados
- [ ] Resultados documentados
- [ ] Defectos reportados con formato correcto
- [ ] Capturas adjuntas donde sea necesario
- [ ] Al menos 2 eventos creados para otros testers
- [ ] Coordinación con Tester 1 completada (notificaciones)
- [ ] Documento enviado al coordinador UAT

---

**Firma del Tester:** _____________________
**Fecha de Entrega:** ___/___/2026

---

**Fin del Documento - Tester 2**
