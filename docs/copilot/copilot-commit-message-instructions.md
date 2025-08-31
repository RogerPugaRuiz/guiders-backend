## Estilo de Mensajes de Commit (Guía para Copilot)

Cuando GitHub Copilot genere mensajes de commit en este repositorio DEBE seguir estas reglas (Conventional Commits adaptado):

1. Formato de la primera línea:
  `<tipo>(<scope opcional>): <resumen en minúsculas y modo imperativo>`
  - Máx 72 caracteres.
  - Sin punto final.
2. Línea en blanco tras el encabezado.
3. Cuerpo (opcional) con el qué y el porqué (no el cómo). Envuelve a 72-100 cols.
4. Si aplica breaking change añade bloque al final:
  `BREAKING CHANGE: <descripción>`
5. Idioma: Español neutro técnico.
6. Evitar mensajes genéricos como "arreglos" o "updates".

Tipos permitidos (prioridad en este orden):
- `feat`: Nueva funcionalidad usuario final (SDK o API pública)
- `fix`: Corrección de bug (describir síntoma observable)
- `perf`: Mejora de rendimiento
- `refactor`: Cambio interno sin alterar comportamiento externo
- `docs`: Solo documentación (README, guías, comentarios relevantes)
- `test`: Añade / ajusta pruebas (sin código productivo excepto helpers de test)
- `build`: Cambios en build, dependencias, empaquetado
- `ci`: Cambios en pipelines CI/CD
- `style`: Formato / estilos (sin lógica)
- `chore`: Tareas varias sin impacto en el runtime (scripts, limpieza)
- `revert`: Reversión de commit previo (`revert: <hash corto> <resumen>`)

Convenciones adicionales:
- Scope ejemplos: `pipeline`, `chat`, `session`, `heuristic`, `tracking`, `deps`, `docs`, `build`, `ws`.
- Usar varios scopes solo si imprescindible: `feat(pipeline,tracking): ...` (máx 2).
- Prefijo seguridad: usar `fix(security):`, nunca crear tipo nuevo.
- Referencias a issues: cerrar con línea `Refs: #123` o `Closes: #123`.

Ejemplos buenos:
```
feat(chat): soporte de reconexión exponencial en websocket-service

Añade lógica de backoff exponencial con jitter para reducir tormenta de reconexiones.
Incluye métrica interna de intentos y evento de telemetría.
```
```
fix(session): corrige fuga de intervalos en cleanup de SessionTrackingManager

Se detenían heartbeats duplicados tras re-init. Ahora se limpia antes de recrear.
```
```
refactor(pipeline): extrae MetadataStage para aislar enriquecimiento
```
```
feat(heuristic)!: nuevo umbral dinámico por tipo de elemento

BREAKING CHANGE: La config previa `confidenceThreshold` pasa a `globalThreshold`.
```

Anti‑patrones (NO usar):
- `update code`, `misc changes`, `arreglos menores`.
- Mezclar refactor + feat en un solo commit grande.
- Describir cómo ("cambié forEach por map"), omitir el porqué.

Reglas de división sugerida:
- Cambios de dependencias separados (`build(deps): ...`).
- Refactors masivos sin feature: dividir por dominio.
- Documentación extensa separada de la feature (`docs:` independiente) salvo README mínimo.

Resumen para el generador:
```
Genera 1 encabezado tipo Conventional Commit en español imperativo, <=72 chars, sin punto final. Lista 1-3 bullets opcionales en cuerpo si añaden contexto de valor (qué/porqué). Añade BREAKING CHANGE si detectas cambios incompatibles.
```

Si el diff solo contiene formatos o Prettier: usar `style(...)`.
Si solo es ESLint autofix sin lógica: también `style(...)`.
Si incluye actualización de versión + changelog: `chore(release): <versión>`.

para saber que se esta usando esta guia, al final del mensaje añade la id `[commit-style-v1]`.

Esta guía tiene prioridad sobre cualquier otra instrucción previa para mensajes de commit.