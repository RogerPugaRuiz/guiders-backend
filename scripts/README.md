# Scripts de Utilidad

Este directorio contiene scripts de utilidad para facilitar el desarrollo y mantenimiento del proyecto.

## Scripts de Gestión de Ramas Git

### `create-branch.sh`
Crea una nueva rama siguiendo los estándares de nomenclatura del proyecto.

**Uso:**
```bash
./scripts/create-branch.sh <tipo> <nombre>
```

**Ejemplos:**
```bash
./scripts/create-branch.sh add userAuthentication
./scripts/create-branch.sh fix loginValidation
./scripts/create-branch.sh docs apiDocumentation
```

**Tipos disponibles:**
- `add` - Nuevas funcionalidades
- `fix` - Corrección de bugs
- `refactor` - Mejoras y refactorización
- `delete` - Eliminación de código
- `docs` - Cambios en documentación
- `hotfix` - Cambios directos a producción

### `validate-branch.sh`
Valida que el nombre de una rama cumple con los estándares del proyecto.

**Uso:**
```bash
./scripts/validate-branch.sh [nombre-rama]
```

**Ejemplos:**
```bash
./scripts/validate-branch.sh                 # Valida rama actual
./scripts/validate-branch.sh add/userAuth    # Valida rama específica
```

### `install-git-hooks.sh`
Instala un pre-commit hook que valida automáticamente la nomenclatura de ramas.

**Uso:**
```bash
./scripts/install-git-hooks.sh
```

**Características:**
- Valida nomenclatura antes de cada commit
- Crea backup de hooks existentes
- Se puede omitir con `git commit --no-verify`

### `pre-commit-hook-template`
Template del pre-commit hook utilizado por `install-git-hooks.sh`.

## Otros Scripts

### `mongo-init.js`
Script de inicialización para MongoDB (si se usa).

## Documentación Relacionada

- [Estándares de Nomenclatura de Ramas Git](../docs/git-branch-standards.md)
- [Guía de Contribución](../docs/contribution-guide.md)

## Permisos de Ejecución

Para dar permisos de ejecución a todos los scripts:

```bash
chmod +x scripts/*.sh
```

## Ayuda

Todos los scripts incluyen ayuda integrada:

```bash
./scripts/create-branch.sh --help
./scripts/validate-branch.sh --help
```