# Assets de Jaipur

Este directorio contiene los recursos visuales de `Jaipur` para la implementación en `Combat Zone`.

## Estructura

- `cartas/`
- `fichas/`
- `fondos/`
- `ui/`

## Reglas de preparación

- Usar `PNG` con transparencia siempre que sea posible.
- Mantener tamaños consistentes por familia de asset.
- No renombrar arbitrariamente: usar exactamente los nombres indicados abajo.
- Los textos de interfaz irán en español, pero los nombres de fichero deben mantenerse simples y estables.

## Convención de nombres

- Sufijo `a`: anverso
- Sufijo `b`: reverso

Ejemplos:
- `camello5a.png` = anverso de la ficha de camello
- `camello5b.png` = reverso de la ficha de camello
- `bonus3a.png` = anverso de una ficha de bonus de 3
- `bonus3b.png` = reverso de esa ficha de bonus

## Cartas esperadas

Ruta: `cartas/`

- `camello.png`
- `diamante.png`
- `oro.png`
- `plata.png`
- `tela.png`
- `especias.png`
- `cuero.png`
- `reverso.png`

## Fichas esperadas

Ruta: `fichas/`

### Camellos
- `camello5a.png`
- `camello5b.png`

### Diamantes
- `diamante7a.png`
- `diamante7b.png`
- `diamante5a.png`
- `diamante5b.png`

### Oro
- `oro6a.png`
- `oro6b.png`
- `oro5a.png`
- `oro5b.png`

### Plata
- `plata5a.png`
- `plata5b.png`

### Tela
- `tela5a.png`
- `tela3a.png`
- `tela3b.png`
- `tela2a.png`
- `tela2b.png`
- `tela1a.png`
- `tela1b.png`

### Especias
- `especias5a.png`
- `especias3a.png`
- `especias3b.png`
- `especias2a.png`
- `especias2b.png`
- `especias1a.png`
- `especias1b.png`

### Cuero
- `cuero4a.png`
- `cuero3a.png`
- `cuero2a.png`
- `cuero1a.png`

### Bonificaciones
- `bonus3a.png`
- `bonus3b.png`
- `bonus3c.png`
- `bonus4a.png`
- `bonus4b.png`
- `bonus4c.png`
- `bonus5a.png`
- `bonus5b.png`
- `bonus5c.png`

### Progreso de partida
- `selloexcelenciaa.png`

## Fondos esperados

Ruta: `fondos/`

- `mesa-base.jpg`

Opcionales:
- `textura-tapete.png`
- `textura-panel.png`

## UI opcional

Ruta: `ui/`

- `brillo-bonus.png`
- `marco-carta-seleccionada.png`
- `marco-turno.png`
- `sombra-ficha.png`

## Notas

- Si alguna ficha repetida es visualmente idéntica, se puede duplicar desde código más adelante, pero para arrancar prefiero nombres explícitos.
- Si no consigues separar una ficha o carta con limpieza, deja igualmente el hueco y seguimos con placeholders temporales.
