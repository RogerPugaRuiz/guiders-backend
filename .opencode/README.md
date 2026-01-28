# OpenCode Custom Commands - Guiders Backend

Sistema de comandos personalizados para automatizar tareas comunes en el desarrollo del backend de Guiders.

## 📋 Comandos Disponibles

### `/publish` - Publicar a GitHub (Estándar)

Publica cambios a GitHub con todas las validaciones de calidad.

**Proceso:**

1. ✅ Verifica estado del repositorio
2. ✅ Ejecuta `npm run lint`
3. ✅ Ejecuta `npm run test:unit`
4. ✅ Ejecuta `npm run test:int:dev`
5. ✅ Ejecuta `npm run build`
6. ✅ Crea commit (si hay cambios sin commitear)
7. ✅ Hace push a GitHub

**Uso:**

```bash
# Desde OpenCode
/publish

# Desde terminal
node .opencode/scripts/publish-to-github.js
```

**Aliases:** `/publish-to-github`, `/deploy`

---

### `/publish-quick` - Publicación Rápida

Publicación rápida solo con validaciones básicas (ideal para cambios pequeños).

**Proceso:**

1. ✅ Lint
2. ✅ Unit Tests
3. ✅ Build
4. ✅ Git commit & push

**Uso:**

```bash
# Desde OpenCode
/publish-quick

# Desde terminal
node .opencode/scripts/publish-to-github.js --quick
```

**Aliases:** `/publish-fast`, `/quick-deploy`

---

### `/publish-full` - Publicación Completa con E2E

Publicación completa incluyendo tests end-to-end (ideal antes de mergear a main).

**Proceso:**

1. ✅ Lint
2. ✅ Unit Tests
3. ✅ Integration Tests
4. ✅ **E2E Tests**
5. ✅ Build
6. ✅ Git commit & push

**Uso:**

```bash
# Desde OpenCode
/publish-full

# Desde terminal
node .opencode/scripts/publish-to-github.js --with-e2e
```

**Aliases:** `/publish-e2e`, `/full-deploy`

---

## 🚀 Uso con OpenCode

### Opción 1: Comando Directo (Recomendado)

Simplemente escribe el comando en el chat de OpenCode:

```
/publish
```

OpenCode ejecutará automáticamente todo el proceso de validación y publicación.

### Opción 2: Solicitud en Lenguaje Natural

También puedes pedirle a OpenCode que ejecute el proceso:

```
Publica los cambios a GitHub
```

```
Quiero hacer deploy con todas las validaciones
```

OpenCode reconocerá tu intención y ejecutará el comando `/publish`.

---

## 🛠️ Uso desde Terminal

Si prefieres ejecutar el script directamente sin OpenCode:

```bash
# Publicación estándar
node .opencode/scripts/publish-to-github.js

# Publicación rápida
node .opencode/scripts/publish-to-github.js --quick

# Publicación completa con E2E
node .opencode/scripts/publish-to-github.js --with-e2e

# Saltar tests (NO RECOMENDADO)
node .opencode/scripts/publish-to-github.js --skip-tests
```

---

## ⚙️ Requisitos

### Para todos los comandos:

- ✅ Node.js y npm instalados
- ✅ Git configurado
- ✅ Repositorio con cambios para publicar

### Para `/publish` (estándar):

- ✅ MongoDB corriendo en localhost
- ✅ PostgreSQL corriendo en localhost

### Para `/publish-full`:

- ✅ Todos los anteriores
- ✅ Base de datos de prueba E2E configurada

---

## 🔒 Seguridad

El sistema incluye las siguientes protecciones:

- ❌ **Nunca** hace push forzado (`--force`)
- ❌ **Nunca** salta hooks de pre-commit (`--no-verify`)
- ❌ **Nunca** commitea archivos sensibles (.env, credentials)
- ⚠️ **Advierte** al intentar pushear a main/master
- ✅ **Valida** que todos los tests pasen antes de publicar
- ✅ **Detiene** el proceso al primer error

---

## 📊 Ejemplo de Salida Exitosa

```
╔════════════════════════════════════════╗
║  🚀 Publish to GitHub - OpenCode Skill ║
╚════════════════════════════════════════╝

ℹ Modo: Estándar (lint + unit tests + integration tests)

🔍 Verificando estado del repositorio...
ℹ Rama actual: develop
ℹ 📝 Cambios sin commitear detectados

🔍 Ejecutando Lint...
✅ Lint: PASSED

🧪 Ejecutando Tests Unitarios...
✅ Unit Tests: PASSED

🔗 Ejecutando Tests de Integración...
✅ Integration Tests: PASSED

🏗️  Ejecutando Build...
✅ Build: PASSED

📝 Creando commit...
✅ Commit creado: feat(llm): nueva herramienta de escalado

🚀 Publicando a GitHub...
✅ Cambios publicados a origin/develop

╔════════════════════════════════════════╗
║  ✅ Publicación completada exitosamente ║
╚════════════════════════════════════════╝
```

---

## 📊 Ejemplo de Salida con Error

```
🔍 Ejecutando Lint...
❌ Lint falló
❌ Ejecuta "npm run lint" para ver los detalles

Proceso detenido. Corrige los errores antes de publicar.
```

El proceso se detiene inmediatamente y **NO** se hace commit ni push.

---

## 🎯 Casos de Uso

### Caso 1: Feature nueva completada

```
# Has terminado de implementar una feature
# Quieres asegurarte que todo funciona antes de publicar

/publish
```

### Caso 2: Fix rápido

```
# Has corregido un typo o un bug pequeño
# Quieres publicar rápido

/publish-quick
```

### Caso 3: Preparar para PR a main

```
# Vas a crear un PR a la rama principal
# Quieres ejecutar TODOS los tests incluido E2E

/publish-full
```

### Caso 4: Trabajo en progreso (WIP)

```
# Tienes código que funciona pero aún no está terminado
# Quieres hacer backup en GitHub

# Mejor usa git directamente:
git add .
git commit -m "wip: trabajo en progreso"
git push
```

---

## 🐛 Troubleshooting

### "Tests de integración fallaron"

**Causa:** MongoDB o PostgreSQL no están corriendo.

**Solución:**

```bash
# Verifica que las bases de datos estén activas
npm run test:check-mongo
docker ps  # Si usas Docker
```

### "Build falló"

**Causa:** Errores de TypeScript en el código.

**Solución:**

```bash
# Ver errores detallados
npm run build

# Revisar tipos
npx tsc --noEmit
```

### "Lint falló"

**Causa:** Errores de estilo de código.

**Solución:**

```bash
# Auto-fix automático
npm run lint

# Ver errores sin fix
npx eslint src --ext .ts
```

---

## 📝 Formato de Commits

El sistema sigue **Conventional Commits** en español:

| Tipo              | Cuándo usar              | Ejemplo                                       |
| ----------------- | ------------------------ | --------------------------------------------- |
| `feat(scope)`     | Nueva funcionalidad      | `feat(llm): implementa tool de escalado`      |
| `fix(scope)`      | Corrección de bug        | `fix(auth): corrige validación de token`      |
| `docs(scope)`     | Cambios en docs          | `docs(readme): actualiza guía de instalación` |
| `refactor(scope)` | Refactorización          | `refactor(leads): extrae lógica a servicio`   |
| `test(scope)`     | Tests nuevos/modificados | `test(llm): añade tests unitarios`            |
| `chore(scope)`    | Tareas de mantenimiento  | `chore(deps): actualiza dependencias`         |
| `style(scope)`    | Formato de código        | `style(auth): aplica prettier`                |
| `perf(scope)`     | Mejora de performance    | `perf(db): optimiza query de leads`           |

---

## 🔄 Flujo de Trabajo Recomendado

### Desarrollo de Feature

```bash
# 1. Crear rama
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollar y probar localmente
npm run test:unit -- <archivo-test>

# 3. Cuando termines una parte, publicar
/publish

# 4. Continuar desarrollo...

# 5. Antes de crear PR
/publish-full
```

### Corrección de Bug

```bash
# 1. Crear rama
git checkout -b fix/corregir-bug

# 2. Hacer fix
# ...editar código...

# 3. Publicar rápido
/publish-quick
```

### Actualización de Dependencias

```bash
# 1. Actualizar deps
npm update

# 2. Validar que todo funciona
/publish-full

# 3. Si pasa, commit manual
git add package*.json
git commit -m "chore(deps): actualiza dependencias"
git push
```

---

## 🎓 Tips y Mejores Prácticas

### ✅ DO

- Usa `/publish` para cambios normales
- Usa `/publish-quick` para fixes pequeños
- Usa `/publish-full` antes de crear PR a main
- Deja que el agente analice y cree el commit message
- Ejecuta tests localmente durante desarrollo

### ❌ DON'T

- No uses `--skip-tests` en producción
- No forces push a main/master
- No commitees código que no compila
- No saltés el lint
- No publiques código sin tests

---

## 🔧 Personalización

Para modificar el comportamiento del skill, edita:

```
.opencode/scripts/publish-to-github.js
```

Para añadir nuevos comandos, edita:

```
.opencode/opencode.config.json
```

---

## 📚 Referencias

- [OpenCode Documentation](https://opencode.ai/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Guiders Backend AGENTS.md](../../AGENTS.md)

---

## 🤝 Contribuir

Para mejorar estos comandos:

1. Edita el script o la documentación
2. Prueba tus cambios
3. Ejecuta `/publish` para publicar
4. Crea PR con tus mejoras

---

**Creado para:** Guiders Backend  
**Versión:** 1.0.0  
**Última actualización:** Enero 2026
