# UAT - Tester 1: Funcionalidades de Usuario Básico
## Club Dreadnought

**Tester:** [Nombre del Tester 1]
**Fecha de Inicio:** ___/___/2026
**Fecha de Finalización:** ___/___/2026
**Rol:** Usuario estándar (sin permisos admin)

---

## 📋 Resumen de Asignación

**Total de Casos:** 9 casos de prueba
**Tiempo Estimado:** 3-4 horas
**Complejidad:** Baja-Media
**Enfoque:** Experiencia de usuario estándar

---

## 🎯 Áreas de Testing Asignadas

- ✅ Registro e Inicio de Sesión (3 casos)
- ✅ Dashboard de Usuario (1 caso)
- ✅ Mi Perfil (3 casos)
- ✅ Funcionalidad "ID" (1 caso)
- ✅ Notificaciones (1 caso)

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total casos asignados | 9 |
| Casos ejecutados | __ / 9 |
| Casos PASADOS ✅ | __ |
| Casos FALLIDOS ❌ | __ |
| Defectos encontrados | __ |
| Severidad crítica | __ |
| Severidad alta | __ |
| Severidad media | __ |
| Severidad baja | __ |

---

## 🧪 Casos de Prueba Asignados

---

### **TC-001: Registro e Inicio de Sesión**

---

#### ✅ TC-001.1: Registro de Nuevo Usuario
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que un nuevo usuario puede registrarse correctamente

**Precondiciones:**
- Usuario no registrado previamente
- Email válido disponible

**Pasos a Ejecutar:**
1. [ ] Navegar a la página de registro
2. [ ] Completar formulario con:
   - Nombre: "Usuario Prueba UAT 1"
   - Email: "uat.tester1@clubdn.com"
   - Contraseña: "TestUAT2026!"
   - Confirmar contraseña
3. [ ] Hacer clic en "Registrarse"
4. [ ] Verificar recepción de email de verificación
5. [ ] Hacer clic en enlace de verificación

**Resultado Esperado:**
- [ ] Usuario creado con estado "PENDING_APPROVAL"
- [ ] Email de verificación recibido
- [ ] Email verificado correctamente
- [ ] Usuario redirigido a página de espera de aprobación
- [ ] Notificación visible para administradores

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Capturas:**
```
[Adjuntar capturas si es necesario]
```

**Tiempo de Ejecución:** ___ minutos

---

#### ✅ TC-001.2: Login de Usuario Aprobado
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que un usuario aprobado puede iniciar sesión

**Precondiciones:**
- Usuario registrado y aprobado por admin
- Email verificado
- **NOTA:** Coordinar con Tester 4 para que apruebe el usuario creado en TC-001.1

**Pasos a Ejecutar:**
1. [ ] Navegar a "/login"
2. [ ] Ingresar credenciales:
   - Email: uat.tester1@clubdn.com
   - Contraseña: TestUAT2026!
3. [ ] Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- [ ] Login exitoso
- [ ] Redirigido al dashboard (página de inicio)
- [ ] Nombre de usuario visible en header
- [ ] Avatar o inicial visible

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

#### ✅ TC-001.3: Login con Credenciales Incorrectas
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar manejo de errores en login

**Pasos a Ejecutar:**
1. [ ] Intentar login con contraseña incorrecta
   - Email: uat.tester1@clubdn.com
   - Contraseña: PasswordIncorrecta123
2. [ ] Intentar login con email no registrado
   - Email: noexiste@clubdn.com
   - Contraseña: TestUAT2026!

**Resultado Esperado:**
- [ ] Mensaje de error claro
- [ ] No revela si el email existe o no (seguridad)
- [ ] Usuario permanece en página de login

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

### **TC-002: Dashboard de Usuario**

---

#### ✅ TC-002.1: Visualización del Dashboard
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar que el dashboard muestra información correcta del usuario

**Precondiciones:**
- Usuario autenticado

**Pasos a Ejecutar:**
1. [ ] Navegar al inicio "/"
2. [ ] Observar sección de bienvenida
3. [ ] Revisar estadísticas personales
4. [ ] Verificar "Acciones rápidas"

**Resultado Esperado:**
- [ ] Saludo personalizado: "Buenas [momento del día], [Nombre]!"
- [ ] Fecha/hora de último acceso visible
- [ ] Estadísticas correctas:
  - [ ] Eventos asistidos
  - [ ] Partidas jugadas
  - [ ] Horario favorito
  - [ ] Próximos eventos
- [ ] Juegos más jugados listados
- [ ] Compañeros frecuentes mostrados
- [ ] Días que más juega visibles
- [ ] Acciones rápidas visibles:
  - [ ] Organizar Partida
  - [ ] Ver Eventos
  - [ ] Ludoteca del Club

**Validaciones Adicionales:**
- [ ] Los números coinciden con datos reales del usuario
- [ ] Los enlaces de "Acciones rápidas" funcionan
- [ ] La imagen del Noughter se muestra correctamente

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

### **TC-009: Mi Perfil**

---

#### ✅ TC-009.1: Ver Información Personal
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar visualización del perfil

**Pasos a Ejecutar:**
1. [ ] Navegar a "/profile"
2. [ ] Revisar información mostrada

**Resultado Esperado:**
- [ ] Avatar/foto de perfil visible
- [ ] Nombre completo
- [ ] Email
- [ ] Información personal:
  - [ ] Teléfono
  - [ ] Fecha de nacimiento
- [ ] Preferencias de juego:
  - [ ] Juegos favoritos (tags)
  - [ ] Estilo de juego (Estratégico/Casual/etc.)
- [ ] Redes sociales:
  - [ ] Discord
  - [ ] Telegram
- [ ] Configuración de notificaciones:
  - [ ] En la aplicación
  - [ ] Por email
  - [ ] Nuevas partidas
  - [ ] Cambios en eventos
  - [ ] Eventos cancelados
  - [ ] Estado de invitaciones
- [ ] Tema de la aplicación:
  - [ ] Claro/Oscuro
  - [ ] Color del Noughter
- [ ] Sección "Logros y Badges"
- [ ] Botón "Editar Perfil"

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

#### ✅ TC-009.2: Editar Perfil
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar edición de información personal

**Pasos a Ejecutar:**
1. [ ] Hacer clic en "Editar Perfil"
2. [ ] Cambiar avatar (hover sobre foto y seleccionar nueva imagen)
3. [ ] Modificar información:
   - Teléfono: "600123456"
   - Fecha de nacimiento: "15/03/1990"
   - Biografía: "Aficionado a juegos de estrategia"
   - Juegos favoritos: "Catan, 7 Wonders, Ticket to Ride"
   - Estilo de juego: "Estratégico"
   - Discord: "tester1#1234"
   - Telegram: "@tester1"
4. [ ] Cambiar preferencias de notificaciones (activar/desactivar algunas)
5. [ ] Cambiar tema: Probar diferentes temas disponibles
6. [ ] Cambiar color de Noughter: Probar diferentes colores
7. [ ] Guardar cambios

**Resultado Esperado:**
- [ ] Formulario de edición funcional
- [ ] Avatar se actualiza al cambiar
- [ ] Todos los campos editables
- [ ] Validaciones funcionan (email, formato)
- [ ] Cambios guardados exitosamente
- [ ] Mensaje de confirmación visible
- [ ] Perfil actualizado inmediatamente
- [ ] Tema aplicado en toda la app
- [ ] Vista previa del Noughter actualizada

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

#### ✅ TC-009.3: Cambiar Contraseña
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar cambio de contraseña desde perfil

**Pasos a Ejecutar:**
1. [ ] En perfil, sección "Seguridad"
2. [ ] Hacer clic en "Cambiar Contraseña"
3. [ ] Completar:
   - Contraseña actual: TestUAT2026!
   - Nueva contraseña: NuevaPass2026!
   - Confirmar nueva contraseña: NuevaPass2026!
4. [ ] Guardar

**Resultado Esperado:**
- [ ] Validación de contraseña actual
- [ ] Validación de fortaleza de nueva contraseña
- [ ] Validación de coincidencia
- [ ] Contraseña actualizada
- [ ] Sesión mantenida (no logout)
- [ ] Notificación de éxito

**Resultado Actual:**
```
[Describir qué ocurrió realmente]
```

**Defectos Encontrados:**
```
[Si hay errores, usar formato DEF-XXX]
```

**Nota:** Después de esta prueba, **cambiar la contraseña de vuelta** a TestUAT2026! para mantener consistencia.

**Tiempo de Ejecución:** ___ minutos

---

### **TC-010: Funcionalidad "ID"**

---

#### ✅ TC-010.1: Ver Modal de ID
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar modal de identificación del usuario

**Pasos a Ejecutar:**
1. [ ] Hacer clic en "ID" en el menú superior
2. [ ] Observar información mostrada
3. [ ] Esperar 5 segundos y verificar actualización de hora
4. [ ] Hacer clic fuera del modal para cerrar
5. [ ] Abrir de nuevo y hacer clic en "X" para cerrar

**Resultado Esperado:**
- [ ] Modal abre correctamente
- [ ] Avatar grande visible
- [ ] Nombre completo
- [ ] Tipo de membresía (Socio/Colaborador/Miembro)
- [ ] **Hora en tiempo real** actualizada cada segundo
- [ ] Formato: "viernes, 14 de febrero de 2026, 16:30:45"
- [ ] Modal se cierra al hacer clic fuera
- [ ] Modal se cierra al hacer clic en "X"

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

### **TC-008: Notificaciones**

---

#### ✅ TC-008.1: Recibir Notificaciones
**Estado:** ⬜ No Ejecutado | ⬜ PASADO | ⬜ FALLADO

**Objetivo:** Verificar sistema de notificaciones

**Precondiciones:**
- Usuario con notificaciones habilitadas en perfil
- **Coordinación:** Pedir a Tester 2 que cree un evento nuevo durante esta prueba

**Escenarios de Notificación a Probar:**
1. [ ] Nueva partida disponible (crear evento o pedir a Tester 2)
2. [ ] Cambios en evento inscrito
3. [ ] Evento cancelado (si aplica)

**Pasos a Ejecutar:**
1. [ ] Observar icono de campana en header antes de acción
2. [ ] Realizar acción que genere notificación (crear evento, inscribirse, etc.)
3. [ ] Observar badge de número en campana
4. [ ] Hacer clic en la campana
5. [ ] Revisar notificación mostrada
6. [ ] Hacer clic en notificación para ir al contexto
7. [ ] Volver y hacer clic en "X" para cerrar notificación
8. [ ] Verificar que el badge disminuye

**Resultado Esperado:**
- [ ] Badge de número visible en campana cuando hay notificaciones
- [ ] Panel de notificaciones abre correctamente
- [ ] Notificación mostrada con:
  - [ ] Icono representativo
  - [ ] Título claro
  - [ ] Mensaje descriptivo
  - [ ] Fecha/hora relativa ("hace 5 min", "hoy", "26 ene")
  - [ ] Botón "X" para cerrar
- [ ] Notificaciones ordenadas por fecha (más reciente primero)
- [ ] Al hacer clic en notificación, redirige a contexto relevante
- [ ] Al cerrar notificación, desaparece de la lista
- [ ] Badge actualizado correctamente

**Ejemplos de Notificaciones Esperadas:**
```
📅 Nueva partida disponible
Se ha creado una nueva partida: "Nombre del juego". Fecha: DD/MM/YYYY
hace 2 min

✏️ Cambios en evento inscrito
Se ha modificado la partida en la que estás inscrito: "Nombre del juego"
hoy

❌ Evento cancelado
La partida "Nombre del juego" ha sido cancelada
ayer
```

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

### DEF-T1-001
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

### DEF-T1-002
[Copiar plantilla de arriba si es necesario]

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
- Tester 2: [Notas sobre coordinación para eventos]
- Tester 4: [Notas sobre aprobación de usuario]
```

---

## ✅ Checklist de Finalización

- [ ] Todos los casos ejecutados
- [ ] Resultados documentados
- [ ] Defectos reportados con formato correcto
- [ ] Capturas adjuntas donde sea necesario
- [ ] Coordinación con otros testers completada
- [ ] Documento enviado al coordinador UAT

---

**Firma del Tester:** _____________________
**Fecha de Entrega:** ___/___/2026

---

**Fin del Documento - Tester 1**
