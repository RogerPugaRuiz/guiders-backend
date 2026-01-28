# OpenCode Agent Instructions - Publish Commands

## Context

This project has custom OpenCode commands for automating the GitHub publish workflow with quality validations.

## Available Commands

### `/publish` (Standard)

Execute the standard publish workflow with full validations.

**Steps:**

1. Run `npm run lint` - Must pass
2. Run `npm run test:unit` - Must pass
3. Run `npm run test:int:dev` - Must pass
4. Run `npm run build` - Must pass
5. If there are uncommitted changes:
   - Analyze changes with `git diff` and `git status`
   - Generate Conventional Commit message in Spanish
   - Execute `git add -A && git commit -m "<message>"`
6. If there are unpushed commits:
   - Execute `git push origin <current-branch>`

**Stop immediately if any step fails.**

### `/publish-quick` (Quick)

Execute quick publish (lint + unit tests only).

**Steps:**

1. Run `npm run lint` - Must pass
2. Run `npm run test:unit` - Must pass
3. Run `npm run build` - Must pass
4. Git commit + push (same as standard)

### `/publish-full` (Full with E2E)

Execute complete publish including E2E tests.

**Steps:**

1. Run `npm run lint` - Must pass
2. Run `npm run test:unit` - Must pass
3. Run `npm run test:int:dev` - Must pass
4. Run `npm run test:e2e` - Must pass
5. Run `npm run build` - Must pass
6. Git commit + push (same as standard)

## Implementation Guidelines

### When User Invokes Command

If user writes:

- `/publish`
- `/publish-quick`
- `/publish-full`
- "publica los cambios"
- "haz deploy"
- "publish to github"

**Then:**

1. **Show plan** - Tell user what you will do:

   ```
   Voy a publicar los cambios a GitHub con las siguientes validaciones:
   1. Lint
   2. Tests unitarios
   3. Tests de integración
   4. Build
   5. Commit y push
   ```

2. **Execute sequentially** - Run each command using bash tool:

   ```typescript
   // Step 1: Check git status
   await bash('git status')
   await bash('git branch --show-current')

   // Step 2: Run lint
   await bash('npm run lint')
   // If fails, STOP and show error

   // Step 3: Run unit tests
   await bash('npm run test:unit')
   // If fails, STOP and show error

   // Step 4: Run integration tests
   await bash('npm run test:int:dev')
   // If fails, STOP and show error

   // Step 5: Build
   await bash('npm run build')
   // If fails, STOP and show error

   // Step 6: Git operations
   // Check if there are uncommitted changes
   const status = await bash('git status --porcelain')

   if (status has changes) {
     // Show changes
     await bash('git diff --stat')

     // Analyze and create commit message
     const message = analyzeChangesAndCreateMessage()

     // Commit
     await bash(`git add -A && git commit -m "${message}"`)
   }

   // Step 7: Push
   await bash('git push origin <branch>')
   ```

3. **Show results** - Display summary:

   ```
   ✅ Lint: PASSED
   ✅ Unit Tests: PASSED (234 tests)
   ✅ Integration Tests: PASSED (12 tests)
   ✅ Build: PASSED
   ✅ Commit: feat(llm): implementa tool de escalado
   ✅ Push: origin/develop

   🚀 Cambios publicados exitosamente a GitHub
   ```

### Error Handling

If ANY step fails:

1. **Stop immediately** - Do NOT continue to next step
2. **Show error** - Display the full error output
3. **Provide guidance** - Suggest how to fix
4. **DO NOT commit or push** - Never commit if validations fail

Example:

```
❌ Tests unitarios fallaron

Error: 2 tests failing in src/context/llm/__tests__/tool-executor.service.spec.ts

Debes corregir los tests antes de publicar. Ejecuta:
npm run test:unit

Proceso detenido. No se ha creado commit ni push.
```

### Commit Message Generation

When analyzing changes for commit message:

1. **Analyze files changed:**

   ```bash
   git diff --stat
   git diff --cached --name-only
   ```

2. **Determine commit type:**

   - New files in domain/entities → `feat`
   - Files in **tests**/ → `test`
   - Files in infrastructure/dto/ → Usually part of larger feature
   - Multiple contexts → Choose primary context

3. **Follow Conventional Commits (Spanish):**

   - `feat(scope): descripción` - New feature
   - `fix(scope): descripción` - Bug fix
   - `refactor(scope): descripción` - Refactoring
   - `test(scope): descripción` - Tests
   - `docs(scope): descripción` - Documentation
   - `chore(scope): descripción` - Maintenance

4. **Examples:**
   - `feat(llm): implementa tool de escalado a comercial`
   - `fix(auth): corrige validación de tokens expirados`
   - `test(leads): añade tests unitarios para SaveLeadCommand`
   - `refactor(shared): extrae lógica de email a servicio`
   - `chore(deps): actualiza dependencias de seguridad`

### Safety Checks

**Before pushing:**

- ✅ Verify current branch (show warning if main/master)
- ✅ All tests must pass
- ✅ Build must succeed
- ✅ Lint must pass

**Never:**

- ❌ Use `git push --force`
- ❌ Use `git commit --no-verify`
- ❌ Skip hooks
- ❌ Commit if tests fail
- ❌ Push to main/master without user confirmation

## Natural Language Interpretation

User may request publish in various ways. Interpret these as `/publish`:

- "publica los cambios"
- "haz deploy"
- "sube esto a github"
- "quiero publicar"
- "publish to github"
- "push to remote"

Use `/publish-quick` if user says:

- "publica rápido"
- "quick deploy"
- "solo con unit tests"

Use `/publish-full` if user says:

- "publica con todo"
- "full deploy"
- "con tests e2e"
- "validación completa"

## Script Alternative

The project also has a Node.js script that can be executed directly:

```bash
node .opencode/scripts/publish-to-github.js [--quick|--with-e2e|--skip-tests]
```

However, **prefer implementing the workflow directly in OpenCode** using bash commands, as this:

- Provides better visibility to the user
- Allows for interactive error handling
- Gives you control over commit message generation
- Enables you to analyze changes more intelligently

Only mention the script as an alternative if the user asks about running it manually.

## Example Interaction

**User:** `/publish`

**Agent:**

```
Voy a publicar los cambios a GitHub ejecutando:
1. Lint
2. Tests unitarios
3. Tests de integración
4. Build
5. Análisis de cambios y commit
6. Push a origin/develop

Comenzando...
```

[Executes lint]

```
✅ Lint: PASSED
```

[Executes unit tests]

```
✅ Unit Tests: PASSED (234 tests, 87% coverage)
```

[Executes integration tests]

```
✅ Integration Tests: PASSED (12 tests)
```

[Executes build]

```
✅ Build: PASSED
```

[Analyzes changes]

```
📝 Cambios detectados:
- src/context/llm/application/commands/notify-commercial-command.handler.ts (nuevo)
- src/context/llm/infrastructure/services/tool-executor.service.impl.ts (modificado)
- src/context/llm/domain/value-objects/tool-config.ts (modificado)

Creando commit: feat(llm): implementa tool de escalado a comercial
```

[Commits and pushes]

```
✅ Commit creado: abc1234
✅ Push completado: origin/develop

🚀 Cambios publicados exitosamente a GitHub
```

---

**When in doubt, follow the workflow described above step by step, stopping immediately if any validation fails.**
