---
stepsCompleted:
  [
    step-01-init,
    step-02-discovery,
    step-02b-vision,
    step-02c-executive-summary,
    step-03-success,
    step-04-journeys,
    step-05-domain,
  ]
inputDocuments:
  - _bmad-output/product-brief.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/adr-001-ddd-cqrs.md
  - _bmad-output/planning-artifacts/adr-002-dual-persistence.md
workflowType: 'prd'
classification:
  projectType: SaaS B2B — Backend API + Real-time Platform
  domain: Sales Enablement / Business Communication
  complexity: alta
  projectContext: brownfield
  scope: [intereses-visitante, integracion-leadcars]
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 4
---

# Product Requirements Document - guiders-backend

**Author:** Roger Puga
**Date:** 30/03/2026

## Executive Summary

**guiders-backend** es la capa de backend de guiders.es, una plataforma SaaS B2B de comunicación en tiempo real entre equipos comerciales y visitantes web. Este PRD documenta dos nuevas funcionalidades que completan el ciclo de valor del producto: la visualización de intereses inferidos del visitante en la consola comercial, y la integración con Leadcars para sincronización automática de leads capturados.

**Usuarios objetivo:**

- **Comerciales** — equipos de ventas que gestionan conversaciones con visitantes en tiempo real desde la consola
- **Empresas cliente** — integran guiders via SDK; sus comerciales usan Leadcars como CRM principal

**Problema que resuelven:**

- Sin los intereses del visitante, el comercial inicia el contacto a ciegas — sabe que alguien lleva 5 minutos en la web, pero no qué le interesa.
- Sin la integración Leadcars, el comercial registra el lead en guiders y luego lo vuelve a introducir manualmente en el CRM — doble trabajo, riesgo de error, pérdida de tiempo.

### What Makes This Special

guiders convierte comportamiento anónimo en contexto accionable en el momento exacto de la conversación. El comercial no solo ve quién está online — ve qué páginas de producto visitó, qué buscó, cuánto tiempo invirtió en cada sección. Eso transforma la apertura del chat de un contacto en frío a una conversación con contexto real.

La integración Leadcars cierra el ciclo: el momento en que el comercial registra los datos personales del visitante (nombre, email, teléfono), ese lead se crea automáticamente en el CRM del cliente sin ninguna acción adicional. guiders se convierte en el punto de captura que alimenta el flujo de ventas existente.

**Insight central:** guiders no es un chat — es el puente entre intención anónima y lead cualificado listo para el CRM del cliente.

## Project Classification

| Campo                   | Valor                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **Tipo de proyecto**    | SaaS B2B — Backend API + Real-time Platform (brownfield)           |
| **Dominio**             | Sales Enablement / Business Communication                          |
| **Complejidad**         | Alta — DDD/CQRS, multi-tenant, WebSocket, MongoDB + PostgreSQL     |
| **Contexto**            | Proyecto existente en producción; estas son features incrementales |
| **Alcance de este PRD** | Epic 2 (intereses del visitante) + Epic 5 (integración Leadcars)   |

## Success Criteria

### User Success

**Intereses del visitante:**

- El comercial ve las **top 5 páginas más visitadas** del visitante en el panel de actividad antes de abrir el chat — sin pasos adicionales
- El primer mensaje del comercial puede hacer referencia a algo concreto que vio el visitante (contexto real, no genérico)

**Leadcars:**

- El comercial registra nombre, email y teléfono del visitante en guiders y el lead aparece en Leadcars **en menos de 5 segundos**, sin ninguna acción adicional
- Si Leadcars no está disponible, guiders **no se bloquea** — el lead se registra igualmente en guiders

### Business Success

- Reducción del tiempo hasta primer mensaje relevante del comercial (baseline: contacto en frío)
- Cero leads capturados en guiders que no lleguen a Leadcars (fiabilidad ≥ 99%)
- Adopción: el 80% de los comerciales activos usan la info de intereses en el primer mes

### Technical Success

- `GET /visitor-activity` no supera **+100ms de latencia** al incluir top páginas
- Sync a Leadcars es **no bloqueante** — timeout máximo 3s, retry automático 1 vez
- Fiabilidad de entrega a Leadcars ≥ 99% (con retry en fallo transitorio)

### Measurable Outcomes

| Métrica                              | Target MVP  | Cómo medir                     |
| ------------------------------------ | ----------- | ------------------------------ |
| Latencia get-visitor-activity        | ≤ 200ms p95 | APM / logs                     |
| Leads sincronizados a Leadcars       | ≥ 99%       | Log de intentos vs éxitos      |
| Tiempo de sync a Leadcars            | ≤ 5s        | Timestamp en evento            |
| Visitantes con intereses detectables | ≥ 60%       | % con ≥1 PAGE_VIEW en metadata |

## Product Scope

### MVP — Minimum Viable Product

**Intereses del visitante:**

- Agregación MongoDB de eventos `PAGE_VIEW` por URL para cada visitante → top 5 páginas con conteo de visitas
- Campo `topPages: {url: string, visits: number}[]` añadido a `GetVisitorActivityResponseDto`
- Sin nuevo endpoint — se amplía el existente `get-visitor-activity`
- Nuevo método `getTopPagesByVisitor` en `TrackingEventRepository`

**Leadcars:**

- Nuevo command `RegisterVisitorLeadCommand` — el comercial registra nombre, email y teléfono del visitante anónimo
- Transición automática de lifecycle a `LEAD` al registrar datos personales
- Event handler `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler` — sync asíncrono (fire-and-forget con 1 retry)
- Config: API key de Leadcars por empresa (en `company` context)
- Nuevo contexto `leadcars` en infrastructure (cliente HTTP)

### Growth Features (Post-MVP)

- Categorización temática de URLs en intereses (requiere config de categorías por empresa)
- Ponderación de intereses por tiempo invertido en página, no solo conteo de visitas
- Dashboard de estado de sync Leadcars (leads enviados, fallidos, pendientes)
- Webhook bidireccional: Leadcars → guiders para actualizar estado del lead

### Vision (Future)

- Intereses inferidos por IA sobre el contenido de las páginas visitadas (sin config manual)
- Sync bidireccional completo: transcript de conversación, lead score, historial de sesiones
- Integración con otros CRMs (HubSpot, Salesforce) usando el mismo patrón de Leadcars

## User Journeys

### Journey 1 — El comercial que convierte un cold contact en conversación con contexto

**Persona:** Carlos, comercial de un concesionario que usa guiders en su web corporativa. Cada mañana abre la consola y ve la lista de visitantes online. Antes, todos eran un punto en el mapa — sabía que alguien estaba en la web, pero no por qué.

**Escena inicial:** Son las 10:15. Carlos ve en la consola que un visitante lleva 8 minutos online con lead score "hot". Antes, habría enviado el mensaje genérico de siempre: _"Hola, ¿te puedo ayudar en algo?"_

**Acción:** Carlos abre el panel de actividad del visitante. Ve:

```
Top páginas visitadas:
  1. /gama/suv/kuga  (4 visitas)
  2. /financiacion   (2 visitas)
  3. /gama/suv/puma  (1 visita)
```

**Momento de valor:** Carlos abre el chat con: _"Hola, veo que llevas un rato mirando el Kuga. ¿Te interesa más el diésel o estás pensando en financiación?"_ El visitante responde en 10 segundos.

**Nueva realidad:** El ratio de respuesta de Carlos en el primer mes sube del 22% al 41%. Deja de tener miedo al primer mensaje.

**Requisitos revelados:** `GetVisitorActivityResponseDto` con `topPages`, UI del panel de actividad con sección de intereses.

---

### Journey 2 — El comercial que cierra un lead sin doble entrada de datos

**Persona:** Carlos, mismo comercial. Tras la conversación del chat, el visitante (ahora identificado como Juan García) acepta que le llamen. Carlos tiene su nombre, email y teléfono.

**Escena inicial:** Carlos abre el formulario de registro de lead en guiders. Antes tenía que luego abrir Leadcars y volver a escribir todo a mano — y a veces se olvidaba.

**Acción:** Carlos rellena en guiders: nombre "Juan García", email "juan@gmail.com", teléfono "612345678" y pulsa "Registrar lead".

**Momento de valor:** En menos de 5 segundos, Juan aparece en el CRM de Leadcars con todos sus datos y el historial de la sesión. El jefe de ventas puede asignar el seguimiento desde Leadcars sin esperar a que Carlos lo pase manualmente.

**Nueva realidad:** Cero leads perdidos por olvidar pasarlos al CRM. El pipeline de Leadcars refleja la realidad en tiempo real.

**Requisitos revelados:** Endpoint `POST /visitors/:id/register-lead`, `RegisterVisitorLeadCommand`, `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler`, cliente HTTP Leadcars.

---

### Journey 3 — Leadcars no responde: guiders no cae

**Persona:** Carlos, mismo comercial. Son las 17:45 y la API de Leadcars tiene una caída temporal.

**Escena inicial:** Carlos registra el lead de María López como siempre. Pulsa "Registrar lead".

**Acción:** El backend intenta el sync a Leadcars → timeout a los 3s → reintento automático → segundo fallo → guiders registra el lead internamente y marca el sync como "pendiente".

**Momento de valor:** Carlos recibe la confirmación inmediata: _"Lead registrado. La sincronización con Leadcars está pendiente y se reintentará automáticamente."_ Su flujo de trabajo no se interrumpe.

**Nueva realidad:** Cuando Leadcars vuelve (15 minutos después), el lead de María aparece. Sin datos perdidos, sin que Carlos tenga que hacer nada.

**Requisitos revelados:** Estado `sync_status` en el lead (`pending | synced | failed`), job de retry, log de intentos de sync, respuesta de la API con estado de sync explícito.

---

### Journey 4 — El administrador configura la integración Leadcars

**Persona:** Marta, administradora técnica de la empresa cliente. Es quien gestiona la configuración de guiders para su concesionario.

**Escena inicial:** La empresa acaba de contratar Leadcars. Marta tiene la API key de su cuenta de Leadcars y necesita conectarla con guiders.

**Acción:** Marta va al panel de administración → Integraciones → Leadcars. Introduce la API key, pulsa "Verificar conexión". El sistema hace una llamada de prueba a la API de Leadcars y confirma que la conexión es válida.

**Momento de valor:** Desde ese momento, todos los leads que registren los comerciales de su empresa se sincronizan automáticamente con su cuenta de Leadcars. Sin más configuración.

**Requisitos revelados:** Campo `leadcarsApiKey` en `company` context, endpoint de verificación de conexión, scope de API key por tenant (un tenant = una API key de Leadcars).

---

### Journey Requirements Summary

| Journey                       | Capacidades requeridas                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| J1 — Intereses en consola     | Agregación top páginas, campo `topPages` en DTO, UI panel actividad                     |
| J2 — Registro lead → Leadcars | `RegisterVisitorLeadCommand`, lifecycle LEAD, cliente HTTP Leadcars, event handler sync |
| J3 — Fallo de sync            | Estado `sync_status`, retry job, log de intentos, respuesta API con estado              |
| J4 — Config admin Leadcars    | `leadcarsApiKey` en company, endpoint verificación, scope por tenant                    |
