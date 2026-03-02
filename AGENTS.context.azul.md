# Contexto temporal: Azul Web Implementation

## Objetivo
Implementar un clon funcional del juego de mesa "Azul" integrado en una arquitectura monorepo (Client/Server) con soporte para juego por turnos persistente en PostgreSQL.

## Stack tecnológico
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5.
- Backend: Node.js, Express, Prisma ORM, PostgreSQL (Neon/Railway).
- Comunicación: API REST + JSONB para el estado del juego.

## Reglas del motor (Azul)
1. Fase de oferta: el jugador elige un color de una fábrica; el resto va al centro.
2. Líneas de patrón: se colocan azulejos de derecha a izquierda; no repetir color si ya existe en la fila de pared; el exceso va al suelo.
3. Fase de mosaico: mover un azulejo por línea completa a la pared y puntuar por adyacencia.
4. Bonus final: fila completa (+2), columna (+7), 5 colores (+10).

## Estructura de datos (JSONB)
```json
{
  "factories": [[], [], [], [], []],
  "center": [],
  "players": [
    {
      "id": "uuid",
      "patternLines": [[], [], [], [], []],
      "wall": ["..."],
      "floor": [],
      "score": 0
    }
  ],
  "phase": "OFFER",
  "turnIndex": 0
}
```
