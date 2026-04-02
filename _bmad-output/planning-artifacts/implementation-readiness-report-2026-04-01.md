---
stepsCompleted:
  [
    step-01-document-discovery,
    step-02-prd-analysis,
    step-03-epic-coverage-validation,
    step-04-ux-alignment,
    step-05-epic-quality-review,
    step-06-final-assessment,
  ]
filesIncluded:
  - prd.md
  - architecture.md
  - epics.md
  - adr-001-ddd-cqrs.md
  - adr-002-dual-persistence.md
missingDocuments:
  - UX Design (no aplica — proyecto backend puro)
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-01
**Project:** guiders-backend
**Assessor:** BMad Implementation Readiness Workflow

## Document Inventory

### PRD

- `prd.md` (12,354 bytes)

### Architecture

- `architecture.md` (23,070 bytes)
- `adr-001-ddd-cqrs.md` (1,732 bytes)
- `adr-002-dual-persistence.md` (1,009 bytes)

### Epics & Stories

- `epics.md` (41,846 bytes)

### UX Design

- No aplica — proyecto backend puro (confirmado en epics.md)

## PRD Analysis

### Functional Requirements

- **FR1:** Agregacion MongoDB de eventos PAGE_VIEW por URL para cada visitante → top 5 paginas con conteo de visitas
- **FR2:** Campo `topPages: {url: string, visits: number}[]` anadido a `GetVisitorActivityResponseDto`
- **FR3:** Sin nuevo endpoint — se amplia el existente `get-visitor-activity`
- **FR4:** Nuevo metodo `getTopPagesByVisitor` en `TrackingEventRepository`
- **FR5:** Nuevo command `RegisterVisitorLeadCommand` — registra nombre, email y telefono del visitante
- **FR6:** Transicion automatica de lifecycle a `LEAD` al registrar datos personales
- **FR7:** Event handler sync asincrono (fire-and-forget con 1 retry)
- **FR8:** Config: API key de Leadcars por empresa (en `company` context)
- **FR9:** Nuevo contexto `leadcars` en infrastructure (cliente HTTP)
- **FR10:** Endpoint `POST /visitors/:id/register-lead`
- **FR11:** Estado `sync_status` en el lead (`pending | synced | failed`)
- **FR12:** Job de retry para syncs fallidos
- **FR13:** Log de intentos de sync
- **FR14:** Respuesta de la API con estado de sync explicito
- **FR15:** Campo `leadcarsApiKey` en `company` context
- **FR16:** Endpoint de verificacion de conexion Leadcars
- **FR17:** Scope de API key por tenant (un tenant = una API key de Leadcars)

**Total FRs: 17**

### Non-Functional Requirements

- **NFR1:** `GET /visitor-activity` no supera +100ms de latencia adicional al incluir top paginas
- **NFR2:** Sync a Leadcars es no bloqueante — timeout maximo 3s, retry automatico 1 vez
- **NFR3:** Fiabilidad de entrega a Leadcars ≥ 99% (con retry en fallo transitorio)
- **NFR4:** Latencia get-visitor-activity ≤ 200ms p95
- **NFR5:** Leads sincronizados a Leadcars ≥ 99%
- **NFR6:** Tiempo de sync a Leadcars ≤ 5s
- **NFR7:** Visitantes con intereses detectables ≥ 60%
- **NFR8:** Si Leadcars no esta disponible, guiders no se bloquea

**Total NFRs: 8**

### Additional Requirements

- **Constraint:** Proyecto brownfield — integracion incremental sobre DDD/CQRS existente
- **Constraint:** Multi-tenant — cada empresa tiene su propia API key
- **Business Rule:** El comercial ve las top 5 paginas ANTES de abrir el chat
- **Business Rule:** Lead aparece en Leadcars en menos de 5 segundos
- **Integration:** Cliente HTTP para API de Leadcars con autenticacion por API key

### PRD Completeness Assessment

El PRD es claro, con journeys bien definidos y criterios de exito medibles. No tiene FRs numerados explicitamente (se extrajeron del contenido). Las metricas de exito incluyen targets cuantificables.

## Epic Coverage Validation

### Coverage Matrix

| FR PRD | Requisito PRD                         | Cobertura en Epics                              | Estado     |
| ------ | ------------------------------------- | ----------------------------------------------- | ---------- |
| FR1    | Agregacion MongoDB PAGE_VIEW top 5    | FR-01 → Epic 1, Story 1.1                       | ✓ Cubierto |
| FR2    | Campo topPages en DTO                 | FR-02 → Epic 1, Story 1.2                       | ✓ Cubierto |
| FR3    | Ampliar endpoint get-visitor-activity | FR-02 → Epic 1, Story 1.2                       | ✓ Cubierto |
| FR4    | Metodo getTopPagesByVisitor           | FR-01 → Epic 1, Story 1.1                       | ✓ Cubierto |
| FR5    | RegisterVisitorLeadCommand            | FR-03 → Epic 3, Story 3.1 (renombrado)          | ✓ Cubierto |
| FR6    | Transicion lifecycle a LEAD           | FR-04 → Epic 3, Story 3.3                       | ✓ Cubierto |
| FR7    | Event handler sync asincrono          | FR-05 → Epic 3, Story 3.3 (retry HTTP x3)       | ✓ Cubierto |
| FR8    | Config API key por empresa            | FR-08 → Epic 2, Story 2.1 (MongoDB, no company) | ✓ Cubierto |
| FR9    | Contexto leadcars                     | AR-01 → Adapter pattern en leads/               | ✓ Cubierto |
| FR10   | Endpoint register-lead                | FR-03 → Epic 3, Story 3.1 (ruta diferente)      | ✓ Cubierto |
| FR11   | Estado sync_status                    | FR-06 → Epic 3, Story 3.2 (CrmSyncRecord)       | ✓ Cubierto |
| FR12   | Job de retry para syncs fallidos      | FR-05 → Solo retry HTTP sincrono                | ⚠️ Parcial |
| FR13   | Log de intentos de sync               | FR-06 → Epic 3, Story 3.2                       | ✓ Cubierto |
| FR14   | Respuesta API con estado sync         | FR-07 → Epic 3, Story 3.1                       | ✓ Cubierto |
| FR15   | leadcarsApiKey en company             | FR-08 → Epic 2 (clienteToken en MongoDB)        | ✓ Cubierto |
| FR16   | Endpoint verificacion conexion        | FR-09 → Epic 2, Story 2.4                       | ✓ Cubierto |
| FR17   | Scope API key por tenant              | FR-08 → Indice unique (companyId, crmType)      | ✓ Cubierto |

### Missing Requirements

#### ⚠️ FR12 — Job de retry para syncs fallidos (Cobertura Parcial)

- **PRD dice:** Job de retry automatico; Journey 3 promete "cuando Leadcars vuelve, el lead aparece"
- **Epics implementan:** Solo retry HTTP sincrono (3 intentos). Syncs `failed` quedan para retry manual
- **Gap:** No hay mecanismo automatico de re-sync de leads fallidos
- **Impacto:** El Journey 3 del PRD no se cumple completamente
- **Recomendacion:** Anadir story para job/cron de retry de syncs fallidos, o actualizar PRD Journey 3 para reflejar la realidad

### FRs en Epics NO presentes en PRD

- FR-10: Sanitizacion de token en logs (detalle de implementacion)
- FR-12: Sync chat a CRM en cierre (feature nueva)
- FR-13: Proxy discovery LeadCars (feature nueva)
- FR-14: CRUD completo config CRM (feature nueva)
- FR-15 a FR-19: Alineacion API v2.4 (epic nuevo)

### Coverage Statistics

- **Total FRs del PRD:** 17
- **FRs cubiertos:** 16 (94%)
- **FRs parcialmente cubiertos:** 1 (FR12)
- **FRs no cubiertos:** 0
- **FRs adicionales en epics:** 8

## UX Alignment Assessment

### UX Document Status

No encontrado — **no aplica**.

### Justificacion

- El PRD es explicitamente un proyecto backend puro (API + WebSocket)
- El documento de epics confirma: "No aplica — proyecto backend puro"
- Los endpoints son APIs REST que devuelven JSON
- Los componentes UI mencionados en los journeys ("consola comercial", "panel de actividad") pertenecen al frontend, fuera del alcance de este PRD

### Advertencia

El PRD hace promesas de experiencia de usuario ("Carlos ve las top 5 paginas") que dependen de un frontend que consuma las APIs. Asegurar que el equipo de frontend esta alineado con los contratos de API.

## Epic Quality Review

### Validacion de Valor de Usuario por Epic

| Epic   | Valor Usuario                                | Independencia     | Veredicto          |
| ------ | -------------------------------------------- | ----------------- | ------------------ |
| Epic 1 | ✓ El comercial ve las top 5 paginas          | ✓ Independiente   | OK                 |
| Epic 2 | ✓ El admin configura la integracion          | ✓ Independiente   | OK                 |
| Epic 3 | ✓ El comercial guarda datos y se sincronizan | ✓ Depende de E2   | OK                 |
| Epic 4 | ⚠️ Tecnico — "los tipos deben alinearse"     | ✓ Depende de E2+3 | **Issue: tecnico** |

### Hallazgos por Severidad

#### 🟠 Major Issues (4)

**1. Epic 4 es un epic tecnico, no orientado a valor de usuario**

- Titulo actual: "Alineacion con API LeadCars v2.4"
- **Remediacion:** Renombrar a: "Los leads y conversaciones se sincronizan correctamente con LeadCars v2.4 sin errores de formato ni perdida de datos"

**2. Story 4.1 esta sobredimensionada (10+ cambios en 3 archivos)**

- Incluye renombrar campos, cambiar tipos, eliminar enums, anadir campos, cambiar logica de mapeo
- **Remediacion:** Dividir en: (a) Corregir tipos en `leadcars.types.ts` + `LeadcarsConfig`, (b) Actualizar mapeo en adapter y api service

**3. Story 4.4 tiene ACs incompletos — depende de investigacion en sandbox**

- "Verificar en sandbox el formato real (no esta documentado en el PDF)"
- Es un spike mezclado con implementacion
- **Remediacion:** Crear spike previo (Story 4.0) para verificar formatos reales en sandbox, luego definir ACs concretos

**4. Story 4.5 (Automagic) es demasiado grande para una sola story**

- Nuevo modulo con autenticacion diferente, 3 endpoints API, config changes, auto-asignacion
- **Remediacion:** Dividir en: (a) Tipos y API Service, (b) Asignacion automatica, (c) Endpoints admin

#### 🟡 Minor Concerns (3)

**5. Story 1.1 es puramente tecnica** — aceptable como fundacion para Story 1.2 en patron DDD

**6. Story 3.5 (tests) como story separada** — aceptable como deuda tecnica documentada, ya que stories 3.1-3.4 estan done sin tests

**7. FR-11 tachado en inventario de requisitos** — genera ruido documental menor

### Best Practices Compliance

| Criterio                        | Epic 1 | Epic 2 | Epic 3 | Epic 4 |
| ------------------------------- | ------ | ------ | ------ | ------ |
| Entrega valor usuario           | ✓      | ✓      | ✓      | ⚠️     |
| Funciona independientemente     | ✓      | ✓      | ✓      | ✓      |
| Stories bien dimensionadas      | ✓      | ✓      | ✓      | ⚠️     |
| Sin dependencias hacia adelante | ✓      | ✓      | ✓      | ✓      |
| ACs claros y testables          | ✓      | ✓      | ✓      | ⚠️     |
| Trazabilidad a FRs              | ✓      | ✓      | ✓      | ✓      |

## Summary and Recommendations

### Overall Readiness Status

**READY WITH OBSERVATIONS** — El proyecto esta listo para implementacion con observaciones menores que conviene abordar.

### Resumen Ejecutivo

- **PRD:** Solido, con journeys claros y metricas medibles. 17 FRs + 8 NFRs bien definidos.
- **Arquitectura:** Documentada con ADRs. Las divergencias entre plan original e implementacion estan documentadas en epics.md.
- **Cobertura FR:** 94% (16/17 cubiertos, 1 parcial). 8 FRs adicionales en epics reflejan scope expandido.
- **UX:** No aplica (backend puro). Sin gap.
- **Calidad Epics:** Epics 1-3 solidos. Epic 4 necesita refinamiento (tecnico, stories sobredimensionadas, ACs incompletos).

### Issues Criticos que Requieren Accion Inmediata

Ninguno critico. El proyecto puede proceder a implementacion.

### Issues que Conviene Abordar

1. **FR12 — Retry asincrono de syncs fallidos:** El Journey 3 del PRD promete auto-recovery. Decision necesaria: anadir story de retry cron, o actualizar PRD para reflejar que el retry es solo sincrono.

2. **Epic 4 — Refinamiento previo a implementacion:**
   - Renombrar epic para reflejar valor de usuario
   - Dividir Story 4.1 en 2 stories
   - Crear spike para Story 4.4 (verificacion sandbox)
   - Dividir Story 4.5 (Automagic) en 2-3 stories

### Recommended Next Steps

1. **Decidir sobre FR12 (retry asincrono):** Tomar decision explicita — implementar job o actualizar PRD
2. **Refinar Epic 4** antes de iniciar su implementacion — las stories backlog necesitan ajuste
3. **Epics 1, 2 y 3 estan listos** — Epic 1 puede comenzar implementacion inmediatamente; Epic 2 y 3 estan mayormente done
4. **Considerar errores LSP existentes** — Se detectaron errores de tipos en `leads-admin.controller.ts` y `leadcars-crm-sync.adapter.ts` que corresponden exactamente a los cambios descritos en Story 4.1 (tipos ya parcialmente actualizados en codigo pero no en las definiciones de tipos)

### Final Note

Esta evaluacion identifico **5 issues** en **3 categorias** (1 gap de cobertura FR parcial, 4 issues de calidad de epics). Ningun issue es bloqueante para la implementacion. Los Epics 1-3 estan en buen estado. El Epic 4 se beneficiaria de refinamiento antes de comenzar su implementacion.

**Nota adicional sobre errores de tipos existentes:** Los errores LSP detectados en el codigo (`tipoLeadDefault: number vs string`, `Property 'provincia' does not exist`, etc.) confirman que Story 4.1 del Epic 4 ya tiene trabajo parcialmente avanzado — los usos del tipo se actualizaron pero las definiciones de tipos aun no. Esto refuerza la necesidad de priorizar la Story 4.1.
