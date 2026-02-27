# TODO

## ~~Pendiente de decisión~~ RESUELTO

### ~~Membresía al aprobar usuario~~
- ✅ Opción A implementada: el modal de aprobación incluye un selector obligatorio de tipo de membresía (por defecto `EN_PRUEBAS`)
- ✅ Al aprobar, se crea la membresía en la misma transacción que la aprobación del usuario
- Archivos modificados: `ApproveUserModal.tsx`, `useAdminUsers.ts`, `PendingApprovals.tsx`, `adminController.ts`

---

## ~~Pendiente de fix~~ RESUELTO

### ~~NaN% en Logros y Badges~~
- ✅ Fix defensivo aplicado en `client/src/components/badges/BadgeGrid.tsx:66`
- ✅ 48 badge definitions insertados en BD con `server/prisma/seeds/badgeDefinitions.ts`
