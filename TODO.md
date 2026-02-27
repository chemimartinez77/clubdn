# TODO

## Pendiente de decisión

### Membresía al aprobar usuario
Al aprobar un usuario, actualmente **no se crea ningún registro en la tabla `Membership`**.
El admin tiene que asignarla manualmente después editando el perfil del miembro.

Opciones barajadas:
- **A)** Pedir el tipo de membresía en el modal de aprobación (crear membresía en el mismo paso)
- **B)** Crear membresía por defecto (`EN_PRUEBAS` o `COLABORADOR`) al aprobar, editable después
- **C)** Mantener el flujo en dos pasos pero mostrar una alerta en la lista de miembros para usuarios aprobados sin membresía asignada

**Archivos relevantes:**
- `server/src/controllers/adminController.ts` — endpoint `POST /api/admin/approve/:userId`
- `client/src/components/admin/ApproveUserModal.tsx` — modal de aprobación (actualmente solo permite mensaje personalizado)
- `server/src/controllers/memberController.ts` — lógica de creación de membresía (método `updateMemberProfile`)

---

## ~~Pendiente de fix~~ RESUELTO

### ~~NaN% en Logros y Badges~~
- ✅ Fix defensivo aplicado en `client/src/components/badges/BadgeGrid.tsx:66`
- ✅ 48 badge definitions insertados en BD con `server/prisma/seeds/badgeDefinitions.ts`
