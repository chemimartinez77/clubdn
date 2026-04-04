# TODO

## Pendiente de implementación

### Traducción automática de descripciones de juegos (BGG)
- Las descripciones, categorías y mecánicas vienen de BGG en inglés y se guardan así en BD
- Traducir en el frontend con **MyMemory API** (gratuita, sin tarjeta) al abrir la modal de info del juego
- Cachear en memoria de sesión para no repetir llamadas al mismo juego
- Sin cambios en BD ni en schema — solo frontend, en la modal de `EventDetail.tsx`

---

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
