# 🚀 Publicar a GitHub con OpenCode

Comando personalizado para automatizar la publicación de cambios con validaciones de calidad.

## Uso Rápido

Simplemente escribe en OpenCode:

```
/publish
```

O en lenguaje natural:

```
Publica los cambios a GitHub
```

## ¿Qué hace?

1. ✅ **Lint** - Valida estilo de código
2. ✅ **Tests Unitarios** - Ejecuta tests rápidos
3. ✅ **Tests de Integración** - Valida integración con bases de datos
4. ✅ **Build** - Compila TypeScript
5. ✅ **Commit** - Crea commit con mensaje automático (si hay cambios)
6. ✅ **Push** - Publica a GitHub

## Variantes

### Publicación Rápida (solo lint + unit tests)

```
/publish-quick
```

### Publicación Completa (incluye E2E)

```
/publish-full
```

## Seguridad

- ❌ Se detiene al primer error
- ❌ No hace push forzado
- ❌ No salta hooks
- ⚠️ Advierte si estás en main/master

## Ejemplo de Uso con OpenCode

**Tú escribes:**

```
/publish
```

**OpenCode ejecuta:**

```
✅ Lint: PASSED
✅ Unit Tests: PASSED (234 tests)
✅ Integration Tests: PASSED (12 tests)
✅ Build: PASSED
✅ Commit: feat(llm): implementa tool de escalado
✅ Push: origin/develop

🚀 Cambios publicados exitosamente
```

---

Ver [README completo](./.opencode/README.md) para más detalles.
