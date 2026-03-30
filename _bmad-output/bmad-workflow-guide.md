# Guía de Uso BMAD en guiders.es — Day-to-Day

**Versión:** 1.0  
**Fecha:** 30/03/2026

---

## ¿Qué es BMAD?

BMAD (Breakthrough Method for Agile AI-Driven Development) es un framework que estructura el desarrollo con agentes IA siguiendo metodología ágil. Proporciona agentes especializados (PM, Arquitecto, Developer) que trabajan con documentos de contexto para generar código y decisiones de calidad.

---

## Estructura instalada

```
guiders-backend/
├── _bmad/              # Configuración e instrucciones de agentes
│   ├── bmm/            # Módulo BMad Method
│   │   ├── 1-analysis/     # Fase de análisis
│   │   ├── 2-plan-workflows/ # Planificación
│   │   ├── 3-solutioning/  # Diseño de solución
│   │   └── 4-implementation/ # Implementación
│   └── core/           # Núcleo BMAD
├── _bmad-output/       # Artefactos generados (PRDs, ADRs, historias...)
│   ├── product-brief.md       ✅ Creado
│   ├── planning-artifacts/    # PRDs, historias de usuario
│   └── implementation-artifacts/ # Specs técnicas
└── .claude/skills/     # Skills para Claude Code (43 skills instaladas)
```

---

## Flujo de trabajo para una nueva feature

### Paso 1 — Briefing (Sinapsis / tú)
Describir la feature en lenguaje natural. Ejemplo:
> "Quiero que los comerciales puedan ver los intereses del visitante (páginas visitadas, tiempo en página) en el panel lateral del chat."

### Paso 2 — PRD con agente PM
En Claude Code (o Cursor), invocar:
```
bmad-agent-pm
```
El agente PM hace preguntas para generar un PRD completo con:
- Objetivo del negocio
- Criterios de aceptación
- Historias de usuario
- Métricas de éxito

Output: `_bmad-output/planning-artifacts/prd-[feature].md`

### Paso 3 — Architecture review
```
bmad-agent-architect
```
El agente Arquitecto revisa el PRD y genera:
- Decisiones de diseño (ADRs)
- Impacto en contextos DDD existentes
- Consideraciones técnicas

Output: `_bmad-output/planning-artifacts/architecture-[feature].md`

### Paso 4 — Implementación
```
bmad-agent-dev
```
El agente Developer genera código siguiendo el PRD y las decisiones de arquitectura, respetando los patrones DDD+CQRS del proyecto.

### Paso 5 — Validación
```
bmad-validate-prd
```
Verifica que la implementación cubre todos los criterios de aceptación del PRD.

---

## Comandos más usados

| Skill | Cuándo usarla |
|---|---|
| `bmad-help` | Primera vez, para orientarte |
| `bmad-agent-pm` | Crear o editar un PRD |
| `bmad-create-prd` | Generar PRD desde cero con guía paso a paso |
| `bmad-edit-prd` | Modificar un PRD existente |
| `bmad-validate-prd` | Validar que el PRD está completo |
| `bmad-agent-architect` | Diseño técnico de la solución |

---

## Dónde están los artefactos

| Artefacto | Ruta |
|---|---|
| Product Brief | `_bmad-output/product-brief.md` |
| PRDs | `_bmad-output/planning-artifacts/` |
| ADRs | `_bmad-output/planning-artifacts/adr-*.md` |
| Historias de usuario | `_bmad-output/planning-artifacts/stories-*.md` |
| Specs implementación | `_bmad-output/implementation-artifacts/` |

---

## Contexto clave para los agentes

Los agentes de BMAD leen automáticamente:
- `docs/` del proyecto (documentación existente)
- `CLAUDE.md` (guía del proyecto para Claude Code)
- Los artefactos previos en `_bmad-output/`

Para que el contexto sea rico, mantén actualizado `CLAUDE.md` y guarda los PRDs en `_bmad-output/`.

---

## Recomendaciones para guiders.es

1. **Antes de cada feature nueva:** ejecutar `bmad-create-prd` para documentar el "por qué" antes del "cómo"
2. **Cambios de arquitectura:** siempre pasar por `bmad-agent-architect` — el sistema DDD+CQRS tiene muchas implicaciones
3. **ADRs:** documentar decisiones importantes en `_bmad-output/planning-artifacts/adr-*.md`
4. **El frontend tiene su propio BMAD** en `guiders-frontend/_bmad` — úsalo para features de UI

---

*Generado por Sinapsis — 30/03/2026*
