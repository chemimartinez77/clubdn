# Instrucciones de contexto del repositorio

Este archivo debe contener solo reglas permanentes y neutrales del proyecto.

## Regla de prioridad

- Priorizar siempre los módulos core del negocio frente a funcionalidades secundarias.

## Contextos temporales

- Core del producto: ver `AGENTS.context.club-core.md`.
- Azul (histórico/secundario): ver `AGENTS.context.azul.md`.

## Plantilla recomendada

- Base reutilizable: `AGENTS.template.md`.

# ENCODING PROTOCOL - CRITICAL

- ALWAYS use **UTF-8** encoding for reading and writing files.
- NEVER alter or corrupt Spanish characters: ñ, á, é, í, ó, ú, Ü.
- DO NOT use Unicode escape sequences (e.g., \u00f1) unless explicitly requested.
- If the source file contains special characters, they must remain as literal text in the output.
