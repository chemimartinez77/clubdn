# Especificación funcional de implementación: Jaipur

## Objetivo
- Implementar `Jaipur` como juego multijugador de 2 jugadores sobre la infraestructura nueva de `Combat Zone Multiplayer`.
- Usar como referencia el reglamento oficial del PDF `JAIPUR_US.pdf`.
- Fijar aquí todas las decisiones necesarias para evitar ambigüedades durante el desarrollo.

## Alcance de la v1
- Solo juego base.
- Solo 2 jugadores.
- Sin expansiones, variantes ni reglas caseras.
- Sin espectadores interactivos.
- Sin chat, sin ranking, sin replay y sin matchmaking automático.
- Con lobby, unión manual, arranque manual por el creador, reconexión y finalización de partida.

## Regla corregida y fijada como canónica
- En el reglamento en inglés aparece la frase:
  - `You can only sell one goods type each round, never more.`
- Para esta implementación se considera una errata.
- La regla canónica será:
  - `You can only sell one goods type each turn, never more.`
- Interpretación aplicada al motor:
  - En un turno de venta, el jugador solo puede vender un único tipo de mercancía.
  - Puede vender cualquier cantidad válida de cartas de ese tipo en ese turno.
  - En turnos posteriores de la misma ronda puede volver a vender otro tipo de mercancía.

## Componentes del juego

### Cartas
- 6 diamantes
- 6 oro
- 6 plata
- 8 tela
- 8 especias
- 10 cuero
- 11 camellos

### Fichas de mercancía
- Diamantes: 5 fichas
- Oro: 5 fichas
- Plata: 5 fichas
- Tela: 7 fichas
- Especias: 7 fichas
- Cuero: 9 fichas

### Bonificaciones
- Bonos por vender 3 cartas
- Bonos por vender 4 cartas
- Bonos por vender 5 o más cartas

### Otros
- 1 ficha de camellos
- 3 sellos de excelencia

## Estructura de partida
- Una partida completa de `Jaipur` se compone de varias rondas.
- Gana la partida el primer jugador que consiga 2 sellos de excelencia.
- Cada ronda se juega de forma independiente con nueva preparación.

## Preparación de ronda
- Colocar 3 cartas de camello boca arriba en el mercado.
- Barajar el resto de cartas.
- Repartir 5 cartas a cada jugador.
- Robar 2 cartas adicionales del mazo y colocarlas boca arriba junto a los camellos para completar el mercado inicial de 5 cartas.
- Si entre esas 2 cartas hay camellos, se quedan igualmente en el mercado.
- Cada jugador debe retirar los camellos de su mano inicial y colocarlos en su rebaño personal.
- La mano inicial real del jugador queda compuesta solo por cartas de mercancía.
- Se elige jugador inicial según el flujo general de la plataforma. En v1:
  - el creador de la sala será jugador 0
  - el turno inicial de la primera ronda será aleatorio
  - el turno inicial de rondas posteriores será para quien perdió la ronda anterior

## Zonas de estado

### Estado público
- Mercado
- Número de cartas restantes en el mazo
- Rebaño de camellos de cada jugador en cantidad visible
- Fichas de mercancía restantes por tipo y orden de cobro
- Pilas de bonificación restantes
- Sellos de excelencia de cada jugador
- Descartes
- Jugador activo
- Resultado de ronda y resultado global de partida

### Estado privado por jugador
- Mano de cartas de mercancía

## Límite de mano
- Al final del turno de un jugador, nunca puede tener más de 7 cartas en mano.
- Los camellos en el rebaño no cuentan para este límite.

## Acciones permitidas por turno
- En cada turno, el jugador debe elegir exactamente una:
  - tomar cartas
  - vender cartas
- Nunca ambas en el mismo turno.

## Acción: tomar cartas
Un jugador que toma cartas debe escoger exactamente una de estas opciones.

### Opción A: tomar varias mercancías mediante intercambio
- El jugador toma del mercado 2 o más cartas de mercancía.
- Nunca puede tomar camellos con esta acción.
- Debe devolver al mercado exactamente el mismo número de cartas.
- Las cartas devueltas pueden ser:
  - mercancías de la mano
  - camellos del rebaño
  - una combinación de ambas
- Restricciones:
  - no se puede intercambiar 1 por 1; el intercambio mínimo es 2 por 2
  - el mismo tipo de mercancía no puede ser simultáneamente entregado y recibido en el mismo intercambio
- Tras resolver el intercambio, el mercado debe seguir teniendo 5 cartas.

### Opción B: tomar una sola mercancía
- El jugador toma exactamente 1 carta de mercancía del mercado.
- No puede ser un camello.
- Después se roba 1 carta del mazo para rellenar el mercado hasta 5, si es posible.
- Si el mazo está vacío, el mercado queda con menos cartas.

### Opción C: tomar todos los camellos
- El jugador toma todos los camellos visibles en el mercado.
- Los añade a su rebaño.
- Después se roba del mazo hasta rellenar el mercado a 5 cartas, si es posible.
- Esta acción nunca añade cartas a la mano.

## Acción: vender cartas
- El jugador elige un único tipo de mercancía de su mano.
- Descarta tantas cartas de ese tipo como quiera, siempre respetando las restricciones.
- Cobra tantas fichas de mercancía como cartas haya vendido, empezando por las de mayor valor disponibles de ese tipo.
- Si vende 3, 4 o 5 o más cartas, también roba exactamente 1 ficha de bonificación de la pila correspondiente.

### Restricciones de venta
- Diamantes, oro y plata:
  - deben venderse en lotes de al menos 2 cartas
- Tela, especias y cuero:
  - pueden venderse desde 1 carta
- Si no hay suficientes fichas de mercancía para cubrir todas las cartas vendidas:
  - el jugador cobra las fichas disponibles
  - la venta sigue siendo válida
  - si el tamaño de venta da derecho a bonificación, se cobra igualmente

## Reposición del mercado
- El mercado se repone solo después de:
  - tomar 1 mercancía
  - tomar todos los camellos
- En los intercambios no se roba del mazo para reponer, porque el propio intercambio mantiene el mercado en 5.
- Si el mazo está vacío, no se repone y el mercado puede quedar con menos cartas.

## Fin de ronda
- La ronda termina inmediatamente cuando se cumple una de estas condiciones:
  - se agotan 3 tipos de fichas de mercancía
  - no quedan cartas en el mazo al intentar rellenar el mercado

## Puntuación de ronda
- Al final de la ronda, el jugador con más camellos en su rebaño gana la ficha de camellos, valor 5.
- Si ambos tienen la misma cantidad de camellos, nadie recibe esa ficha.
- Cada jugador suma:
  - valor de fichas de mercancía
  - valor de fichas de bonificación
  - ficha de camellos si la ha ganado
- El jugador con más rupias gana la ronda y recibe 1 sello de excelencia.

## Desempates de ronda
- Si ambos jugadores empatan a rupias:
  - gana quien tenga más fichas de bonificación
- Si persiste el empate:
  - gana quien tenga más fichas de mercancía
- Si siguiera existiendo empate tras ambas comprobaciones:
  - se marcará la ronda como empate técnico
  - ningún jugador recibirá sello de excelencia
- Esta última regla no aparece explícitamente resuelta en el PDF; se fija así para evitar estados imposibles en el sistema.

## Nueva ronda
- Si ningún jugador ha alcanzado 2 sellos de excelencia:
  - se reinicia toda la preparación de ronda
  - conserva únicamente:
    - sellos acumulados
    - identidad de los jugadores
  - empieza la siguiente ronda el jugador que perdió la ronda anterior
- Si la ronda anterior fue empate técnico:
  - empieza la siguiente ronda el jugador que no empezó la ronda recién terminada

## Fin de la partida
- La partida termina inmediatamente cuando un jugador consigue 2 sellos de excelencia.
- Ese jugador es el vencedor final de la partida.

## Reglas de visibilidad para el motor
- Cada jugador debe ver:
  - su propia mano completa
  - el tamaño de la mano rival, pero no su contenido exacto
  - el mercado completo
  - rebaños completos de ambos
  - fichas públicas y estado de ronda
- El motor debe usar `playerView` para ocultar la mano rival.

## Modelo de datos lógico sugerido para el motor

### Estado global de partida
- `matchScore`
  - sellos por jugador
  - ganador final o `null`
- `round`
  - número de ronda
  - jugador inicial de la ronda
  - estado de la ronda

### Estado de ronda
- `deck`
- `market`
- `discard`
- `goodsTokens`
- `bonusTokens3`
- `bonusTokens4`
- `bonusTokens5`
- `camelTokenAvailable`
- `players`
  - `hand`
  - `herdCount`
  - `goodsTokenValuesWon`
  - `bonusTokenValuesWon`
  - `camelTokenWon`
- `roundWinner`
- `roundFinishedReason`

## Movimientos del motor
- `takeSingleGood(marketIndex)`
- `takeAllCamels()`
- `exchangeGoods(payload)`
  - `takeIndices`
  - `giveGoods`
  - `giveCamels`
- `sellGoods(goodsType, count)`
- `acknowledgeRoundEnd()`
  - para pasar de pantalla de resultado de ronda a preparación de la siguiente

## Validaciones del motor
- No permitir movimientos fuera de turno.
- No permitir tomar mercancía y camellos en la misma acción.
- No permitir intercambios 1 por 1.
- No permitir intercambiar un tipo de mercancía por ese mismo tipo.
- No permitir vender mercancías premium en cantidad inferior a 2.
- No permitir vender cartas que el jugador no tiene.
- No permitir terminar turno con más de 7 cartas en mano.
- No permitir interactuar si la ronda está cerrada y esperando confirmación.

## Estados de interfaz
- `LOBBY`
- `ROUND_ACTIVE`
- `ROUND_SCORING`
- `ROUND_TRANSITION`
- `MATCH_FINISHED`

## Dirección UX “premium”

### Objetivo visual
- Evitar una mesa plana tipo prototipo.
- Buscar sensación de bazar elegante, táctil y cálida.
- Inspiración:
  - seda, latón, marfil, madera oscura, fichas de marfil/arcilla
  - iluminación cálida
  - composición con profundidad

### Decisiones de UX
- El mercado debe ser la zona protagonista en el centro.
- La mano del jugador debe sentirse privada y valiosa, no una simple fila de botones.
- El rebaño de camellos debe verse como reserva lateral visible y distinguible.
- Las fichas deben tener peso visual y jerarquía clara por valor.
- Las ventas grandes deben tener una pequeña celebración visual.
- Los cambios de ronda deben mostrarse como transición ceremonial, no como salto brusco.

### UI de la v1
- React + CSS, sin `PixiJS`.
- Capas recomendadas:
  - fondo texturizado cálido
  - panel central del mercado
  - mano inferior del jugador actual
  - panel superior resumido del rival
  - columna lateral de fichas y estado
- Animaciones recomendadas:
  - robo al mercado
  - venta hacia descarte
  - fichas que “saltan” al área del jugador
  - revelado de bonificación

### Tipografía y estilo
- Evitar estética genérica de dashboard.
- Usar una combinación con más personalidad que la UI administrativa del club.
- Mantener legibilidad alta en móvil y escritorio.

## Requisitos de implementación técnica
- Servidor autoritativo.
- Persistencia de metadatos en Prisma.
- Snapshot del estado de motor guardado en `engineState`.
- Canal SSE para actualizaciones en tiempo real.
- Reconexión:
  - al volver a entrar, el cliente carga snapshot REST y reabre SSE
- Soporte móvil desde el inicio.

## Pruebas mínimas obligatorias

### Reglas
- preparación inicial correcta
- retirada de camellos de la mano inicial
- toma de una mercancía
- toma de todos los camellos
- intercambio válido de 2 o más cartas
- rechazo de intercambio 1 por 1
- rechazo de intercambio del mismo tipo por el mismo tipo
- venta simple válida
- rechazo de venta de diamantes/oro/plata con una sola carta
- concesión correcta de bonificación
- fin de ronda por 3 tipos agotados
- fin de ronda por mazo vacío al rellenar
- puntuación con ficha de camellos
- desempates
- fin de partida al conseguir 2 sellos

### Red y estado
- reconexión sin pérdida de estado
- ocultación de mano rival
- rechazo de movimientos fuera de turno
- rechazo de movimientos por usuario no participante
- actualización correcta del snapshot tras cada acción

## Información adicional que aún vendría bien
- Referencias visuales concretas para la versión “premium”:
  - capturas de juegos que te gusten
  - imágenes del Jaipur físico que quieras emular o reinterpretar
- Decisión de idioma de UI:
  - si quieres mantener nombres de mercancía en español desde el principio
- Si quieres fidelidad visual alta:
  - iconografía o assets propios para cartas, camellos y fichas
- Si no me das nada más, asumiré:
  - textos en español
  - estilo inspirado en bazar cálido y elegante
  - componentes dibujados en CSS/SVG simple, sin arte licenciado
