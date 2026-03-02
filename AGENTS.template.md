# AGENTS.md (Plantilla)

## Propósito
Este archivo define instrucciones de contexto para asistentes en este repositorio.

## Instrucciones permanentes (mantener)
- Priorizar las funcionalidades core del producto sobre módulos secundarios.
- Responder en español salvo que se solicite otro idioma.
- Evitar asumir contexto temporal como requisito del producto completo.

## Contexto temporal (mover a archivo aparte)
- Guardar contextos de iniciativas puntuales en archivos separados, por ejemplo:
  - `AGENTS.context.<tema>.md`
- Referenciar esos contextos desde tickets/PRs, no mezclar con reglas permanentes.

## Checklist antes de editar AGENTS.md
- ¿Es una regla estable del producto/equipo?
- ¿Aplica a la mayoría de tareas del repositorio?
- ¿No está sesgando una funcionalidad secundaria?

Si alguna respuesta es "no", colocar el contenido en un archivo de contexto temporal.
