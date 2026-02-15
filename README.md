# 🎲 Club Dreadnought

Plataforma web para la gestión del Club de Juegos de Mesa Dreadnought.

## 🚀 Quick Start

```bash
# Instalación completa
npm run setup

# Desarrollo
npm run dev
```

**📚 [Ver Documentación Completa](docs/INDEX.md)**

---

## 📖 Documentación Principal

| Documento | Descripción |
|-----------|-------------|
| **[📚 INDEX.md](docs/INDEX.md)** | **Índice completo de toda la documentación** |
| [🛠️ SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Guía de instalación y configuración |
| [🚀 DEPLOYMENT.md](docs/DEPLOYMENT.md) | Cómo deployar a producción |
| [🔐 AUTH_FLOW.md](docs/AUTH_FLOW.md) | Flujo de autenticación completo |
| [🧪 Testing](docs/testing/) | Documentación de tests automatizados |
| [📋 UAT](docs/) | Casos de prueba de usuario (32 casos) |

---

## ✨ Funcionalidades

- ✅ **Autenticación completa** (registro, login, verificación email, recuperación contraseña)
- ✅ **Gestión de eventos** (crear, editar, cancelar eventos y partidas)
- ✅ **Sistema de badges** (desbloqueo automático por categorías)
- ✅ **Panel de administración** (aprobar usuarios, gestionar pagos)
- ✅ **Documentos y feedback** (subir archivos, reportar bugs)
- ✅ **PWA básico** (favicon, manifest.json, listo para offline)

---

## 🧪 Testing

- **19/61 tests automatizados funcionando** (31% cobertura)
- **32 casos UAT documentados** para testing manual
- Ver [docs/testing/](docs/testing/) para más información

```bash
# Ejecutar tests
npm run test:uat

# Solo tests funcionando
npm test -- tester1.uat.test.ts
```

---

## 🏗️ Stack Tecnológico

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router
- Axios

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Resend (emails)

### Testing
- Jest
- Supertest

---

## 📂 Estructura del Proyecto

```
clubdn/
├── client/          # Frontend React
├── server/          # Backend Express
├── docs/            # 📚 Toda la documentación
│   ├── INDEX.md     # Índice de documentación
│   ├── testing/     # Docs de testing
│   └── migrations/  # Docs de base de datos
└── README.md        # Este archivo
```

---

## 🤝 Contribuir

1. Lee la [documentación](docs/INDEX.md)
2. Revisa los [casos UAT](docs/UAT_ClubDN.md)
3. Ejecuta los tests antes de hacer commit
4. Sigue el [flujo de autenticación](docs/AUTH_FLOW.md)

---

**Mantenido por:** Equipo Club Dreadnought
**Última actualización:** Febrero 2026
