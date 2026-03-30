---
description: Publicación completa incluyendo tests E2E
agent: general
---

# Publicar a GitHub - Modo Completo (con E2E)

Necesito que automatices una publicación completa incluyendo todos los tests, incluso E2E. Usa esto antes de mergear a main o para cambios críticos.

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

**Si falla:** Detén el proceso.

### 3. Ejecutar Tests Unitarios
```bash
npm run test:unit
```

**Si falla:** Detén el proceso.

### 4. Ejecutar Tests de Integración
```bash
npm run test:int:dev
```

**Nota:** Requiere MongoDB + PostgreSQL.

**Si falla:** Detén el proceso. Verifica que las bases de datos estén activas.

### 5. Ejecutar Tests E2E
```bash
npm run test:e2e
```

**Nota:** Tests del servidor completo. Pueden tomar más tiempo.

**Si falla:** Detén el proceso. Hay problemas en los tests end-to-end.

### 6. Ejecutar Build
```bash
npm run build
```

**Si falla:** Detén el proceso.

### 7. Git Commit (si hay cambios sin commitear)
```bash
git status --porcelain
```

Si hay cambios:
- Muestra con `git diff --stat`
- Analiza y crea commit message en ESPAÑOL
- Ejecuta `git add -A && git commit -m "mensaje"`

### 8. Git Push
```bash
git branch --show-current
git push origin <rama-actual>
```

## Validaciones

- ❌ Detén si falla cualquier paso
- ❌ Nunca uses `--force` o `--no-verify`
- ⚠️ Advierte si estás en `main` o `master`
- ✅ Todos los tests deben pasar

## Formato de Salida

**Exitoso:**
```
✅ Lint: PASSED
✅ Unit Tests: PASSED (X tests)
✅ Integration Tests: PASSED (X tests)
✅ E2E Tests: PASSED (X tests)
✅ Build: PASSED
✅ Commit: [mensaje]
✅ Push: origin/[rama]

🚀 Publicación completa con éxito - Ready for production
```

**Con error:**
```
❌ [Paso que falló]
[Output del error]

Proceso detenido. Corrige los errores.
```

## Cuándo usar

Usa este comando cuando:
- ✅ Vas a mergear a `main` o `master`
- ✅ Cambios críticos o cambios grandes
- ✅ Features nuevas completas
- ✅ Cambios en la arquitectura
- ✅ Antes de release

No lo uses para cambios triviales (usa `/publish-quick` en su lugar).
