# Contexto temporal: Club Dreadnought (Core)

## Objetivo del producto
Plataforma web para gestionar el Club Dreadnought: ciclo de vida de miembros, eventos/partidas, operación administrativa y comunicación con socios.

## Prioridades funcionales (ordenadas)
1. Autenticación y cuenta: registro, login, verificación de email, recuperación de contraseña.
2. Gestión de miembros y administración: aprobación de usuarios, estados de membresía, gestión operativa.
3. Eventos y partidas: creación, edición, publicación, cancelación y participación.
4. Finanzas operativas: seguimiento/gestión de pagos de socios.
5. Comunidad y engagement: badges, documentos compartidos y feedback/reportes.
6. Extras lúdicos: minijuegos o módulos accesorios (por ejemplo, Azul) como funcionalidades secundarias.

## Stack actual (alto nivel)
- Frontend: React + TypeScript + Vite + Tailwind.
- Backend: Node.js + Express + TypeScript + Prisma.
- Base de datos: PostgreSQL.
- Auth/API: JWT + API REST.
- Integraciones: correo transaccional (Resend).
- Testing: Jest, Supertest y UAT documentado.

## Criterios para asistentes
- Priorizar siempre tareas que impacten en miembros, administración y eventos del club.
- Tratar módulos de juego como complementarios salvo instrucción explícita.
- Explicar cambios con foco en impacto de negocio (operación del club) y luego detalle técnico.
- Evitar que contexto temporal de una feature secundaria condicione respuestas globales.

## Referencias rápidas
- README.md (visión general)
- docs/INDEX.md (índice de documentación)
- docs/AUTH_FLOW.md (flujo de autenticación)
- docs/DEPLOYMENT.md (despliegue)
- docs/testing/ (estrategia y estado de tests)
