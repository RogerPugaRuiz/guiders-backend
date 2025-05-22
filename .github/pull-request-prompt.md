# Prompt para generación automática de Pull Request

Este archivo describe el proceso y los comandos que debe seguir la IA para crear un Pull Request de forma automática y compatible con los linters de markdown.

## Instrucciones

1. Compara la rama actual con `main`.
2. Resume los commits y cambios de archivos (añadidos, modificados, eliminados).
3. Genera un título y descripción claros, siguiendo el formato convencional de commits.
4. Incluye un checklist de revisión (tests, lint, migraciones, documentación).
5. Si hay instrucciones adicionales en `.github/instructions/pull-request.instructions.md`, respétalas.
6. El cuerpo del PR debe estar en español, bien formateado y listo para usar en GitHub.
7. Si hay cambios en pruebas, asegúrate de que se ejecuten y pasen.
8. Ejecuta el linter y reporta si hay errores.
9. El PR debe ser autoexplicativo y facilitar la revisión.
10. Usa los siguientes comandos de terminal para automatizar el proceso:

- Obtener la rama actual: `git rev-parse --abbrev-ref HEAD`
- Listar los commits entre ramas: `git log --oneline origin/main..HEAD`
- Ver el diff resumido: `git diff --stat origin/main...HEAD`
- Ejecutar pruebas: `npm run test` o el script correspondiente en `package.json`
- Ejecutar linter: `npm run lint` o el script correspondiente en `package.json`
- Ejecutar migraciones si aplica: `npm run migrate` o el script correspondiente

## Ejemplo de estructura

---

**Título:** feat: implementar servicio de asignación de comerciales conectados

**Descripción:**

- Resumen de la funcionalidad implementada o corregida.
- Lista de archivos clave modificados.
- Cambios relevantes en lógica de negocio, infraestructura o tests.

**Checklist:**

- [x] Código revisado y formateado
- [x] Pruebas unitarias actualizadas y ejecutadas
- [x] Linter ejecutado sin errores
- [x] Documentación/diagramas actualizados si aplica

---
