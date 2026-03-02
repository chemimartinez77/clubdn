# Memoria del Proyecto ClubDN

## Stack
- Backend: Node.js + Express + Prisma (PostgreSQL en Railway), TypeScript strict
- Frontend: React 19 + Vite + Tailwind CSS v4 + TanStack Query v5
- Autenticación: JWT en localStorage, `req.user.userId` (NO `req.user.id`)
- Prisma instance singleton: importar desde `server/src/config/database.ts`

## Estructura clave
- `server/src/config/database.ts` — singleton de Prisma (usar siempre este import)
- `server/src/logic/` — lógica pura sin DB (AzulEngine.ts aquí)
- `client/src/api/axios.ts` — instancia axios con JWT interceptor
- `client/src/index.css` — Tailwind v4 con `@import "tailwindcss"` + CSS vars en `:root`
- CSS vars dinámicas: usar `style={{ '--mi-var': value } as CSSProperties}` + `bg-[var(--mi-var)]`

## Módulo Azul (implementado)
- Schema: modelo `AzulGame` + enum `AzulGameStatus` en `schema.prisma`
- Engine: `server/src/logic/AzulEngine.ts` — lógica pura exportada
- Backend: `server/src/controllers/azulController.ts` + `server/src/routes/azulRoutes.ts`
- Rutas registradas en `index.ts`: `app.use('/api/azul', azulRoutes)`
- Frontend: `client/src/hooks/useGame.ts` + `client/src/components/game/GameBoard.tsx`
- Sin Socket.io — polling con React Query `refetchInterval: 3000` cuando es turno del oponente

## Convenciones
- Controladores: usar `prisma` de `../config/database` (nunca `new PrismaClient()`)
- Rutas Azul: `GET/POST /api/azul/games`, `GET /api/azul/games/:id`, `POST /api/azul/games/:id/join`, `PATCH /api/azul/games/:id/move`
- Tiles de colores: usar `--tile-color` CSS var en componente Tile (patrón Tailwind v4)
