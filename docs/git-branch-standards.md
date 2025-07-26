# Estándares de Nomenclatura de Ramas Git

## Estructura de Nombres

Las ramas deben seguir el formato: **`tipo/nombre`**

- **tipo**: Un prefijo que indica el propósito de la rama
- **nombre**: Descripción breve en lowerCamelCase (máximo 30 caracteres total)

### Formato General
```
tipo/nombreEnLowerCamelCase
```

**Ejemplos válidos:**
- `add/userAuthentication`
- `fix/loginValidation`
- `refactor/authService`
- `docs/apiDocumentation`

**Ejemplos inválidos:**
- `add/user_authentication` (usar camelCase, no snake_case)
- `feature/user-authentication` (usar tipo 'add', no 'feature')
- `fix/this_is_a_very_long_branch_name_that_exceeds_thirty_characters` (máximo 30 caracteres)

## Tipos de Ramas

### Ramas de Desarrollo

| Tipo | Propósito | Ejemplo |
|------|-----------|---------|
| `add` | Nuevas funcionalidades | `add/chatNotifications` |
| `fix` | Corrección de bugs | `fix/memoryLeak` |
| `refactor` | Mejoras y refactorización | `refactor/userService` |
| `delete` | Eliminación de código | `delete/deprecatedApi` |
| `docs` | Cambios en documentación | `docs/installGuide` |
| `hotfix` | Cambios directos a producción | `hotfix/securityPatch` |

### Ramas Permanentes

| Rama | Propósito | Descripción |
|------|-----------|-------------|
| `master` | Producción | Código estable listo para producción |
| `develop` | Desarrollo | Integración de nuevas funcionalidades |
| `staging` | Testing/QA | Pruebas de integración y QA |
| `UAT` | User Acceptance Testing | Pruebas de aceptación de usuarios |

## Flujo de Trabajo de Ramas

### 1. Creación de Ramas

**Siempre crear desde la rama base con los últimos cambios:**

```bash
# Para nuevas funcionalidades o fixes
git checkout develop
git pull origin develop
git checkout -b add/newFeatureName

# Para hotfixes (directo a producción)
git checkout master
git pull origin master
git checkout -b hotfix/criticalFix
```

### 2. Nomenclatura Específica

#### Funcionalidades (add/)
```bash
add/userProfile
add/emailNotifications
add/paymentIntegration
add/chatSystem
```

#### Correcciones (fix/)
```bash
fix/loginError
fix/memoryLeak
fix/apiTimeout
fix/dataMigration
```

#### Refactorización (refactor/)
```bash
refactor/authModule
refactor/databaseLayer
refactor/apiEndpoints
refactor/errorHandling
```

#### Eliminación (delete/)
```bash
delete/oldFeature
delete/legacyCode
delete/unusedFiles
delete/deprecatedApi
```

#### Documentación (docs/)
```bash
docs/apiGuide
docs/installInstructions
docs/architecture
docs/contributing
```

#### Hotfixes (hotfix/)
```bash
hotfix/securityPatch
hotfix/dataCorruption
hotfix/serverCrash
hotfix/criticalBug
```

## Buenas Prácticas

### ✅ Hacer

1. **Actualizar constantemente con la rama base**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout mi-rama
   git merge develop
   ```

2. **Eliminar ramas tras el merge**
   ```bash
   # Después del merge exitoso
   git branch -d add/myFeature
   git push origin --delete add/myFeature
   ```

3. **Una responsabilidad por rama**
   - Cada rama debe tener un propósito único y específico
   - No mezclar múltiples funcionalidades o fixes

4. **Mantener nombres descriptivos pero concisos**
   - `add/userAuth` ✅ (claro y corto)
   - `add/authenticationSystemForUsers` ❌ (demasiado largo)

5. **Usar lowerCamelCase consistentemente**
   - `add/chatMessages` ✅
   - `add/chat_messages` ❌
   - `add/ChatMessages` ❌

### ❌ Evitar

1. **No mezclar diferentes desarrollos en una rama**
   ```bash
   # ❌ Incorrecto: mezcla fix y nueva feature
   add/userAuthAndLoginFix
   
   # ✅ Correcto: separar en dos ramas
   add/userAuth
   fix/loginValidation
   ```

2. **No usar nombres genéricos**
   ```bash
   # ❌ Nombres poco descriptivos
   add/changes
   fix/stuff
   refactor/code
   
   # ✅ Nombres específicos
   add/emailValidation
   fix/passwordReset
   refactor/authService
   ```

3. **No exceder el límite de caracteres**
   - Máximo 30 caracteres incluyendo el prefijo y la barra

4. **No usar caracteres especiales**
   ```bash
   # ❌ Caracteres especiales
   add/user@auth
   fix/login#error
   
   # ✅ Solo letras y números
   add/userAuth
   fix/loginError
   ```

## Ejemplos de Casos de Uso

### Desarrollo de Nueva Funcionalidad
```bash
git checkout develop
git pull origin develop
git checkout -b add/chatHistory
# ... desarrollo ...
git add .
git commit -m "feat: implement chat history functionality"
git push origin add/chatHistory
# Crear PR hacia develop
```

### Corrección de Bug
```bash
git checkout develop
git pull origin develop
git checkout -b fix/messageEncryption
# ... corrección ...
git add .
git commit -m "fix: resolve message encryption issue"
git push origin fix/messageEncryption
# Crear PR hacia develop
```

### Hotfix en Producción
```bash
git checkout master
git pull origin master
git checkout -b hotfix/securityVuln
# ... corrección crítica ...
git add .
git commit -m "hotfix: patch critical security vulnerability"
git push origin hotfix/securityVuln
# Crear PR hacia master y develop
```

### Refactorización
```bash
git checkout develop
git pull origin develop
git checkout -b refactor/authModule
# ... refactorización ...
git add .
git commit -m "refactor: improve authentication module structure"
git push origin refactor/authModule
# Crear PR hacia develop
```

## Herramientas de Validación

Para asegurar el cumplimiento de estos estándares, el proyecto incluye:

### Scripts de Utilidad

1. **Creación de ramas**: `./scripts/create-branch.sh`
   ```bash
   ./scripts/create-branch.sh add userAuthentication
   ./scripts/create-branch.sh fix loginError
   ```

2. **Validación de ramas**: `./scripts/validate-branch.sh`
   ```bash
   ./scripts/validate-branch.sh                # Valida rama actual
   ./scripts/validate-branch.sh add/userAuth   # Valida rama específica
   ```

### Git Hooks (Opcional)

Para validación automática en cada commit:

```bash
# Instalar pre-commit hook
./scripts/install-git-hooks.sh

# El hook validará automáticamente la nomenclatura antes de cada commit
# Para omitir la validación: git commit --no-verify
```

### Integración con CI/CD

Se recomienda integrar la validación en pipelines de CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Validate branch name
  run: ./scripts/validate-branch.sh
```

## Recursos Adicionales

- [Guía de Contribución](contribution-guide.md)
- [Flujo de Desarrollo Git](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)