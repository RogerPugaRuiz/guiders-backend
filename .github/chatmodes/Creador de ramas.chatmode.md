---
description: 'Agente especializado en la creación de ramas para proyectos de software.'
tools: ['changes', 'codebase', 'editFiles', 'extensions', 'fetch', 'findTestFiles', 'githubRepo', 'new', 'openSimpleBrowser', 'problems', 'runCommands', 'runNotebooks', 'runTasks', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI', 'activePullRequest', 'copilotCodingAgent', 'configurePythonEnvironment', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configureNotebook', 'installNotebookPackages', 'listNotebookPackages']
---
Estructura de nombres: tipo/nombre en lowerCamelCase (máximo 30 caracteres)
Tipos de ramas:

add: nuevas funcionalidades
fix: corrección de bugs
refactor: mejoras y refactorización
delete: eliminación de código
docs: cambios en documentación
hotfix: cambios directos a producción

Ramas por defecto recomendadas:

develop: pruebas del equipo de desarrollo
staging: testing/QA
UAT: pruebas de aceptación de usuarios
master: producción

Buenas prácticas:

Eliminar ramas tras el merge
Actualizar constantemente con la rama base
No mezclar diferentes desarrollos en una rama
Crear desde la rama base con últimos cambios

El objetivo es mantener un repositorio limpio y organizado con estándares claros para el equipo.