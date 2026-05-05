# Historia SDK-1: Presencia de Comercial en Tiempo Real vía WebSocket para el SDK

Status: ready-for-dev

## Historia

Como visitante conectado a través del SDK de Guiders,
quiero saber en tiempo real si hay un comercial disponible para atenderme,
para que el widget pueda mostrar/ocultar el botón de chat de forma reactiva sin necesidad de polling.

## Contexto y Motivación

Actualmente el SDK solo puede consultar disponibilidad mediante `POST /api/v2/commercials/availability`
(polling), y ese endpoint tiene un **bug crítico**: devuelve disponibilidad de **todos los comerciales
del sistema** sin filtrar por empresa/sitio. Esta historia corrige el bug y añade un canal WebSocket
público orientado específicamente al SDK para recibir cambios de disponibilidad en tiempo real.

**Hallazgo clave (First Principles)**: No es necesario modificar el aggregate `Commercial` ni su
modelo MongoDB. El `companyId` ya está disponible en el JWT del comercial (`payload.companyId`,
línea 316 del gateway) y el gateway ya lo pasa a `markCommercialOnline(userId, tenantId)`. Solo
hay que propagar ese `companyId` a Redis en los sets de presencia.

---

## Criterios de Aceptación

### AC-1: Fix bug cross-tenant en endpoint REST de disponibilidad
- Dado que el SDK llama a `POST /api/v2/commercials/availability` con `{ domain, apiKey }`,
- Cuando se resuelve la empresa desde el dominio,
- Entonces solo se devuelven comerciales online que pertenezcan a esa empresa (`companyId`).

### AC-2: Redis almacena `companyId` en sets de presencia por tenant
- Al conectarse un comercial por WebSocket (JWT), su `companyId` (extraído del JWT) se almacena
  en sets Redis con sufijo de tenant: `commercials:online:{companyId}` y `commercials:available:{companyId}`.
- Los sets globales existentes (`commercials:online`, `commercials:available`, `commercials:busy`)
  se mantienen en paralelo para no romper código existente durante la transición.
- `getAvailableCommercials(companyId)` devuelve solo IDs del tenant indicado consultando
  `commercials:available:{companyId}`.
- **El aggregate `Commercial` y su modelo MongoDB no se modifican.**

### AC-3: El SDK puede conectarse al WebSocket con autenticación por `visitorId` + `tenantId`
- El `POST /api/v2/visitors/identify` ya devuelve `visitorId` y `tenantId`.
- El SDK inicia conexión Socket.IO con `handshake.auth: { visitorId, tenantId }`.
- El gateway ya acepta esta autenticación (`websocket.gateway.ts:250-287`) — sin cambios.

### AC-4: `handleJoinTenantRoom` valida que el `tenantId` coincide con el del cliente autenticado
- Cuando un visitante emite `tenant:join { tenantId }`, el servidor verifica que `tenantId`
  coincide con el `companyId`/`tenantId` con que se autenticó en el handshake.
- Si no coincide, el servidor devuelve `{ success: false, message: 'Acceso no autorizado' }` y
  emite un evento de error al cliente — sin unirse a la sala.
- Si coincide, el comportamiento actual se mantiene.

### AC-5: El visitante recibe `commercial:availability-changed` al cambiar la presencia de un comercial
- Una vez unido a `tenant:{tenantId}`, el visitante recibe el evento `commercial:availability-changed`
  cuando cualquier comercial de esa empresa cambia de estado.
- Payload del evento:
  ```json
  {
    "available": true,
    "onlineCount": 2,
    "timestamp": 1234567890
  }
  ```
  *(sin `tenantId` en el payload — el receptor ya sabe a qué tenant pertenece)*

### AC-6: El `inactivity.scheduler` limpia correctamente los nuevos sets por tenant
- El scheduler existente (`inactivity.scheduler.ts`) también limpia
  `commercials:online:{companyId}` y `commercials:available:{companyId}` al expirar la
  inactividad de un comercial.

### AC-7: Flujo SDK recomendado para eliminar ventana de inconsistencia
- El SDK debe: (1) conectar WS y hacer `tenant:join` primero, (2) después llamar al REST
  `POST /api/v2/commercials/availability` para obtener el estado inicial.
- Este orden garantiza que cualquier cambio ocurrido durante el REST call ya es capturado por el WS.
- Documentado en `docs/api/openapi.yaml` como nota de integración.

---

## Tareas / Subtareas

- [ ] **Task 1 — Añadir soporte de `companyId` en sets Redis de presencia** (AC: #2)
  - [ ] 1.1 Modificar la firma de `setConnectionStatus` en la interfaz
    `src/context/commercial/domain/commercial-connection.domain-service.ts` para aceptar
    `companyId?: string` opcional.
  - [ ] 1.2 En `src/context/commercial/infrastructure/connection/redis-commercial-connection.domain-service.ts`:
    - Añadir constantes para sets por tenant:
      ```typescript
      private readonly PREFIX_SET_ONLINE = 'commercials:online:';    // + companyId
      private readonly PREFIX_SET_AVAILABLE = 'commercials:available:'; // + companyId
      ```
    - Modificar `setConnectionStatus(commercialId, status, companyId?)` para que, cuando
      `companyId` está presente, haga `SADD`/`SREM` en los sets por tenant además de los globales.
    - Implementar `getAvailableCommercials(companyId?: string)`: si se pasa `companyId`, consulta
      `commercials:available:{companyId}`; sin `companyId`, usa el set global actual.
    - Implementar `getOnlineCountByTenant(companyId: string): Promise<number>` usando `SCARD`.
  - [ ] 1.3 Actualizar `removeConnection(commercialId, companyId?)` para limpiar también los sets
    por tenant cuando se proporciona `companyId`.

- [ ] **Task 2 — Propagar `companyId` desde el gateway al domain service** (AC: #2)
  - [ ] 2.1 Verificar que `markCommercialOnline(userId, tenantId)` en el gateway ya recibe
    `tenantId` (línea 1210 gateway) — **sí lo recibe**, viene de `payload.companyId` del JWT.
  - [ ] 2.2 Modificar `markCommercialOnline` para pasar `tenantId` a `setConnectionStatus`:
    ```typescript
    await this.commercialConnectionService.setConnectionStatus(
      commercialId,
      CommercialConnectionStatus.online(),
      tenantId, // ← propagar companyId
    );
    ```
  - [ ] 2.3 Hacer lo mismo en `markCommercialOffline` para limpiar los sets por tenant.

- [ ] **Task 3 — Fix bug cross-tenant en query de availability** (AC: #1)
  - [ ] 3.1 En `src/context/commercial/application/queries/get-commercial-availability-by-site.query-handler.ts`:
    - Resolver `companyId` a partir del `siteId` ya recibido (la empresa ya se resuelve en el
      handler — extraer su `companyId`).
    - Llamar a `getAvailableCommercials(companyId)` con el filtro correcto.
    - Eliminar el `TODO` de las líneas 14-17.
  - [ ] 3.2 Actualizar el test unitario del handler para verificar filtrado por `companyId`.

- [ ] **Task 4 — Validar `tenantId` en `handleJoinTenantRoom`** (AC: #4)
  - [ ] 4.1 En `src/websocket/websocket.gateway.ts`, en `handleJoinTenantRoom` (línea 613),
    añadir validación tras obtener `tenantId` del body:
    ```typescript
    const clientUser = this.clientUsers.get(client.id);
    const clientTenantId = clientUser?.tenantId || clientUser?.companyId;
    if (clientTenantId && clientTenantId !== tenantId) {
      client.emit('error', {
        message: 'Acceso no autorizado al tenant solicitado',
        timestamp: Date.now(),
      });
      return { success: false, message: 'Acceso no autorizado' };
    }
    ```
  - [ ] 4.2 Añadir test unitario para el caso de tenant-hopping rechazado.

- [ ] **Task 5 — Crear event handler que emite `commercial:availability-changed` al tenant** (AC: #5)
  - [ ] 5.1 Crear `src/context/commercial/infrastructure/events/notify-tenant-on-commercial-presence-changed.event-handler.ts`:
    - Escucha `PresenceChangedEvent`.
    - Actúa solo cuando `event.userType === 'commercial'` y `event.tenantId` está presente.
    - Llama a `getOnlineCountByTenant(event.tenantId)` para obtener el recuento actualizado.
    - Emite `commercial:availability-changed` a sala `tenant:{event.tenantId}`:
      ```typescript
      this.websocketGateway.emitToRoom(
        `tenant:${event.tenantId}`,
        'commercial:availability-changed',
        {
          available: onlineCount > 0,
          onlineCount,
          timestamp: Date.now(),
        },
      );
      ```
  - [ ] 5.2 Registrar el handler en `CommercialModule` como provider y en el array `handlers`.
  - [ ] 5.3 Verificar que `CommercialModule` importa `WebsocketModule` (o usa `forwardRef()` si
    hay dependencia circular). Buscar el patrón ya usado en otros módulos del proyecto.

- [ ] **Task 6 — Actualizar `inactivity.scheduler` para sets por tenant** (AC: #6)
  - [ ] 6.1 En `src/context/commercial/infrastructure/schedulers/inactivity.scheduler.ts`,
    al limpiar un comercial inactivo, obtener su `companyId` del Hash Redis
    `commercial:meta:{id}` (si se implementa) o hacer `SREM` en todos los sets por tenant
    donde pueda estar presente.
  - [ ] 6.2 **Alternativa más simple**: almacenar `companyId` en una key Redis adicional
    `commercial:tenant:{commercialId}` con TTL igual al status, y consultarla en el scheduler
    antes de limpiar.

- [ ] **Task 7 — Documentar flujo de integración para el SDK** (AC: #7)
  - [ ] 7.1 En `docs/api/openapi.yaml`, bajo la sección de WebSocket (o como comentario en el
    endpoint de availability), añadir nota del flujo recomendado: WS primero, REST después.
  - [ ] 7.2 Añadir descripción del evento `commercial:availability-changed` en el OpenAPI.

- [ ] **Task 8 — Tests unitarios** (AC: #1, #2, #4, #5)
  - [ ] 8.1 Test para `GetCommercialAvailabilityBySiteQueryHandler` — verifica filtrado por `companyId`.
  - [ ] 8.2 Test para `RedisCommercialConnectionDomainService.getAvailableCommercials(companyId)`.
  - [ ] 8.3 Test para `NotifyTenantOnCommercialPresenceChangedEventHandler` — verifica que emite
    `commercial:availability-changed` con payload correcto y solo cuando `userType === 'commercial'`.
  - [ ] 8.4 Test para `handleJoinTenantRoom` — verifica que rechaza tenant-hopping.

---

## Dev Notes

### Flujo completo del SDK (de principio a fin)

```
1. SDK llama: POST /api/v2/visitors/identify
   ← Respuesta: { visitorId, tenantId, sessionId, ... }

2. SDK conecta WebSocket (PRIMERO — antes del REST de estado inicial):
   io(WS_URL, { auth: { visitorId, tenantId } })
   ← Gateway autentica automáticamente, une a sala visitor:{visitorId}

3. SDK emite: tenant:join  { tenantId }
   ← Gateway valida que tenantId coincide con el del handshake
   ← Gateway une al cliente a sala tenant:{tenantId}
   ← Gateway responde: { success: true, roomName: "tenant:{tenantId}" }

4. SDK llama (DESPUÉS de suscribirse al WS): POST /api/v2/commercials/availability
   { domain, apiKey }
   ← { available: true, onlineCount: 2, siteId, timestamp }
   → Este es el estado inicial. Cualquier cambio ocurrido durante esta llamada
     ya es capturado por el WS (ventana de inconsistencia eliminada).

5. Cuando un comercial de esa empresa cambia de estado:
   ← Servidor emite a tenant:{tenantId}: commercial:availability-changed
      { available: true, onlineCount: 2, timestamp }

6. SDK actualiza el widget reactivamente según available/onlineCount.
```

### Archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `src/context/commercial/domain/commercial-connection.domain-service.ts` | Añadir `companyId?` a firmas de interfaz |
| `src/context/commercial/infrastructure/connection/redis-commercial-connection.domain-service.ts` | Sets por tenant + `getAvailableCommercials(companyId?)` + `getOnlineCountByTenant()` |
| `src/context/commercial/application/queries/get-commercial-availability-by-site.query-handler.ts` | Fix filtrado cross-tenant |
| `src/context/commercial/infrastructure/events/notify-tenant-on-commercial-presence-changed.event-handler.ts` | **NUEVO** — emite `commercial:availability-changed` a `tenant:{tenantId}` |
| `src/context/commercial/infrastructure/schedulers/inactivity.scheduler.ts` | Limpiar sets por tenant |
| `src/websocket/websocket.gateway.ts` | Validar `tenantId` en `handleJoinTenantRoom` (línea 613) + propagar `companyId` en `markCommercialOnline/Offline` |
| `src/context/commercial/domain/commercial.aggregate.ts` | **SIN CAMBIOS** |
| `src/context/commercial/infrastructure/persistence/` | **SIN CAMBIOS** |

### Patrones críticos a seguir

#### Sets Redis — estructura por tenant
```typescript
// Constantes a añadir en RedisCommercialConnectionDomainService
private readonly PREFIX_SET_ONLINE    = 'commercials:online:';    // + companyId
private readonly PREFIX_SET_AVAILABLE = 'commercials:available:'; // + companyId

// Al marcar online con companyId:
await this.client.sAdd(`commercials:online:${companyId}`, commercialId.value);
await this.client.sAdd(`commercials:available:${companyId}`, commercialId.value);
// Mantener sets globales también (retrocompatibilidad):
await this.client.sAdd(this.SET_ONLINE, commercialId.value);
await this.client.sAdd(this.SET_AVAILABLE, commercialId.value);

// Recuento eficiente por tenant:
const count = await this.client.sCard(`commercials:available:${companyId}`);
```

#### Key para recuperar `companyId` del scheduler
```typescript
// Al marcar online, almacenar también:
await this.client
  .multi()
  .set(`commercial:tenant:${commercialId.value}`, companyId)
  .expire(`commercial:tenant:${commercialId.value}`, this.TTL_SECONDS)
  .exec();

// En el scheduler, al limpiar inactivo:
const companyId = await this.client.get(`commercial:tenant:${commercialId}`);
if (companyId) {
  await this.client.sRem(`commercials:online:${companyId}`, commercialId);
  await this.client.sRem(`commercials:available:${companyId}`, commercialId);
}
```

#### Event handler nuevo — patrón del proyecto
```typescript
@EventsHandler(PresenceChangedEvent)
export class NotifyTenantOnCommercialPresenceChangedEventHandler
  implements IEventHandler<PresenceChangedEvent>
{
  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async handle(event: PresenceChangedEvent): Promise<void> {
    // Solo actuar sobre cambios de comerciales con tenantId conocido
    if (event.userType !== 'commercial' || !event.tenantId) return;

    const onlineCount = await this.connectionService.getOnlineCountByTenant(event.tenantId);

    this.websocketGateway.emitToRoom(
      `tenant:${event.tenantId}`,
      'commercial:availability-changed',
      {
        available: onlineCount > 0,
        onlineCount,
        timestamp: Date.now(),
      },
    );
  }
}
```

#### Validación de tenant-hopping en gateway
```typescript
// En handleJoinTenantRoom, ANTES de hacer client.join(roomName):
const clientUser = this.clientUsers.get(client.id);
const clientTenantId = clientUser?.tenantId || clientUser?.companyId;
if (clientTenantId && clientTenantId !== tenantId) {
  this.logger.warn(
    `Intento de tenant-hopping bloqueado: client=${client.id}, ` +
    `autenticado=${clientTenantId}, solicitado=${tenantId}`
  );
  client.emit('error', {
    message: 'Acceso no autorizado al tenant solicitado',
    timestamp: Date.now(),
  });
  return { success: false, message: 'Acceso no autorizado' };
}
```

### Decisiones arquitectónicas tomadas

| Decisión | Elección | Razón |
|----------|----------|-------|
| ¿Modificar aggregate Commercial? | **No** | `companyId` ya existe en el JWT del comercial; el aggregate es solo estado de conexión |
| ¿Sets globales vs. por tenant en Redis? | **Ambos en paralelo** | Retrocompatibilidad con código existente; coste mínimo |
| ¿Dónde crear el event handler? | **`commercial/infrastructure/events/`** | Evita que `shared` dependa de `commercial`; SRP |
| ¿Estado inicial al conectarse? | **REST (con fix) + WS para cambios** | Sin cambios en gateway; orden SDK elimina ventana de inconsistencia |
| ¿`tenantId` en payload del evento WS? | **No incluir** | Reduce info expuesta; el receptor ya sabe a qué tenant pertenece |

### Comportamiento de eventual consistency
El recuento `onlineCount` en el evento WS refleja el estado Redis en el momento exacto de la
llamada a `SCARD`. Si dos comerciales cambian de estado casi simultáneamente, cada evento llevará
el recuento correcto en su instante — pero el orden de llegada puede variar. Este comportamiento
es **aceptable** para "¿hay alguien disponible?", ya que no es una operación transaccional.

### Riesgo: `forwardRef()` si hay dependencia circular
Si al registrar `NotifyTenantOnCommercialPresenceChangedEventHandler` en `CommercialModule` aparece
un error de dependencia circular con `WebsocketModule`, usar:
```typescript
// En CommercialModule imports:
forwardRef(() => WebsocketModule),
```
Buscar el patrón en `src/context/conversations-v2/` — probablemente ya importa `WebsocketModule`.

### Project Structure Notes

- Nuevo handler en: `src/context/commercial/infrastructure/events/` (crear carpeta si no existe)
- Tests del handler en: `src/context/commercial/infrastructure/events/__tests__/`
- El módulo `CommercialModule` está en `src/context/commercial/commercial.module.ts`
- **Siempre usar UUIDs reales en tests**: `Uuid.random().value`
- El `PresenceChangedEvent` ya tiene `tenantId?: string` — no requiere modificación

### References

- Gateway — autenticación visitante: `src/websocket/websocket.gateway.ts:250-287`
- Gateway — `handleJoinTenantRoom`: `src/websocket/websocket.gateway.ts:613`
- Gateway — `markCommercialOnline` con `tenantId`: `src/websocket/websocket.gateway.ts:1210`
- Gateway — `clientUsers` Map (para validación tenant-hopping): `src/websocket/websocket.gateway.ts:119`
- Gateway — extracción `companyId` de JWT: `src/websocket/websocket.gateway.ts:316`
- Bug documentado: `src/context/commercial/application/queries/get-commercial-availability-by-site.query-handler.ts:14-17`
- Redis connection service completo: `src/context/commercial/infrastructure/connection/redis-commercial-connection.domain-service.ts`
- Sets globales actuales: líneas 33-35 del redis connection service
- `getAvailableCommercials()` sin filtro: línea 180 del redis connection service
- `PresenceChangedEvent` con `tenantId`: `src/context/shared/domain/events/presence-changed.event.ts:6`
- Scheduler inactividad: `src/context/commercial/infrastructure/schedulers/inactivity.scheduler.ts`
- Endpoint público availability: `src/context/commercial/infrastructure/controllers/commercial.controller.ts:414`
- Respuesta identify con `tenantId`: `src/context/visitors-v2/application/dtos/identify-visitor-response.dto.ts`

---

## Dev Agent Record

### Agent Model Used

github-copilot/claude-sonnet-4.6

### Debug Log References

### Completion Notes List

### File List
