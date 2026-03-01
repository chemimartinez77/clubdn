# Contexto del Proyecto: Azul Web Implementation

## 🎯 Objetivo
Implementar un clon funcional del juego de mesa "Azul" integrado en una arquitectura Monorepo (Client/Server) con soporte para juego por turnos persistente en PostgreSQL.

## 🛠 Stack Tecnológico
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5 (React Query).
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (Neon/Railway).
- **Comunicación:** API REST (inicialmente) + JSONB para el estado del juego.

## 🎲 Reglas del Motor (Azul Engine)
1. **Fase de Oferta:** - Jugadores eligen azulejos de un color de una fábrica.
   - El resto de azulejos de esa fábrica van al centro de mesa.
2. **Líneas de Patrón:** - Los azulejos se colocan de derecha a izquierda.
   - No se pueden colocar colores que ya existan en la fila correspondiente de la "Pared".
   - El exceso de azulejos va a la línea de "Suelo" (puntos negativos).
3. **Fase de Mosaico (Puntuación):**
   - Se mueve un azulejo de cada línea llena a la pared.
   - Puntos: 1 punto base + 1 por cada azulejo adyacente (H/V) de forma contigua.
   - Bonus Final: Fila completa (+2), Columna (+7), 5 colores (+10).

## 🗄 Estructura de Datos (Postgres JSONB)
El campo `gameState` debe seguir este esquema:
```json
{
  "factories": [[], [], [], [], []], 
  "center": [],
  "players": [
    {
      "id": "uuid",
      "patternLines": [[], [], [], [], []],
      "wall": [, "..."], 
      "floor": [],
      "score": 0
    }
  ],
  "phase": "OFFER" | "WALL_TILING",
  "turnIndex": 0
}