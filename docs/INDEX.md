# 📚 Índice de Documentación - Club Dreadnought

> Última actualización: 15 Febrero 2026

Esta carpeta contiene toda la documentación técnica y de usuario del proyecto Club Dreadnought.

---

## 🚀 Inicio Rápido

| Documento | Descripción | Cuándo Usarlo |
|-----------|-------------|---------------|
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Guía completa de instalación y configuración del proyecto | Primera vez que configuras el proyecto |
| **[QUICK_START_RENDER.md](QUICK_START_RENDER.md)** | Despliegue rápido en Render.com | Cuando quieras deployar a producción |
| **[README.md](../README.md)** | Visión general del proyecto | Para entender qué es Club Dreadnought |

---

## 🏗️ Arquitectura y Desarrollo

### Planificación

| Documento | Descripción |
|-----------|-------------|
| **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** | Plan de implementación general del proyecto |
| **[POST_MVP.md](POST_MVP.md)** | Funcionalidades planificadas post-MVP |
| **[PENDING202512140229.md](PENDING202512140229.md)** | Tareas pendientes y backlog |

### Flujos Técnicos

| Documento | Descripción |
|-----------|-------------|
| **[AUTH_FLOW.md](AUTH_FLOW.md)** | Flujo completo de autenticación y autorización (registro, login, verificación email, roles) |
| **[PWA_SETUP.md](PWA_SETUP.md)** | Configuración de Progressive Web App - Estado actual y roadmap para funcionalidad offline |

---

## 🧪 Testing y Calidad

Ubicación: `docs/testing/`

| Documento | Descripción |
|-----------|-------------|
| **[testing/TESTS_README.md](testing/TESTS_README.md)** | Documentación completa de tests UAT automatizados (58 tests implementados, 19 funcionando) |
| **[testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md)** | Guía rápida para ejecutar tests, troubleshooting y escribir nuevos tests |

**Estado de Tests:**
- ✅ Tester 1 (Usuario Básico): 19/19 tests pasando (100%)
- ⚠️ Tester 2 (Eventos): 2/12 tests pasando
- ⚠️ Tester 3 (Documentos): 0/16 tests (requiere ajustes)
- ⚠️ Tester 4 (Admin): 0/14 tests (requiere ajustes)

---

## 📋 User Acceptance Testing (UAT)

Casos de prueba manuales para validación de funcionalidades:

| Documento | Testers | Casos | Descripción |
|-----------|---------|-------|-------------|
| **[UAT_ClubDN.md](UAT_ClubDN.md)** | - | 32 total | Visión general de todos los casos UAT |
| **[UAT_Tester1_Usuario_Basico.md](UAT_Tester1_Usuario_Basico.md)** | Tester 1 | 5 casos | Registro, login, perfil, contraseña |
| **[UAT_Tester2_Eventos_Partidas.md](UAT_Tester2_Eventos_Partidas.md)** | Tester 2 | 8 casos | Eventos, partidas, calendario, badges |
| **[UAT_Tester3_Documentos_Feedback.md](UAT_Tester3_Documentos_Feedback.md)** | Tester 3 | 5 casos | Documentos, reportes, feedback |
| **[UAT_Tester4_Administracion.md](UAT_Tester4_Administracion.md)** | Tester 4 | 14 casos | Panel admin, gestión usuarios, pagos |

**Total:** 32 casos de prueba UAT documentados

---

## 🚀 Despliegue y Operaciones

| Documento | Descripción |
|-----------|-------------|
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Guía completa de deployment (Render, variables de entorno, CORS, base de datos) |
| **[QUICK_START_RENDER.md](QUICK_START_RENDER.md)** | Checklist rápido para deploy en Render.com |

---

## ✅ Checklists y Procedimientos

| Documento | Descripción | Cuándo Usarlo |
|-----------|-------------|---------------|
| **[CHECKLIST.md](CHECKLIST.md)** | Checklist general del proyecto | Antes de commits importantes o releases |
| **[WINDOWS_RESEND_CHECKLIST.md](WINDOWS_RESEND_CHECKLIST.md)** | Checklist específico para configurar Resend en Windows | Si tienes problemas con emails en desarrollo |
| **[Cambios antes de las UAT.md](Cambios%20antes%20de%20las%20UAT.md)** | Cambios realizados antes de ejecutar UAT | Histórico de ajustes pre-testing |

---

## 🗄️ Base de Datos y Migraciones

Ubicación: `docs/migrations/`

| Documento | Descripción |
|-----------|-------------|
| **[migrations/MIGRATION_FIX_README.md](migrations/MIGRATION_FIX_README.md)** | Solución de problemas con migraciones de Prisma |

---

## 📝 Notas Importantes

| Documento | Descripción |
|-----------|-------------|
| **[NOTAS_IMPORTANTES.md](NOTAS_IMPORTANTES.md)** | Notas críticas del proyecto, decisiones arquitectónicas, gotchas |
| **[CLAUDE_CODE_PROMPTS.md](../CLAUDE_CODE_PROMPTS.md)** | Prompts útiles para Claude Code (raíz del proyecto) |

---

## 📂 Estructura de Carpetas de Documentación

```
docs/
├── INDEX.md                              # Este archivo
│
├── 🚀 Inicio Rápido
│   ├── SETUP_GUIDE.md                    # Configuración inicial
│   ├── QUICK_START_RENDER.md             # Deploy rápido
│   └── README.md (raíz)                  # Overview del proyecto
│
├── 🏗️ Arquitectura
│   ├── AUTH_FLOW.md                      # Flujo de autenticación
│   ├── PWA_SETUP.md                      # Progressive Web App
│   ├── IMPLEMENTATION_PLAN.md            # Plan de implementación
│   └── POST_MVP.md                       # Roadmap futuro
│
├── 🧪 Testing
│   └── testing/
│       ├── TESTS_README.md               # Docs completa de tests
│       └── TESTING_GUIDE.md              # Guía rápida de testing
│
├── 📋 UAT (User Acceptance Testing)
│   ├── UAT_ClubDN.md                     # Overview UAT
│   ├── UAT_Tester1_Usuario_Basico.md     # 5 casos
│   ├── UAT_Tester2_Eventos_Partidas.md   # 8 casos
│   ├── UAT_Tester3_Documentos_Feedback.md # 5 casos
│   └── UAT_Tester4_Administracion.md     # 14 casos
│
├── 🚀 Deployment
│   ├── DEPLOYMENT.md                     # Guía completa
│   └── QUICK_START_RENDER.md             # Checklist rápido
│
├── ✅ Checklists
│   ├── CHECKLIST.md                      # General
│   ├── WINDOWS_RESEND_CHECKLIST.md       # Resend en Windows
│   └── Cambios antes de las UAT.md       # Histórico
│
├── 🗄️ Migraciones
│   └── migrations/
│       └── MIGRATION_FIX_README.md       # Solución problemas Prisma
│
└── 📝 Notas
    ├── NOTAS_IMPORTANTES.md              # Notas críticas
    ├── PENDING202512140229.md            # Backlog
    └── CLAUDE_CODE_PROMPTS.md (raíz)     # Prompts útiles
```

---

## 🎯 Flujos de Trabajo Comunes

### 1. **Primera Vez en el Proyecto**
1. Lee [README.md](../README.md) - Visión general
2. Sigue [SETUP_GUIDE.md](SETUP_GUIDE.md) - Instalación
3. Revisa [AUTH_FLOW.md](AUTH_FLOW.md) - Entender autenticación
4. Consulta [NOTAS_IMPORTANTES.md](NOTAS_IMPORTANTES.md) - Decisiones clave

### 2. **Antes de Hacer Deploy**
1. Ejecuta tests: `npm run test:uat` (ver [testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md))
2. Revisa [CHECKLIST.md](CHECKLIST.md)
3. Sigue [DEPLOYMENT.md](DEPLOYMENT.md) o [QUICK_START_RENDER.md](QUICK_START_RENDER.md)

### 3. **Ejecutar Tests UAT Manuales**
1. Lee [UAT_ClubDN.md](UAT_ClubDN.md) - Overview
2. Ejecuta casos según rol:
   - Tester 1: [UAT_Tester1_Usuario_Basico.md](UAT_Tester1_Usuario_Basico.md)
   - Tester 2: [UAT_Tester2_Eventos_Partidas.md](UAT_Tester2_Eventos_Partidas.md)
   - Tester 3: [UAT_Tester3_Documentos_Feedback.md](UAT_Tester3_Documentos_Feedback.md)
   - Tester 4: [UAT_Tester4_Administracion.md](UAT_Tester4_Administracion.md)

### 4. **Desarrollar Tests Automatizados**
1. Lee [testing/TESTS_README.md](testing/TESTS_README.md) - Contexto completo
2. Consulta [testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md) - Ejemplos de código
3. Ejecuta: `npm test -- tester1.uat.test.ts`

### 5. **Convertir a PWA**
1. Lee [PWA_SETUP.md](PWA_SETUP.md)
2. Sigue el roadmap de 4 fases
3. Implementa Service Worker cuando necesites offline

### 6. **Problemas con Migraciones**
1. Consulta [migrations/MIGRATION_FIX_README.md](migrations/MIGRATION_FIX_README.md)
2. Ejecuta: `npx prisma migrate reset`

### 7. **Problemas con Emails en Windows**
1. Sigue [WINDOWS_RESEND_CHECKLIST.md](WINDOWS_RESEND_CHECKLIST.md)
2. Verifica variables de entorno de Resend

---

## 📊 Estado del Proyecto

### Funcionalidades Implementadas ✅
- Autenticación completa (registro, login, verificación email)
- Gestión de eventos y partidas
- Sistema de badges
- Panel de administración
- Gestión de pagos
- Documentos y feedback

### En Testing 🧪
- 19/61 tests automatizados funcionando
- 32 casos UAT documentados para testing manual

### Pendiente ⏳
- PWA completa (Service Worker, offline)
- Resto de tests automatizados (42 tests)
- Funcionalidades post-MVP (ver [POST_MVP.md](POST_MVP.md))

---

## 🤝 Contribuir

Si añades nueva documentación:
1. Colócala en la carpeta `docs/` apropiada
2. Actualiza este INDEX.md
3. Usa formato Markdown claro con emojis para facilitar lectura
4. Incluye fecha de creación/actualización

---

## 📞 Soporte

- **Issues técnicos:** Consulta [NOTAS_IMPORTANTES.md](NOTAS_IMPORTANTES.md)
- **Problemas de setup:** Ver [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Testing:** Ver [testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md)
- **Deployment:** Ver [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Última actualización:** 15 Febrero 2026
**Mantenedor:** Equipo Club DN
**Versión:** 1.0.0
