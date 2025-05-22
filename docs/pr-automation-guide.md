# Guía para la Automatización de Pull Requests

> Fecha: 2025-05-22

Esta guía describe el proceso recomendado para automatizar la generación de Pull Requests (PR) en este proyecto, asegurando compatibilidad con linters de Markdown y buenas prácticas de documentación.

## Ubicación del archivo

Coloca este archivo en la carpeta `docs/` para que sea detectado por linters y herramientas de documentación.

## Objetivo

Automatizar la creación de Pull Requests para mejorar la eficiencia, trazabilidad y calidad del flujo de trabajo.

## Pasos sugeridos para la automatización

1. **Uso de GitHub Actions o similar**
   - Configura un workflow en `.github/workflows/` que escuche eventos de push o PR.
   - Utiliza acciones como `peter-evans/create-pull-request` para crear PRs automáticamente tras cambios en ramas específicas.

2. **Estandarización del mensaje de PR**
   - Define una plantilla de PR en `.github/pull_request_template.md`.
   - Incluye checklist, descripción y referencia a este documento.

3. **Validación automática de Markdown**
   - Asegúrate de que el workflow ejecute `markdownlint` sobre todos los archivos `.md` en `docs/` y la raíz del proyecto.
   - Ejemplo de comando:
     ```sh
     npx markdownlint "**/*.md"
     ```

4. **Revisión y merge automáticos (opcional)**
   - Puedes configurar reglas para auto-merge si los checks pasan y hay aprobaciones.

## Recomendaciones para compatibilidad con linters

- Usa encabezados jerárquicos (`#`, `##`, `###`), listas y enlaces correctamente.
- No dejes líneas en blanco innecesarias.
- Mantén líneas de máximo 120 caracteres.
- Usa sintaxis estándar de Markdown.

## Recursos útiles

- [Acción oficial de create-pull-request](https://github.com/peter-evans/create-pull-request)
- [Documentación de markdownlint](https://github.com/DavidAnson/markdownlint)

---

> Para dudas o mejoras, edita este archivo siguiendo las recomendaciones anteriores.
