---
description: Publica cambios a GitHub con validaciones completas (lint + tests + build)
agent: general
model: github-copilot/gpt-5-mini
---

# Publicar a GitHub - Validaciones Completas

Necesito que automatices el proceso de publicación de cambios a GitHub con todas las validaciones de calidad.

## Workflow a ejecutar (en este orden)

### 1. Verificar estado del repositorio
```bash
git status
git branch --show-current
```

Muestra qué rama estoy y si hay cambios sin commitear o commits sin pushear.

### 2. Ejecutar Lint (ESLint con auto-fix)
```bash
npm run lint
```

**Si falla:** Detén el proceso y muestra los errores. NO continúes.

**Si pasa:** Continúa al siguiente paso.

### 3. Ejecutar Tests Unitarios
```bash
npm run test:unit
```

**Si falla:** Detén el proceso y muestra los errores. NO continúes.

**Si pasa:** Continúa al siguiente paso.

### 4. Ejecutar Tests de Integración
```bash
npm run test:int:dev
```

**Nota:** Requiere que MongoDB y PostgreSQL estén corriendo.

**Si falla:** Detén el proceso y muestra los errores. Sugerencia: verifica que las bases de datos estén activas.

**Si pasa:** Continúa al siguiente paso.

### 5. Ejecutar Build
```bash
npm run build
```

**Si falla:** Detén el proceso. Hay errores de TypeScript que necesitan corregirse.

**Si pasa:** Continúa al siguiente paso.

### 6. Git Commit (si hay cambios sin commitear)
Primero verifica si hay cambios sin commitear:
```bash
git status --porcelain
```

Si hay cambios:
- Muestra con `git diff --stat` qué se va a commitear
- Analiza los archivos modificados para determinar el tipo de cambio:
  - Si es feature → `feat(context): descripción`
  - Si es fix → `fix(context): descripción`
  - Si es test → `test(context): descripción`
  - Si es documentación → `docs(context): descripción`
  - Si es refactor → `refactor(context): descripción`
  - Si es chore → `chore(context): descripción`
- Crea un commit message siguiendo Conventional Commits en ESPAÑOL
- Ejecuta:
  ```bash
  git add -A
  git commit -m "tu-mensaje-generado"
  ```

### 7. Git Push
Obtén la rama actual y hace push:
```bash
git branch --show-current
git push origin <rama-actual>
```

## Seguridad y Validaciones

**IMPORTANTE:**
- ❌ Nunca continúes si algún paso falla
- ❌ Nunca uses `git push --force`
- ❌ Nunca uses `git commit --no-verify`
- ⚠️ Si estás en `main` o `master`, advierte al usuario antes de hacer push
- ✅ Detén y muestra errores claros

## Formato de Salida

Al completar exitosamente, muestra:
```
✅ Lint: PASSED
✅ Unit Tests: PASSED (X tests)
✅ Integration Tests: PASSED (X tests)
✅ Build: PASSED
✅ Commit: [mensaje del commit]
✅ Push: origin/[rama]

🚀 Cambios publicados exitosamente a GitHub
```

Si algo falla:
```
❌ [Paso que falló]
[Output del error]

Proceso detenido. Corrige los errores y vuelve a intentar.
```

## Context

Este es un proyecto NestJS con arquitectura DDD+CQRS. Hay múltiples contextos en `src/context/`. 

Los tests se ejecutan con:
- Unit: SQLite en memoria (rápido)
- Integration: Requiere MongoDB + PostgreSQL real
- E2E: Servidor completo

Consulta `.opencode/AGENT_INSTRUCTIONS.md` para más detalles técnicos si necesitas.
