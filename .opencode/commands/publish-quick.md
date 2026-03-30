---
description: Publicación rápida (solo lint + unit tests)
agent: general
---

# Publicar a GitHub - Modo Rápido

Necesito que automatices una publicación rápida sin tests de integración (ideal para cambios pequeños).

## Workflow a ejecutar (en este orden)

### 1. Verificar estado del repositorio
```bash
git status
git branch --show-current
```

### 2. Ejecutar Lint
```bash
npm run lint
```

**Si falla:** Detén el proceso y muestra los errores.

### 3. Ejecutar Tests Unitarios
```bash
npm run test:unit
```

**Si falla:** Detén el proceso y muestra los errores.

### 4. Ejecutar Build
```bash
npm run build
```

**Si falla:** Detén el proceso. Hay errores de TypeScript.

### 5. Git Commit (si hay cambios sin commitear)
```bash
git status --porcelain
```

Si hay cambios:
- Muestra con `git diff --stat` 
- Analiza y crea commit message en ESPAÑOL con Conventional Commits
- Ejecuta `git add -A && git commit -m "mensaje"`

### 6. Git Push
```bash
git branch --show-current
git push origin <rama-actual>
```

## Validaciones

- ❌ Detén si falla cualquier paso
- ❌ Nunca uses `--force` o `--no-verify`
- ⚠️ Advierte si estás en `main` o `master`

## Formato de Salida

**Exitoso:**
```
✅ Lint: PASSED
✅ Unit Tests: PASSED (X tests)
✅ Build: PASSED
✅ Commit: [mensaje]
✅ Push: origin/[rama]

🚀 Publicación rápida completada
```

**Con error:**
```
❌ [Paso que falló]
[Output del error]

Proceso detenido.
```

## Notas

Este es el modo **rápido** sin tests de integración. Ideal para:
- Fixes pequeños
- Cambios menores de documentación
- Cambios que ya validaste localmente

Para cambios más importantes, usa `/publish` (con todos los tests).
