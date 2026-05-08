# ADR-003 — Buscador Global con Role-Scoped Registry

**Fecha:** 08/05/2026
**Estado:** Aceptado
**Contexto:** Arquitectura del buscador centralizado de guiders-backend

---

## Contexto

Guiders tiene dos aplicaciones cliente con usuarios de distintos roles:

- **web-console** — usada por comerciales (`commercial`) y supervisores (`supervisor`)
- **web-admin** — usada por administradores (`admin`)

Cada rol necesita buscar entidades diferentes. El frontend no debe recibir datos que no correspondan a su rol. Se necesita un único endpoint `GET /search?q=` que el backend resuelva de forma inteligente según el JWT del usuario autenticado.

Adicionalmente:

- Añadir nuevas fuentes de búsqueda no debe requerir modificar el handler central
- La query de búsqueda inicial es `$regex` / `ILIKE` — si el volumen justifica Elasticsearch en el futuro, el contrato del endpoint no cambia
- El `commercial` solo puede ver entidades asignadas a él (filtro por `agentId`), no las de otros comerciales

---

## Decisión

Implementar un **Role-Scoped Registry** con el patrón `SearchProvider`.

### Principio central

> El backend agrega los resultados de búsqueda. El frontend hace una sola llamada. La autorización de scope se resuelve en el backend, nunca en el cliente.

### Componentes

#### 1. Contrato en `shared/domain/search/`

La interface `SearchProvider` y los tipos asociados viven en `shared/domain/search/` porque son abstracciones puras sin dependencias de infraestructura. Cualquier contexto puede importarlos sin crear dependencias cíclicas.

**Regla de dependencias:**
```
shared  ←  conversations-v2, leads, visitors-v2, company (implementan SearchProvider)
search  ←  usa shared (contrato) + recibe providers por DI (nunca importa contextos directamente)
```

#### 2. Contexto orquestador `src/context/search/`

Nuevo contexto DDD dedicado con `GlobalSearchQueryHandler` y `SearchController`. La búsqueda global es una capacidad transversal con identidad propia: tiene su contrato de API, su lógica de autorización y su modelo de respuesta.

**Por qué NO en `shared/`:** `shared/` no debe importar de ningún contexto de dominio. El handler conoce `SearchScope.CHATS`, `SearchScope.LEADS` — eso es lógica de producto, no utilidad genérica.

**Por qué NO distribuido:** el orquestador (`GlobalSearchQueryHandler`) tiene que vivir en algún sitio. N endpoints de búsqueda violarían el acuerdo de un solo `GET /search`.

#### 3. Providers implementados en cada contexto

Cada contexto de dominio implementa `SearchProvider` en su capa de infraestructura. El provider declara `scope: SearchScope[]` — qué roles pueden usarlo. El handler filtra por `userRole` antes del `Promise.all`.

---

## Tabla de permisos por rol

| Entidad     | `admin` | `supervisor` | `commercial`        |
|-------------|---------|--------------|---------------------|
| Chats       | ✅ todos | ✅ de su equipo | ✅ solo los suyos (`agentId`) |
| Visitantes  | ✅ todos | ✅ de su equipo | ✅ solo los suyos   |
| Leads       | ✅ todos | ✅ de su equipo | ✅ solo los suyos   |
| Empresas    | ✅ todos | ❌           | ❌                  |
| Usuarios    | ✅ todos | ❌           | ❌                  |

---

## Estructura de archivos

```
src/context/
├── shared/
│   └── domain/
│       └── search/
│           ├── search-provider.interface.ts     ← interface + SEARCH_PROVIDER token
│           ├── search-scope.enum.ts             ← SearchScope enum
│           └── search-result.vo.ts              ← Value Object resultado
│
├── search/                                      ← nuevo contexto orquestador
│   ├── application/
│   │   └── queries/
│   │       └── global-search/
│   │           ├── global-search.query.ts
│   │           ├── global-search.query-handler.ts
│   │           └── __tests__/
│   │               └── global-search.query-handler.spec.ts
│   ├── infrastructure/
│   │   └── controllers/
│   │       └── search.controller.ts             ← GET /search
│   └── search.module.ts
│
├── conversations-v2/
│   └── infrastructure/
│       └── search/
│           └── chat-search.provider.ts          ← scope: [CHATS]
│
├── visitors-v2/
│   └── infrastructure/
│       └── search/
│           └── visitor-search.provider.ts       ← scope: [VISITORS]
│
├── leads/
│   └── infrastructure/
│       └── search/
│           └── lead-search.provider.ts          ← scope: [LEADS]
│
└── company/
    └── infrastructure/
        └── search/
            └── company-search.provider.ts       ← scope: [COMPANIES, USERS] — admin only
```

---

## Contratos clave

### `SearchScope` enum

```typescript
// shared/domain/search/search-scope.enum.ts
export enum SearchScope {
  CHATS     = 'chats',
  VISITORS  = 'visitors',
  LEADS     = 'leads',
  COMPANIES = 'companies',
  USERS     = 'users',
}
```

### `SearchProvider` interface

```typescript
// shared/domain/search/search-provider.interface.ts
export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');

export interface SearchProvider {
  readonly scope: SearchScope[];
  search(query: SearchQuery): Promise<SearchResult[]>;
}

export interface SearchQuery {
  term: string;
  companyId: string;
  userRole: UserRole;
  agentId?: string;   // requerido si userRole === 'commercial' o 'supervisor'
}
```

### `SearchResult` Value Object

```typescript
// shared/domain/search/search-result.vo.ts
export class SearchResult {
  constructor(
    readonly scope: SearchScope,
    readonly id: string,
    readonly title: string,
    readonly subtitle: string | null,
    readonly url: string,
  ) {}
}
```

### `GlobalSearchQueryHandler`

```typescript
// search/application/queries/global-search/global-search.query-handler.ts
@QueryHandler(GlobalSearchQuery)
export class GlobalSearchQueryHandler implements IQueryHandler<GlobalSearchQuery> {
  constructor(
    @Inject(SEARCH_PROVIDER)
    private readonly providers: SearchProvider[],
  ) {}

  async execute(query: GlobalSearchQuery): Promise<SearchResult[]> {
    const scopesForRole = ROLE_SCOPES[query.userRole];
    const allowed = this.providers.filter(p =>
      p.scope.some(s => scopesForRole.includes(s)),
    );
    const results = await Promise.all(
      allowed.map(p => p.search({
        term: query.term,
        companyId: query.companyId,
        userRole: query.userRole,
        agentId: query.agentId,
      })),
    );
    return results.flat();
  }
}
```

### Mapa de scopes por rol

```typescript
// search/application/queries/global-search/role-scopes.ts
export const ROLE_SCOPES: Record<UserRole, SearchScope[]> = {
  admin:      [SearchScope.CHATS, SearchScope.VISITORS, SearchScope.LEADS, SearchScope.COMPANIES, SearchScope.USERS],
  supervisor: [SearchScope.CHATS, SearchScope.VISITORS, SearchScope.LEADS],
  commercial: [SearchScope.CHATS, SearchScope.VISITORS, SearchScope.LEADS],
  visitor:    [],
};
```

### Registro del módulo

```typescript
// search/search.module.ts
@Module({
  imports: [
    CqrsModule,
    ConversationsV2Module,
    VisitorsV2Module,
    LeadsModule,
    CompanyModule,
  ],
  providers: [
    GlobalSearchQueryHandler,
    {
      provide: SEARCH_PROVIDER,
      useFactory: (chat, visitor, lead, company) => [chat, visitor, lead, company],
      inject: [ChatSearchProvider, VisitorSearchProvider, LeadSearchProvider, CompanySearchProvider],
    },
  ],
  controllers: [SearchController],
})
export class SearchModule {}
```

Cada módulo de dominio exporta su provider:

```typescript
// Ejemplo: conversations-v2.module.ts
@Module({
  providers: [ChatSearchProvider, /* ... */],
  exports:   [ChatSearchProvider],
})
export class ConversationsV2Module {}
```

---

## Endpoint

```
GET /search?q=<término>
Authorization: Bearer <jwt>

Response 200:
{
  "results": [
    {
      "scope": "chats",
      "id": "uuid",
      "title": "Chat con Juan García",
      "subtitle": "Hace 2 horas",
      "url": "/console/chats/uuid"
    }
  ]
}
```

- `q` es obligatorio, mínimo 2 caracteres
- El rol se extrae del JWT — el cliente no pasa el scope
- Sin paginación en v1 — límite de 5 resultados por provider (25 máximo)

---

## Implementación de búsqueda — v1

Cada provider usa `$regex` (MongoDB) o `ILIKE` (PostgreSQL) sobre los campos más relevantes de su entidad.

**Filtros de scope por rol en cada provider:**

| Provider | Filtro adicional para `commercial`/`supervisor` |
|---|---|
| `ChatSearchProvider` | `agentId === query.agentId` |
| `VisitorSearchProvider` | `assignedAgentId === query.agentId` |
| `LeadSearchProvider` | `agentId === query.agentId` |
| `CompanySearchProvider` | solo responde a `admin` (declarado en `scope`) |

**Evolución futura:** Si se integra Elasticsearch o Typesense, solo cambia la implementación interna de cada provider. El contrato del endpoint y la interface `SearchProvider` no cambian.

---

## Consecuencias

**Positivas:**
- Añadir nueva fuente de búsqueda = nuevo provider + exportarlo en su módulo. El handler no se toca.
- El scope está declarado en el provider — fácil de auditar y testear de forma aislada.
- El frontend hace una sola llamada — nunca recibe datos de roles ajenos.
- El contrato del endpoint es estable ante cambios de backend de búsqueda (Elasticsearch, etc.).

**Negativas / trade-offs:**
- `SearchModule` importa todos los módulos de dominio → si uno no está disponible, la búsqueda falla. Mitigación: cada provider debe gestionar sus propios errores y devolver `[]` en caso de fallo, nunca propagar.
- Un solo endpoint sin paginación puede devolver hasta 25 resultados en v1. Suficiente para el caso de uso de navegación rápida.

---

## Alternativas consideradas y descartadas

| Alternativa | Motivo de descarte |
|---|---|
| Federation en el frontend (N llamadas) | El frontend tendría que conocer qué entidades puede buscar cada rol — lógica de autorización en el cliente |
| Handler en `shared/` | `shared` no puede importar de contextos de dominio — viola la dirección de dependencias |
| Endpoints separados por app (console vs admin) | Duplicación de lógica; el rol del JWT ya determina el scope |
| Scope centralizado en un registry (no en el provider) | Requiere modificar el registry cada vez que se añade un provider — O(n) vs O(1) |

---

## Escalabilidad y evolución del backend de búsqueda

### v1 — `$regex` / `ILIKE` con índices nativos

El diseño v1 usa queries nativas de cada base de datos. **Es válido para volúmenes bajos-medios**, pero requiere índices correctos desde el inicio para no degradar a collection scan / seq scan.

**MongoDB — índices requeridos en cada provider:**

```typescript
// Ejemplo: ChatMongoEntity
// Índice de texto compuesto sobre los campos buscables
@Schema({ collection: 'chats' })
@index({ visitorName: 'text', agentName: 'text' })
export class ChatMongoEntity { ... }
```

Sin este índice, `$regex` hace *collection scan* completo — O(n). Con el índice, la query puede usar `$text` en lugar de `$regex`, lo que escala considerablemente mejor.

**PostgreSQL — extensión `pg_trgm`:**

```sql
-- Habilitar una vez por base de datos
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN por columna buscable
CREATE INDEX idx_companies_name_trgm ON companies USING GIN (name gin_trgm_ops);
```

Permite `ILIKE '%término%'` con rendimiento aceptable hasta ~500k filas.

### Umbrales orientativos

| Volumen por tenant | Estrategia recomendada | Cambio requerido |
|---|---|---|
| < 100k docs | `$regex` + índices de texto nativos | Solo añadir `@index` en schemas |
| 100k – 1M docs | MongoDB Atlas Search (`$search`) o `pg_trgm` | Cambiar implementación del provider — contrato sin cambios |
| > 1M docs | Typesense o Elasticsearch como backend dedicado | Nuevo adaptador por provider — contrato sin cambios |
| Búsqueda semántica / IA | Embeddings + vector search (Atlas Vector Search, pgvector) | Nuevo adaptador — contrato sin cambios |

### Ruta de migración — sin romper el contrato

El patrón `SearchProvider` es un **puerto** en arquitectura hexagonal. El `GlobalSearchQueryHandler` nunca sabe qué tecnología hay detrás. La migración a cualquier backend más potente sigue estos pasos:

1. Implementar nuevo adaptador (ej: `ElasticsearchChatSearchProvider`) que implemente `SearchProvider`
2. Sustituir el binding en `SearchModule` — un cambio de una línea
3. El endpoint, el handler, y el frontend no se tocan

```typescript
// Migración: cambiar adaptador en search.module.ts
// Antes:
inject: [ChatSearchProvider, ...]
// Después:
inject: [ElasticsearchChatSearchProvider, ...]
```

### Recomendación para Guiders v1

- Añadir índices de texto nativos desde el inicio (costo: mínimo, ganancia: significativa)
- Límite de 5 resultados por provider (25 máximo total) — reduce carga y es suficiente para navegación rápida
- **Typesense** es la opción más pragmática cuando el volumen lo justifique: self-hosted, latencia < 50ms, integración simple, y el `SearchProvider` ya absorbe el cambio sin fricción
- No introducir Typesense/Elasticsearch prematuramente — YAGNI hasta que las métricas lo justifiquen

---

## Roadmap de escalabilidad por fases

### Fase 1 — MVP: `$regex` + índices de texto nativos (ahora)

**Cuándo:** < 100K documentos por tenant, latencia aceptable.

**Implementación:**
- MongoDB: índice `$text` compuesto en cada schema buscable
- PostgreSQL: extensión `pg_trgm` + índice GIN

```typescript
// MongoDB: cambiar $regex por $text (usa el índice invertido nativo)
await this.model.find(
  { company_id: companyId, $text: { $search: query } },
  { score: { $meta: 'textScore' } }
).sort({ score: { $meta: 'textScore' } }).limit(5);

// Índice requerido en el schema:
@index({ title: 'text', visitorName: 'text', agentName: 'text' },
       { weights: { title: 10, visitorName: 5, agentName: 3 } })
```

**Limitaciones de esta fase:**
- Sin typo tolerance (`garciaa` no encuentra `garcia`)
- Sin prefix search en tiempo real (`conv` no encuentra `conversación` sin índice de prefijos)
- Un solo índice `$text` por colección en MongoDB

**Señales para avanzar a Fase 2:**
- Latencia p95 > 200ms de forma consistente
- Colección principal > 200K documentos
- Usuarios reportan que "no encuentran" lo que buscan

---

### Fase 2 — Motor dedicado: Typesense (200K – 5M docs)

**Cuándo:** Typo tolerance requerida, prefix search, facets, o latencia degradando.

**Por qué Typesense sobre Elasticsearch para Guiders:**
- Self-hosted, open source, ~$50-100/mes en un VPS de 4GB RAM
- Latencia < 10ms para queries típicas (todo en memoria)
- Typo tolerance y prefix search nativos sin configuración extra
- API más simple que Elasticsearch
- El patrón `SearchProvider` absorbe el cambio sin tocar el handler ni el endpoint

**Patrón de sincronización — event-driven:**

```typescript
// Sincronización via eventos de dominio (NO polling)
@EventsHandler(ChatCreatedEvent, ChatUpdatedEvent, ChatClosedEvent)
export class SyncChatToTypesenseHandler implements IEventHandler<ChatCreatedEvent> {
  async handle(event: ChatCreatedEvent): Promise<void> {
    // Documento desnormalizado — todos los campos relevantes en uno solo
    await this.typesense.upsert('chats', {
      id: event.chatId,
      company_id: event.companyId,
      agent_id: event.agentId,
      title: event.title,
      visitor_name: event.visitorName,
      agent_name: event.agentName,
      tags: event.tags,
      status: event.status,
      // Campo combinado para búsqueda full-text
      search_text: [event.title, event.visitorName, event.agentName].join(' '),
      created_at: event.createdAt.getTime(),
    });
  }
}
```

**Migración del provider — una línea:**

```typescript
// search/search.module.ts — solo cambia el adaptador inyectado
// Antes (Fase 1):
inject: [ChatSearchProvider, VisitorSearchProvider, LeadSearchProvider, CompanySearchProvider]

// Después (Fase 2):
inject: [TypesenseChatSearchProvider, TypesenseVisitorSearchProvider,
         TypesenseLeadSearchProvider, TypesenseCompanySearchProvider]

// El handler, el endpoint y el frontend no cambian.
```

**Schema de colección Typesense:**

```typescript
const chatSchema = {
  name: 'chats',
  fields: [
    { name: 'company_id', type: 'string', facet: true },
    { name: 'agent_id',   type: 'string', facet: true },  // filtro por agente
    { name: 'title',      type: 'string', infix: true },
    { name: 'visitor_name', type: 'string', infix: true },
    { name: 'agent_name', type: 'string' },
    { name: 'tags',       type: 'string[]', facet: true },
    { name: 'status',     type: 'string', facet: true },
    { name: 'created_at', type: 'int64' },
  ],
  default_sorting_field: 'created_at',
  token_separators: ['-', '_'],
};
```

---

### Fase 3 — Hybrid Search: BM25 + Vector Embeddings (> 1M docs o búsqueda semántica)

**Cuándo:** Los usuarios no encuentran resultados con términos exactos, se quiere AI search, o el volumen supera los 1M documentos.

**Cómo funciona internamente:**

Los motores como Google no solo buscan palabras — buscan *significado*. Usan **embeddings**: representaciones vectoriales de 1536 dimensiones donde textos semánticamente similares están cerca en el espacio vectorial.

```
"conversaciones sobre renovar plan enterprise"
    ↓ embedding model (OpenAI / sentence-transformers)
[0.23, -0.51, 0.87, ..., 0.12]  (1536 dimensiones)

Se buscan los vectores más cercanos usando HNSW:
  → "upgrade account discussion"   (similitud: 0.92) ← mismo significado, distinto vocabulario
  → "pricing negotiation"          (similitud: 0.88)
  → "plan renewal"                 (similitud: 0.85)
```

**Algoritmo HNSW** (Hierarchical Navigable Small World):
- Estándar de la industria para ANN (Approximate Nearest Neighbor)
- Complejidad: O(log N) vs O(N×D) de búsqueda exacta
- Usado por pgvector, Typesense, MongoDB Atlas Vector Search, Pinecone

**Hybrid Search con Reciprocal Rank Fusion (RRF):**

```
BM25 results:          Vector results:       RRF merge:
  1. "plan features"     1. "upgrade"          1. "plan features"  ← ambos rankings
  2. "precio plan"       2. "pricing"          2. "renovación"
  3. "renovación"        3. "renewal"          3. "pricing"

RRF score = Σ  1 / (60 + rank)   (k=60 es la constante empírica estándar)
```

**Implementación con Typesense v0.25+:**

```typescript
// Hybrid query: keyword + vector en una sola llamada
const queryEmbedding = await this.openai.embed(query);

await this.typesense.search('chats', {
  q: query,
  query_by: 'title,visitor_name,embedding',
  vector_query: `embedding:(${queryEmbedding.join(',')}, k:100)`,
  filter_by: `company_id:${companyId} && agent_id:${agentId}`,
  rank_fusion_params: { alpha: 0.5 }, // 0=solo vector, 1=solo keyword
  per_page: 5,
});
```

**Opción alternativa — pgvector (ya tienes PostgreSQL):**

```sql
-- Sin infraestructura adicional si ya usas PostgreSQL
CREATE INDEX ON companies USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

SELECT id, name,
       1 - (embedding <=> $1::vector) AS similarity
FROM companies
WHERE company_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

---

## Patrones de resiliencia

Independientemente de la fase, estos patrones son obligatorios en producción:

### Circuit Breaker — degradación elegante

Si el motor de búsqueda falla, el endpoint no debe caer con él. El Circuit Breaker permite fallback automático:

```
Estado CLOSED (normal):
  Request → Motor de búsqueda → Resultado

5 fallos consecutivos → Estado OPEN (30s):
  Request → Fallback ($text MongoDB) → Resultado degradado

Tras 30s → Estado HALF_OPEN (prueba):
  1 request → Motor de búsqueda
    ✅ éxito → vuelve a CLOSED
    ❌ fallo → vuelve a OPEN
```

**Regla crítica para los providers:** cada provider debe capturar sus propios errores y devolver `[]` en caso de fallo — nunca propagar la excepción al handler.

```typescript
// ✅ CORRECTO — el provider no propaga errores
async search(query: SearchQuery): Promise<SearchResult[]> {
  try {
    return await this.executeSearch(query);
  } catch (error) {
    this.logger.error('ChatSearchProvider failed', error);
    return []; // degradación elegante
  }
}

// ❌ INCORRECTO — un provider que falla rompe todos los resultados
async search(query: SearchQuery): Promise<SearchResult[]> {
  return await this.executeSearch(query); // si lanza, el Promise.all falla completo
}
```

### Cache-aside con Redis — queries frecuentes

```typescript
// TTL de 5 minutos para resultados de búsqueda
// Clave: hash(companyId + userRole + query)
// Invalidar: cuando se crea/actualiza un documento del tenant

async search(query: SearchQuery): Promise<SearchResult[]> {
  const key = `search:${query.companyId}:${query.userRole}:${query.term}`;
  const cached = await this.redis.get(key);
  if (cached) return JSON.parse(cached);

  const results = await this.executeSearch(query);
  if (results.length > 0) {
    await this.redis.setex(key, 300, JSON.stringify(results));
  }
  return results;
}
```

### Métricas clave a monitorizar

| Métrica | Objetivo | Alerta si |
|---|---|---|
| `p95_latency_ms` | < 200ms | > 500ms |
| `zero_results_rate` | < 5% | > 15% |
| `cache_hit_rate` | > 60% | < 30% |
| `circuit_breaker_opens` | 0 | > 0 en producción |
| `index_lag_seconds` | < 5s | > 30s |

---

## Referencias

- ADR-001: Arquitectura DDD + CQRS
- ADR-002: Dual Persistence (MongoDB + PostgreSQL)
- `AGENTS.md`: Convenciones de naming y patrones del proyecto
- Party Mode session 08/05/2026: debate Winston (Arch) + Amelia (Dev) + John (PM) sobre diseño del buscador
