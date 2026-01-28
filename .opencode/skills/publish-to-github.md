# Skill: Publish to GitHub

**Command**: `/publish` or `/publish-to-github`

## Description

Automatiza el proceso de publicación de cambios a GitHub con validaciones previas de calidad de código.

## Workflow

Este skill ejecuta los siguientes pasos en orden:

### 1. Pre-Validación

- Verifica que estés en una rama Git válida
- Verifica que haya cambios para commitear o commits para pushear
- Muestra el estado actual del repositorio

### 2. Lint

```bash
npm run lint
```

- Ejecuta ESLint con auto-fix
- Si falla, detiene el proceso y muestra los errores

### 3. Tests Unitarios

```bash
npm run test:unit
```

- Ejecuta tests unitarios con SQLite in-memory
- Si falla, detiene el proceso y muestra los errores
- Genera reporte de cobertura

### 4. Tests de Integración

```bash
npm run test:int:dev
```

- Ejecuta tests de integración sin cobertura
- Si falla, detiene el proceso y muestra los errores
- Requiere MongoDB y PostgreSQL activos

### 5. Tests E2E (Opcional)

```bash
npm run test:e2e
```

- Ejecuta tests end-to-end del servidor completo
- Solo se ejecuta si se especifica la opción `--with-e2e`
- Si falla, detiene el proceso

### 6. Build

```bash
npm run build
```

- Compila el proyecto con NestJS
- Verifica que no haya errores de TypeScript
- Si falla, detiene el proceso

### 7. Git Operations

- Si hay cambios sin commitear:
  - Muestra `git status` y `git diff --stat`
  - Analiza los cambios y crea un commit message siguiendo Conventional Commits
  - Ejecuta `git add` y `git commit`
- Si hay commits sin pushear:
  - Muestra el log de commits pendientes
  - Ejecuta `git push origin <branch>`

## Usage

### Opción 1: Publicar con validaciones estándar

```
/publish
```

Ejecuta: lint → unit tests → integration tests → build → git push

### Opción 2: Publicar con E2E tests

```
/publish --with-e2e
```

Ejecuta: lint → unit tests → integration tests → e2e tests → build → git push

### Opción 3: Publicar solo con lint y unit tests (rápido)

```
/publish --quick
```

Ejecuta: lint → unit tests → build → git push

### Opción 4: Forzar publicación sin tests (NO RECOMENDADO)

```
/publish --skip-tests
```

Ejecuta: lint → build → git push

## Configuration

### Environment Requirements

- Node.js y npm instalados
- Git configurado
- Para tests de integración: MongoDB y PostgreSQL corriendo
- Para tests E2E: Base de datos de prueba configurada

### Git Commit Message Format

Sigue Conventional Commits en español:

- `feat(scope): descripción` - Nueva funcionalidad
- `fix(scope): descripción` - Corrección de bug
- `docs(scope): descripción` - Cambios en documentación
- `refactor(scope): descripción` - Refactorización
- `test(scope): descripción` - Añadir o modificar tests
- `chore(scope): descripción` - Tareas de mantenimiento

### Error Handling

Si algún paso falla:

1. El proceso se detiene inmediatamente
2. Se muestra el output completo del error
3. Se dan sugerencias para solucionar el problema
4. NO se hace commit ni push

### Success Output

Al completar exitosamente:

```
✅ Lint: PASSED
✅ Unit Tests: PASSED (X tests, Y% coverage)
✅ Integration Tests: PASSED (X tests)
✅ Build: PASSED
✅ Git Commit: <commit-hash> <commit-message>
✅ Git Push: Publicado a origin/<branch>

🚀 Cambios publicados exitosamente a GitHub
```

## Implementation Notes

1. **Always run sequentially**: Each step must complete before starting the next
2. **Fail fast**: Stop immediately on first failure
3. **Provide context**: Show relevant output for each step
4. **Smart commit messages**: Analyze changes and generate meaningful commit messages
5. **Branch awareness**: Detect current branch and push to correct remote

## Example Scenarios

### Scenario 1: New feature with uncommitted changes

```
User: /publish
Agent:
1. Detecta cambios sin commitear en src/context/llm/
2. Ejecuta lint ✅
3. Ejecuta unit tests ✅
4. Ejecuta integration tests ✅
5. Ejecuta build ✅
6. Analiza cambios y crea commit: "feat(llm): implementa nueva tool de escalado"
7. Hace git add y git commit
8. Hace git push origin develop
```

### Scenario 2: Multiple commits ready to push

```
User: /publish
Agent:
1. Detecta 3 commits sin pushear
2. Ejecuta lint ✅
3. Ejecuta unit tests ✅
4. Ejecuta integration tests ✅
5. Ejecuta build ✅
6. Hace git push origin develop directamente
```

### Scenario 3: Lint fails

```
User: /publish
Agent:
1. Ejecuta lint ❌
2. Muestra errores de ESLint
3. Sugiere: "Ejecuta 'npm run lint' para ver detalles y corregir los errores"
4. DETIENE el proceso (NO continúa con tests)
```

## Safety Checks

- ✅ Never push to main/master without explicit confirmation
- ✅ Never use `--force` or `--no-verify` flags
- ✅ Never skip pre-commit hooks
- ✅ Never commit sensitive files (.env, credentials)
- ✅ Always validate branch before pushing

## Related Commands

- `/lint-only` - Solo ejecuta lint
- `/test-only` - Solo ejecuta tests sin publicar
- `/build-only` - Solo ejecuta build sin publicar
