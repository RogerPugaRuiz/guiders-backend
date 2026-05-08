---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - _bmad-output/planning-artifacts/adr-003-global-search.md
  - _bmad-output/planning-artifacts/architecture.md
  - AGENTS.md
---

# Guiders Backend — Buscador Global (Epic Breakdown)

## Overview

Este documento desglosa los requisitos del ADR-003 (Buscador Global con Role-Scoped Registry) en epics y stories implementables. El buscador centralizado permite a usuarios de distintos roles (`admin`, `supervisor`, `commercial`) buscar entidades relevantes a través de un único endpoint `GET /search`, con autorización de scope resuelta en el backend.

---

## Requirements Inventory

### Functional Requirements

FR1: El sistema debe exponer un endpoint `GET /search?q=<término>` que devuelva resultados de búsqueda según el rol del JWT del usuario autenticado.

FR2: El endpoint debe aceptar un parámetro `q` obligatorio con mínimo 2 caracteres. Requests con `q` ausente o < 2 caracteres deben retornar 400.

FR3: El sistema debe filtrar los providers de búsqueda según el rol del usuario autenticado antes de ejecutar las queries. Nunca se ejecutan providers fuera del scope del rol.

FR4: El rol `admin` debe poder buscar en: chats, visitantes, leads, empresas y usuarios (todas las entidades).

FR5: El rol `supervisor` debe poder buscar en: chats, visitantes y leads de su equipo (filtrado por `agentId` de los miembros del equipo).

FR6: El rol `commercial` debe poder buscar en: chats, visitantes y leads — únicamente los asignados a él (filtro estricto por `agentId`).

FR7: Cada provider de búsqueda debe declarar su propio `scope: SearchScope[]` — los roles que pueden utilizarlo. El handler filtra por este campo.

FR8: Cada provider debe devolver máximo 5 resultados. El endpoint devuelve máximo 25 resultados en total (5 providers × 5 resultados).

FR9: Cada resultado debe incluir: `scope`, `id`, `title`, `subtitle` (nullable) y `url` de navegación.

FR10: Cada provider debe capturar sus propios errores y devolver `[]` en caso de fallo — nunca propagar la excepción al handler para no afectar los demás providers.

FR11: El contexto `conversations-v2` debe implementar `ChatSearchProvider` que busca en chats por `visitorName`, `agentName` y `title`.

FR12: El contexto `visitors-v2` debe implementar `VisitorSearchProvider` que busca en visitantes por nombre, email u otros campos identificativos.

FR13: El contexto `leads` debe implementar `LeadSearchProvider` que busca en leads por nombre, email u otros campos identificativos.

FR14: El contexto `company` debe implementar `CompanySearchProvider` que busca en empresas y usuarios — solo para el rol `admin`.

FR15: Los schemas de MongoDB buscables deben tener índices `$text` compuestos con pesos por campo (title > nombre > otros). No se debe usar `$regex` sin índice.

FR16: La tabla `companies` en PostgreSQL debe tener extensión `pg_trgm` habilitada e índice GIN en el campo `name` para soportar `ILIKE` eficientemente.

FR17: Añadir `SearchModule` al `AppModule` importando todos los módulos de dominio que exponen providers.

### NonFunctional Requirements

NFR1: Latencia p95 del endpoint `GET /search` debe ser < 200ms bajo carga normal.

NFR2: El endpoint debe ser tolerante a fallos parciales: si un provider falla, los resultados de los demás providers deben retornarse igualmente.

NFR3: El scope de búsqueda se resuelve exclusivamente en el backend — el frontend nunca debe pasar el scope ni recibir datos fuera de su rol.

NFR4: El contrato del endpoint (`GET /search`, formato de respuesta) debe ser estable ante cambios de backend de búsqueda (migración a Typesense, Elasticsearch, etc.).

NFR5: La architecture de `SearchProvider` como puerto hexagonal debe permitir sustituir el adaptador de búsqueda de cada contexto cambiando una línea en `SearchModule` — sin tocar el handler ni el endpoint.

NFR6: El código debe seguir los patrones DDD/CQRS del proyecto: `SearchProvider` en infraestructura, `SearchResult` como Value Object en dominio, `GlobalSearchQueryHandler` como `@QueryHandler`.

NFR7: Todos los providers deben tener tests unitarios con casos: búsqueda con resultados, sin resultados, y con error (debe devolver `[]`).

NFR8: El handler `GlobalSearchQueryHandler` debe tener tests unitarios que verifiquen: filtrado por rol, ejecución en paralelo, y merge correcto de resultados.

### Additional Requirements (Architecture)

- **Proyecto brownfield**: todos los cambios deben integrarse sin romper los módulos existentes (`ConversationsV2Module`, `VisitorsV2Module`, `LeadsModule`, `CompanyModule`).
- **Contrato de shared**: `SearchProvider` interface, `SearchScope` enum y `SearchResult` VO viven en `src/context/shared/domain/search/` — ningún otro contexto debe definir estos tipos.
- **Dirección de dependencias**: `shared` ← cualquier contexto; `search` no importa contextos directamente — recibe providers por DI.
- **Pattern Result**: los repositorios internos usan `Result<T, E>` pero los providers exponen `Promise<SearchResult[]>` (nunca `Result`) — la interfaz de búsqueda es simple y no propaga errores de dominio.
- **Índices MongoDB obligatorios desde v1**: cada schema buscable debe tener `@index` de tipo `text` antes del primer despliegue en producción.
- **`pg_trgm` en PostgreSQL**: habilitar extensión y crear índice GIN en `companies.name` mediante migración TypeORM.
- **Exportar providers**: cada módulo de dominio debe exportar su SearchProvider para que `SearchModule` pueda inyectarlo.

### UX Design Requirements

N/A — esta feature es backend puro. No hay requisitos de UX.

### FR Coverage Map

| FR | Epic | Story |
|---|---|---|
| FR1, FR2, FR3, FR7, FR8, FR9 | Epic 1 | 1.2, 1.3 |
| FR10, NFR2 | Epic 1 | 1.2 |
| FR4, FR5, FR6 | Epic 1 | 1.3 |
| FR11 | Epic 2 | 2.1 |
| FR12 | Epic 2 | 2.2 |
| FR13 | Epic 2 | 2.3 |
| FR14 | Epic 2 | 2.4 |
| FR15, FR16 | Epic 2 | 2.1, 2.2, 2.3, 2.4 |
| FR17 | Epic 3 | 3.1 |
| NFR1, NFR3, NFR4, NFR5 | Epic 1 | 1.1, 1.2, 1.3 |
| NFR6, NFR7, NFR8 | Todos | Todas |

---

## Epic List

- **Epic 1**: Infraestructura base del buscador — contrato compartido, handler orquestador y endpoint HTTP
- **Epic 2**: Providers de búsqueda por contexto — implementación en conversations-v2, visitors-v2, leads y company
- **Epic 3**: Integración, registro en AppModule y validación end-to-end

---

## Epic 1: Infraestructura base del buscador

Establecer el contrato compartido (`SearchProvider`, `SearchScope`, `SearchResult`) en `shared/domain/search/`, crear el contexto orquestador `src/context/search/` con `GlobalSearchQueryHandler` y `SearchController`, e implementar el endpoint `GET /search` con autorización por rol.

### Story 1.1: Contrato compartido de búsqueda en shared/domain

Como desarrollador,
quiero que el contrato de búsqueda (`SearchProvider` interface, `SearchScope` enum, `SearchResult` VO, `SearchQuery` interface y `SEARCH_PROVIDER` token) viva en `src/context/shared/domain/search/`,
para que cualquier contexto de dominio pueda implementar `SearchProvider` sin crear dependencias cíclicas.

**Acceptance Criteria:**

**Dado** que no existe `src/context/shared/domain/search/`
**Cuando** se crea la carpeta con los archivos del contrato
**Entonces** deben existir exactamente estos archivos:
- `src/context/shared/domain/search/search-provider.interface.ts` — exporta `SearchProvider`, `SearchQuery`, `SEARCH_PROVIDER`
- `src/context/shared/domain/search/search-scope.enum.ts` — exporta `SearchScope` con valores: `chats`, `visitors`, `leads`, `companies`, `users`
- `src/context/shared/domain/search/search-result.vo.ts` — exporta `SearchResult` con campos: `scope`, `id`, `title`, `subtitle` (nullable), `url`
- `src/context/shared/domain/search/index.ts` — barrel que exporta todo lo anterior

**Dado** que se importa `SearchProvider` desde `shared/domain/search`
**Cuando** se compila el proyecto con `tsc --noEmit`
**Entonces** no debe haber errores de compilación

**Dado** que `SearchQuery` incluye `agentId?: string`
**Cuando** el `userRole` es `commercial` o `supervisor`
**Entonces** `agentId` debe estar presente en la query — la validación ocurre en el handler, no en el tipo

**Dado** que `SearchResult` es un Value Object
**Cuando** se instancia con `scope`, `id`, `title`, `subtitle` y `url`
**Entonces** todos los campos deben ser `readonly` — no mutables

---

### Story 1.2: GlobalSearchQueryHandler y contexto search/

Como desarrollador,
quiero crear el contexto `src/context/search/` con el `GlobalSearchQueryHandler` que orqueste los providers,
para que la lógica de fan-out y filtrado por rol esté centralizada y desacoplada de los providers concretos.

**Acceptance Criteria:**

**Dado** que se crea el contexto `search/`
**Cuando** se revisa la estructura de archivos
**Entonces** deben existir:
- `src/context/search/application/queries/global-search/global-search.query.ts`
- `src/context/search/application/queries/global-search/global-search.query-handler.ts`
- `src/context/search/application/queries/global-search/role-scopes.ts`
- `src/context/search/search.module.ts`

**Dado** que el handler recibe una query con `userRole: 'commercial'`
**Cuando** se ejecuta `GlobalSearchQueryHandler.execute()`
**Entonces** solo deben ejecutarse los providers cuyo `scope` incluya algún valor de `ROLE_SCOPES['commercial']` (`chats`, `visitors`, `leads`)
**Y** `CompanySearchProvider` (scope: `companies`, `users`) no debe ejecutarse

**Dado** que el handler ejecuta múltiples providers
**Cuando** todos responden con resultados
**Entonces** los resultados deben ejecutarse en paralelo con `Promise.all`
**Y** los arrays de resultados deben concatenarse con `.flat()`

**Dado** que un provider lanza una excepción
**Cuando** se ejecuta el `Promise.all`
**Entonces** la excepción debe ser capturada por el propio provider (ver FR10) — el handler nunca maneja errores individuales de provider
**Y** los resultados de los providers exitosos deben retornarse igualmente

**Dado** que existe `role-scopes.ts`
**Cuando** se define `ROLE_SCOPES`
**Entonces** debe ser un `Record<UserRole, SearchScope[]>` con:
- `admin`: todos los scopes (`chats`, `visitors`, `leads`, `companies`, `users`)
- `supervisor`: `chats`, `visitors`, `leads`
- `commercial`: `chats`, `visitors`, `leads`
- `visitor`: array vacío `[]`

**Dado** que se ejecutan los tests unitarios del handler
**Cuando** se corre `npm run test:unit -- global-search.query-handler.spec.ts`
**Entonces** deben pasar los siguientes casos:
- Filtra providers por rol correctamente
- Ejecuta providers en paralelo
- Retorna array vacío si no hay providers para el rol
- Retorna resultados combinados de múltiples providers
- No propaga error si un provider falla (el provider devuelve `[]`)

---

### Story 1.3: SearchController — endpoint GET /search

Como usuario autenticado (admin, supervisor o commercial),
quiero llamar a `GET /search?q=<término>` con mi JWT,
para obtener resultados de búsqueda relevantes a mi rol sin necesitar conocer qué entidades puedo ver.

**Acceptance Criteria:**

**Dado** que el usuario envía `GET /search?q=garcia` con JWT válido
**Cuando** el servidor procesa la request
**Entonces** debe retornar HTTP 200 con:
```json
{
  "results": [
    {
      "scope": "chats",
      "id": "<uuid>",
      "title": "<string>",
      "subtitle": "<string | null>",
      "url": "<string>"
    }
  ]
}
```

**Dado** que el usuario envía `GET /search?q=g` (menos de 2 caracteres)
**Cuando** el servidor valida la request
**Entonces** debe retornar HTTP 400 con mensaje de validación

**Dado** que el usuario envía `GET /search` sin parámetro `q`
**Cuando** el servidor valida la request
**Entonces** debe retornar HTTP 400 con mensaje de validación

**Dado** que el JWT no está presente o es inválido
**Cuando** el servidor recibe la request
**Entonces** debe retornar HTTP 401

**Dado** que el usuario tiene rol `visitor`
**Cuando** llama al endpoint con JWT válido
**Entonces** debe retornar HTTP 403 (el rol `visitor` no tiene scope de búsqueda)

**Dado** que el rol del usuario es `commercial`
**Cuando** el handler ejecuta la búsqueda
**Entonces** el `agentId` del JWT debe pasarse a la query — los providers lo usarán para filtrar entidades propias

**Dado** que el controller está documentado con Swagger
**Cuando** se genera la spec OpenAPI
**Entonces** el endpoint debe aparecer con:
- Tag: `Search`
- Descripción del parámetro `q`
- Respuestas documentadas: 200, 400, 401, 403

---

## Epic 2: Providers de búsqueda por contexto

Implementar los cuatro `SearchProvider` concretos en sus respectivos contextos de dominio, con los índices de base de datos correctos y los filtros de scope por rol.

### Story 2.1: ChatSearchProvider en conversations-v2

Como sistema de búsqueda,
quiero que `conversations-v2` implemente `ChatSearchProvider`,
para que los usuarios puedan encontrar chats por nombre del visitante, nombre del agente o título del chat.

**Acceptance Criteria:**

**Dado** que se crea `ChatSearchProvider`
**Cuando** se revisa su ubicación
**Entonces** debe estar en `src/context/conversations-v2/infrastructure/search/chat-search.provider.ts`

**Dado** que `ChatSearchProvider` implementa `SearchProvider`
**Cuando** se revisa su `scope`
**Entonces** debe ser `[SearchScope.CHATS]`

**Dado** que el `userRole` es `admin`
**Cuando** se ejecuta `search({ term: 'garcia', companyId, userRole: 'admin' })`
**Entonces** debe buscar en todos los chats del `companyId` usando `$text` sobre campos `visitorName`, `agentName`, `title`
**Y** retornar máximo 5 resultados

**Dado** que el `userRole` es `commercial` o `supervisor`
**Cuando** se ejecuta `search({ term: 'garcia', companyId, userRole: 'commercial', agentId })`
**Entonces** el filtro MongoDB debe incluir `agentId: query.agentId`
**Y** no deben retornarse chats de otros agentes

**Dado** que el schema `ChatMongoEntity` (o equivalente) no tiene índice `$text`
**Cuando** se implementa el provider
**Entonces** debe añadirse el índice:
```typescript
@index(
  { title: 'text', visitorName: 'text', agentName: 'text' },
  { weights: { title: 10, visitorName: 5, agentName: 3 } }
)
```

**Dado** que la búsqueda MongoDB falla (timeout, error de conexión)
**Cuando** se ejecuta `search()`
**Entonces** el provider debe capturar el error, hacer log de él y retornar `[]`
**Y** no debe propagar la excepción

**Dado** que `ConversationsV2Module` exporta `ChatSearchProvider`
**Cuando** `SearchModule` lo importa
**Entonces** la inyección debe funcionar sin errores de DI

**Dado** que se corren los tests unitarios
**Cuando** se ejecuta `npm run test:unit -- chat-search.provider.spec.ts`
**Entonces** deben pasar: búsqueda con resultados, sin resultados, con filtro de agente, y error devuelve `[]`

---

### Story 2.2: VisitorSearchProvider en visitors-v2

Como sistema de búsqueda,
quiero que `visitors-v2` implemente `VisitorSearchProvider`,
para que los usuarios puedan encontrar visitantes por nombre, email u otros campos identificativos.

**Acceptance Criteria:**

**Dado** que se crea `VisitorSearchProvider`
**Cuando** se revisa su ubicación
**Entonces** debe estar en `src/context/visitors-v2/infrastructure/search/visitor-search.provider.ts`

**Dado** que `VisitorSearchProvider` implementa `SearchProvider`
**Cuando** se revisa su `scope`
**Entonces** debe ser `[SearchScope.VISITORS]`

**Dado** que el `userRole` es `admin`
**Cuando** se ejecuta `search({ term: 'juan', companyId, userRole: 'admin' })`
**Entonces** debe buscar en todos los visitantes del `companyId` usando `$text`
**Y** retornar máximo 5 resultados

**Dado** que el `userRole` es `commercial` o `supervisor`
**Cuando** se ejecuta `search()` con `agentId`
**Entonces** el filtro debe incluir `assignedAgentId: query.agentId`

**Dado** que el schema de visitante en MongoDB no tiene índice `$text`
**Cuando** se implementa el provider
**Entonces** debe añadirse el índice `$text` sobre los campos identificativos del visitante (nombre, email o equivalentes según el schema actual)

**Dado** que la búsqueda falla
**Cuando** se ejecuta `search()`
**Entonces** debe capturar el error y retornar `[]`

**Dado** que `VisitorsV2Module` exporta `VisitorSearchProvider`
**Cuando** `SearchModule` lo importa
**Entonces** la inyección debe funcionar sin errores de DI

**Dado** que se corren los tests unitarios
**Cuando** se ejecuta `npm run test:unit -- visitor-search.provider.spec.ts`
**Entonces** deben pasar los casos equivalentes a Story 2.1

---

### Story 2.3: LeadSearchProvider en leads

Como sistema de búsqueda,
quiero que `leads` implemente `LeadSearchProvider`,
para que los usuarios puedan encontrar leads por nombre, email u otros campos identificativos.

**Acceptance Criteria:**

**Dado** que se crea `LeadSearchProvider`
**Cuando** se revisa su ubicación
**Entonces** debe estar en `src/context/leads/infrastructure/search/lead-search.provider.ts`

**Dado** que `LeadSearchProvider` implementa `SearchProvider`
**Cuando** se revisa su `scope`
**Entonces** debe ser `[SearchScope.LEADS]`

**Dado** que el `userRole` es `admin`
**Cuando** se ejecuta `search({ term: 'maria', companyId, userRole: 'admin' })`
**Entonces** debe buscar en todos los leads del `companyId`
**Y** retornar máximo 5 resultados

**Dado** que el `userRole` es `commercial` o `supervisor`
**Cuando** se ejecuta `search()` con `agentId`
**Entonces** el filtro debe incluir `agentId: query.agentId`

**Dado** que el schema de lead (MongoDB o TypeORM según contexto) no tiene índice de texto
**Cuando** se implementa el provider
**Entonces** debe añadirse el índice correspondiente sobre campos identificativos del lead

**Dado** que la búsqueda falla
**Cuando** se ejecuta `search()`
**Entonces** debe capturar el error y retornar `[]`

**Dado** que `LeadsModule` exporta `LeadSearchProvider`
**Cuando** `SearchModule` lo importa
**Entonces** la inyección debe funcionar sin errores de DI

**Dado** que se corren los tests unitarios
**Cuando** se ejecuta `npm run test:unit -- lead-search.provider.spec.ts`
**Entonces** deben pasar los casos equivalentes a Story 2.1

---

### Story 2.4: CompanySearchProvider en company (solo admin)

Como administrador,
quiero poder buscar empresas y usuarios a través del buscador global,
para encontrar rápidamente cualquier tenant o usuario del sistema.

**Acceptance Criteria:**

**Dado** que se crea `CompanySearchProvider`
**Cuando** se revisa su ubicación
**Entonces** debe estar en `src/context/company/infrastructure/search/company-search.provider.ts`

**Dado** que `CompanySearchProvider` implementa `SearchProvider`
**Cuando** se revisa su `scope`
**Entonces** debe ser `[SearchScope.COMPANIES, SearchScope.USERS]`

**Dado** que el handler filtra providers por rol
**Cuando** el `userRole` es `commercial` o `supervisor`
**Entonces** `CompanySearchProvider` no debe ejecutarse — su `scope` no intersecta con `ROLE_SCOPES['commercial']`

**Dado** que el `userRole` es `admin`
**Cuando** se ejecuta `search({ term: 'acme', companyId, userRole: 'admin' })`
**Entonces** debe buscar en empresas (PostgreSQL) usando `ILIKE` con `pg_trgm`
**Y** retornar máximo 5 resultados con `scope: 'companies'`

**Dado** que la tabla `companies` en PostgreSQL no tiene la extensión `pg_trgm` ni índice GIN
**Cuando** se implementa el provider
**Entonces** debe crearse una migración TypeORM que:
1. Ejecute `CREATE EXTENSION IF NOT EXISTS pg_trgm`
2. Cree índice `CREATE INDEX idx_companies_name_trgm ON companies USING GIN (name gin_trgm_ops)`

**Dado** que la búsqueda PostgreSQL falla
**Cuando** se ejecuta `search()`
**Entonces** debe capturar el error y retornar `[]`

**Dado** que `CompanyModule` exporta `CompanySearchProvider`
**Cuando** `SearchModule` lo importa
**Entonces** la inyección debe funcionar sin errores de DI

**Dado** que se corren los tests unitarios
**Cuando** se ejecuta `npm run test:unit -- company-search.provider.spec.ts`
**Entonces** deben pasar: búsqueda admin con resultados, sin resultados, y error devuelve `[]`

---

## Epic 3: Integración, registro en AppModule y validación

Conectar todos los componentes en `SearchModule`, registrarlo en `AppModule`, y validar el comportamiento end-to-end con tests de integración.

### Story 3.1: SearchModule y registro en AppModule

Como desarrollador,
quiero que `SearchModule` ensamble todos los providers y esté registrado en `AppModule`,
para que el endpoint `GET /search` funcione en el entorno de desarrollo y producción.

**Acceptance Criteria:**

**Dado** que se crea `SearchModule`
**Cuando** se revisa su contenido
**Entonces** debe:
- Importar `CqrsModule`, `ConversationsV2Module`, `VisitorsV2Module`, `LeadsModule`, `CompanyModule`
- Registrar `GlobalSearchQueryHandler` como provider
- Registrar `SEARCH_PROVIDER` con `useFactory` que agrupa todos los providers en un array
- Declarar `SearchController` en `controllers`

**Dado** que `AppModule` importa `SearchModule`
**Cuando** se arranca la aplicación con `npm run start:dev`
**Entonces** no deben aparecer errores de DI (`Cannot inject`, `circular dependency`, etc.)
**Y** el endpoint `GET /search` debe responder (puede devolver `[]` si no hay datos)

**Dado** que se ejecuta `tsc --noEmit` tras todos los cambios
**Cuando** se revisa la salida
**Entonces** no debe haber errores de TypeScript

**Dado** que se ejecuta `npm run lint`
**Cuando** se revisa la salida
**Entonces** no debe haber errores de ESLint

---

### Story 3.2: Test de integración del endpoint GET /search

Como equipo de desarrollo,
quiero tener tests de integración que validen el comportamiento completo del endpoint `GET /search`,
para garantizar que la autorización por rol, el filtrado de providers y el formato de respuesta son correctos.

**Acceptance Criteria:**

**Dado** que existe un usuario `admin` autenticado
**Cuando** llama a `GET /search?q=test`
**Entonces** el test debe verificar que la respuesta es HTTP 200 con array `results`
**Y** que los resultados pueden incluir cualquier scope (`chats`, `visitors`, `leads`, `companies`, `users`)

**Dado** que existe un usuario `commercial` autenticado con `agentId` definido
**Cuando** llama a `GET /search?q=test`
**Entonces** el test debe verificar que la respuesta es HTTP 200
**Y** que los resultados nunca incluyen scopes `companies` o `users`

**Dado** que se llama a `GET /search?q=x` (1 carácter)
**Cuando** el servidor valida la request
**Entonces** el test debe verificar HTTP 400

**Dado** que se llama a `GET /search` sin JWT
**Cuando** el servidor valida la autenticación
**Entonces** el test debe verificar HTTP 401

**Dado** que se corren los tests de integración
**Cuando** se ejecuta `npm run test:int`
**Entonces** todos los casos del endpoint `GET /search` deben pasar
