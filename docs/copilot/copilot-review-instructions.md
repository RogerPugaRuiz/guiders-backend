# Guía de Revisión de Código para Copilot

Esta guía define cómo GitHub Copilot debe producir revisiones de código en este repositorio al usar la acción "Review Selection" u otras funciones de análisis. Optimiza la señal y prioriza riesgos reales.

## Objetivo

Entregar una revisión breve, priorizada y accionable que:

- Detecte riesgos (seguridad, datos, concurrencia, rendimiento, consistencia lógica) antes que estilo.
- Señale bugs probables y casos límite omitidos.
- Sugiera mejoras claras con ejemplo cuando el cambio no sea trivial.
- Evite ruido (micro‑nitpicks de formato si ya hay hallazgos críticos).

## Principios

1. Prioriza impacto sobre cantidad de comentarios.
2. Una sola vez por tipo de problema (no repetir el mismo hallazgo en cada línea, referenciar patrón).
3. Usa español técnico neutro, modo imperativo.
4. No reescribas todo el código: propone diffs focalizados cuando añada valor.
5. Señala TODO / FIXME / HACK y evalúa si requieren acción inmediata.
6. Si algo es aceptable pero mejorable, usar etiqueta "MEJORA"; si es riesgo, usar "RIESGO"; si es crítico bloquear, usar "CRÍTICO".
7. Evita opiniones puramente subjetivas (estilo preferencial) salvo que haya inconsistencia interna.

## Áreas a Evaluar (en este orden)

1. Seguridad (inyección, exposición de secretos, validaciones faltantes, uso inseguro de libs, serialización).
2. Integridad de datos y lógica de dominio.
3. Errores y excepciones: manejo, propagación, silenciamiento indebido.
4. Concurrencia / estado compartido / race conditions (especial atención a caches, singletons, websockets, colas, promesas sin await).
5. Rendimiento (loops O(n^2) innecesarios, consultas N+1, conversión redundante, I/O síncrona bloqueante en hot-path).
6. Escalabilidad y backpressure (colas, streams, websockets, reintentos exponenciales, timeouts ausentes).
7. Fiabilidad y resiliencia (reintentos, circuit breakers, timeouts, idempotencia).
8. Observabilidad (logs estructurados, nivel correcto, trazas, métricas clave faltantes).
9. Tests (cobertura de casos borde, invariantes, mocks excesivos, ausencia de pruebas para ramas críticas / errores).
10. Legibilidad y mantenibilidad (nombres, complejidad ciclomática alta, función gigante sin cohesión, duplicación).
11. Consistencia (patrones del repositorio: DTOs, servicios, inyección dependencias, naming, exceptions custom).
12. Estilo y formato (solo si nada anterior bloquea o ya se cubrió lo crítico).

## Clasificación de Severidad

- CRÍTICO: Error explotable, bug lógico evidente, corrupción de datos, fuga sensible, carrera probable.
- RIESGO: Falta robustez, podría degradar rendimiento / generar fallos intermitentes.
- MEJORA: Optimización o refactor que reduce deuda, no bloquea merge.
- NIT: Detalle cosmético; omitir si hay ≥1 CRÍTICO o ≥2 RIESGO.

## Formato de Salida

Usa exactamente las secciones (omite las que estén vacías). Plantilla sugerida:

Sección "Resumen": 1‑3 líneas con alcance y riesgo global.

Sección "Hallazgos Críticos": bullets con formato:
`1. [CRÍTICO][CATEGORÍA] Descripción. Impacto: <impacto>. Recomendación: <acción>.`

Sección "Riesgos": igual formato usando [RIESGO].

Sección "Mejoras": igual formato usando [MEJORA].

Sección "Observaciones Menores": sólo si no hay críticos pendientes.

Sección "Casos Borde Faltantes": lista de escenarios omitidos.

Sección "Diff Sugerido (Opcional)": incluir bloque diff solo si clarifica.

Ejemplo de diff:

```diff
--- antes
+++ después
@@
- const timeout = 0
+ const timeout = 5000 // evita espera indefinida
```

Sección "Checklist": lista de verificación (marcar si aplica). Ejemplo:

```md
- [ ] Seguridad validada entrada externa
- [ ] Errores manejados / no tragados
- [ ] Sin N+1 / patrones O(n^2) inadvertidos
- [ ] Timeouts / reintentos razonables (si aplica)
- [ ] Logs útiles (sin secretos)
- [ ] Tests para paths felices y fallos
- [ ] Sin duplicación significativa
- [ ] Nombres claros
- [ ] Sin TODO crítico pendiente
```

Sección "Notas": contexto breve adicional.

Reglas del formato:

- Prefijos de etiquetas entre corchetes en este orden: \[SEVERIDAD]\[CATEGORIA OPCIONAL]. Categorías sugeridas: SECURITY, DATA, LOGIC, PERF, RELIABILITY, CONCURRENCY, OBS, TEST, STYLE, DOCS.
- Máx 110 caracteres por bullet (envolver si excede, sin perder claridad).
- No incluir disculpas ni frases como "quizá" si la certeza es alta; usar probabilidad: "Probable", "Posible" si aplica.

## Heurísticas Rápidas

- Promesas sin await / .catch => posible manejo incompleto de errores.
- Cualquier entrada de usuario sin validación / sanitización => SECURITY.
- Uso de console.log en lugar de logger del proyecto => OBS.
- Repetición de bloques ≥3 veces => candidato a refactor.
- Try/catch vacío o que solo hace log sin contexto => RIESGO.
- DTO vs entidad mezclada en controladores => inconsistencia.
- Falta de índices en consultas filtradas repetitivas => PERF (solo señalar, no inventar índice exacto sin evidencia).

## Ejemplo de Hallazgo Bien Formado

```text
[CRÍTICO][SECURITY] Falta validación de payload en ChatController#create: permite inyección de operadores Mongo. Impacto: escalada de consulta. Recomendación: aplicar esquema DTO + class-validator y whitelisting.
```

## Qué NO Hacer

- No transformar la revisión en un diff gigante reescribiendo estilo.
- No repetir la misma recomendación por cada línea similar.
- No marcar como crítico algo meramente estético.
- No sugerir dependencias externas sin justificar beneficio claro.

## Salida Vacía

Si no hay problemas relevantes: entregar solo:

```md
### Resumen
Sin hallazgos significativos. Código consistente con estándares actuales.
```

## Identificador

Añadir al final (fuera de bloques de código) la marca: `[review-style-v1]`.

---

Esta guía tiene prioridad sobre cualquier configuración previa para revisiones.
