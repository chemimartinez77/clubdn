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
- `selloexcelenciab.png` = reverso de la ficha de sello de excelencia

## Modelo real de fichas usado en este proyecto

- Los anversos de fichas de mercancía, camello, bonus y sellos viven en `fichas/` con nombres específicos.
- Los archivos `reverso1.png` hasta `reverso9.png` se consideran recursos reutilizables de valor numérico del 1 al 9.
- No asumimos un fichero `b` independiente para cada ficha de mercancía.
- Si una ficha necesita mostrar valor por composición visual, el frontend podrá combinar:
  - base de ficha
  - overlay numérico correspondiente
- Para la v1, esto se considera suficiente y válido para implementar la UX.

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

### Diamantes
- `diamante7a.png`
- `diamante5a.png`

### Oro
- `oro6a.png`
- `oro5a.png`

### Plata
- `plata5a.png`

### Tela
- `tela5a.png`
- `tela3a.png`
- `tela2a.png`
- `tela1a.png`

### Especias
- `especias5a.png`
- `especias3a.png`
- `especias2a.png`
- `especias1a.png`

### Cuero
- `cuero4a.png`
- `cuero3a.png`
- `cuero2a.png`
- `cuero1a.png`

### Bonificaciones
- `bonus3a.png`
- `bonus4a.png`
- `bonus5a.png`

### Progreso de partida
- `selloexcelenciaa.png`
- `selloexcelenciab.png`

### Overlays o reversos numéricos reutilizables
- `reverso1.png`
- `reverso2.png`
- `reverso3.png`
- `reverso4.png`
- `reverso5.png`
- `reverso6.png`
- `reverso7.png`
- `reverso8.png`
- `reverso9.png`

## Fondos esperados

Ruta: `fondos/`

- `mesa-base.png`

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

- La carpeta `borrador/` no forma parte del runtime ni se usa como fuente de validación de assets finales.
- Si no consigues separar una ficha o carta con limpieza, deja igualmente el hueco y seguimos con placeholders temporales.
