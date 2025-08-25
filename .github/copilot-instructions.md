## Guiders Backend – Instrucciones Clave para Agentes de Código

Entra produciendo valor rápido: este backend (NestJS 11 + DDD + CQRS) separa dominios en contextos autónomos bajo `src/context/*` con tres capas fijas: `domain/`, `application/`, `infrastructure/`.

### 1. Panorama Arquitectura
- Contextos principales: `auth`, `company`, `conversations` (legacy), `conversations-v2` (Mongo optimizado), `real-time` (WebSocket + notificaciones), `visitors`, `tracking`, `shared` (value objects/result/criteria).
- Dual DB: PostgreSQL (relacional) + MongoDB (mensajería y chats v2). Tests unit usan SQLite in‑memory; integración/e2e usan Postgres + Mongo.
- Eventos de dominio + handlers cross-context: patrón de nombre `<NuevaAccion>On<OldEvent>EventHandler` para sincronizar datos entre bounded contexts.

### 2. Patrones Obligatorios
- Value Objects: siempre reutilizar los de `shared` o extender `PrimitiveValueObject`; no crear métodos `create()` extra.
- Result Pattern: no lanzar excepciones en dominio; usar `ok/err` desde `shared/domain/result`.
- Repositorios: exponer `save, findById, findAll, delete, update, findOne, match`; métodos que pueden fallar devuelven `Result<…, DomainError>`.
- CriteriaConverter: cualquier consulta dinámica debe usar `CriteriaConverter.toPostgresSql(criteria, 'tabla', fieldMap)` y limpiar el `WHERE` inicial antes de pasarlo a QueryBuilder.
- Eventos: aggregates extienden `AggregateRoot`; tras mutar estado: `publisher.mergeObjectContext(aggregate)`, `repository.save(aggregate)`, luego `aggregate.commit()` – nunca olvidar el commit.
- Inyección: usar símbolos (`export const USER_REPOSITORY = Symbol('UserRepository')`) y registrar en el módulo.
- Mappers: conversión dominio ↔ persistencia aislada en clase `XMapper` (sin lógica de negocio extra).

### 3. Mongo (conversations-v2)
- Colecciones clave: `chats_v2`, `messages`, `comercial_claims`.
- Esquemas con índices explícitos e `@Schema({ collection: '...' , timestamps: true })`.
- Campos de filtrado frecuente (ej: `assignedCommercialId`) deben tener `index: true` como ya se observa en `ChatSchema`.

### 4. Flujo de Desarrollo
1. Crear/editar dominio (VOs, entidad, eventos, repo interface + símbolo). Propiedades de entidad: `private readonly`. Métodos fábrica: `create` (emite evento) y `fromPrimitives`.
2. Infraestructura: entidad TypeORM / schema Mongoose + mapper + implementación repo en `infrastructure/persistence/impl`.
3. Application: command/query handlers solo orquestan; nada de lógica de dominio allí.
4. Tests: colocar en `__tests__/` al lado del código. UUIDs con `Uuid.random().value`.
5. Ejecutar `npm run test:unit` y `npm run lint` antes de abrir PR.

### 4.1 Checklist Rápido al Crear Nuevo Código
Marcar cada punto antes de abrir la PR:
- [ ] Identificado contexto correcto (no crear contexto genérico; reutilizar si aplica).
- [ ] Value Objects reutilizados desde `shared` o creados extendiendo `PrimitiveValueObject` (sin método `create`).
- [ ] Entidad / Aggregate con props `private readonly`, métodos estáticos `create` (aplica evento) y `fromPrimitives`, y `toPrimitives` completo.
- [ ] Evento(s) de dominio definidos si hay cambio relevante de estado (nombre `<Entidad><Accion>Event`).
- [ ] Interfaz de repositorio + símbolo exportado (métodos obligatorios: save, findById, findAll, delete, update, findOne, match) retornando `Result` donde puede fallar.
- [ ] Implementación de repositorio en `infrastructure/persistence/impl` + mapper separado (`XMapper`).
- [ ] Consultas dinámicas usan `CriteriaConverter` + `sql.replace(/^WHERE /,'')` en QueryBuilder.
- [ ] Nueva columna/campo: migración TypeORM o ajuste Schema Mongoose + índice si se filtrará.
- [ ] Uso de `publisher.mergeObjectContext(aggregate)` + `aggregate.commit()` tras `repository.save`.
- [ ] Handlers (command/query/event) sin lógica de negocio; sólo orquestan.
- [ ] Tests unit locales en `__tests__/` (happy path + 1 fallo) usando `Uuid.random().value`.
- [ ] Lint sin errores (`npm run lint`).
- [ ] Cobertura no cae por debajo de umbral (ver script `scripts/check-coverage-threshold.js`).
- [ ] No se usan entidades de persistencia directamente en dominio / handlers.
- [ ] WebSocket: si se añade evento nuevo, documentado y protegido con guards adecuados.
- [ ] README del contexto actualizado si agrega capacidad relevante.

### 5. WebSocket / Tiempo Real
- Canaliza eventos a clientes usando builders de respuesta (`ResponseBuilder` pattern) con campos: success, message, data, type.
- Eventos principales: `visitor:start-chat`, `visitor:send-message`, `commercial:send-message`, `commercial:viewing-chat`, `health-check`.
- Guardas: usar `@UseGuards(WsAuthGuard, WsRolesGuard)` + `@Roles([...])`; token viene en `client.handshake.auth.token`.

### 6. Convenciones de Código
- Archivos kebab-case; clases PascalCase; funciones/vars camelCase; comentarios en español explicando intención, no implementación obvia.
- Evitar carpetas genéricas (`utils`); preferir semánticas (ej: `email/`, `auth/`).
- No `require` dinámico; siempre `import` estático.

### 7. Consultas Dinámicas Ejemplo
```typescript
const { sql, parameters } = CriteriaConverter.toPostgresSql(criteria, 'visitors', fieldMap);
const rows = await repo
  .createQueryBuilder('visitors')
  .where(sql.replace(/^WHERE /, ''))
  .setParameters(parameters)
  .getMany();
```

### 8. Result Pattern Ejemplo
```typescript
const r = await userRepo.findById(userId);
if (r.isErr()) return err(r.error); // Propaga dominio
return ok(r.value);
```

### 9. CLI Interna (bin/guiders-cli.js)
Comandos frecuentes:
```bash
node bin/guiders-cli.js clean-database --force
node bin/guiders-cli.js create-company --name "Empresa" --domain "empresa.com"
node bin/guiders-cli.js create-company-with-admin --name "Empresa" --domain "empresa.com" --adminName "Admin" --adminEmail "admin@empresa.com"
```

### 10. Testing Estratificado
- Unit (`npm run test:unit`): SQLite memoria.
- Integración (`npm run test:int`): Postgres + Mongo; validar interacción repos.
- E2E (`npm run test:e2e`): flujo completo chats + WebSocket.
- Timeout estándar 30s; usa UUIDs aleatorios para aislar datos.

### 11. Errores y Eventos Cross-Context
Handlers escuchan eventos de otros contexts para crear side-effects (ej: crear API Key tras `CompanyCreatedEvent`). Nombrar siempre siguiendo convención para trazabilidad.

### 12. Mongo / Chats v2 Consideraciones
- Optimizar filtros comerciales: asegurar índices en campos agregados nuevos.
- No mezclar lógica de negocio en schemas; mantenerla en aggregates/hendlers.

### 13. Al Añadir Campo Persistente
1. Actualizar entidad dominio + VO si aplica.
2. Migración TypeORM (Postgres) o ajuste schema Mongoose.
3. Mapper(s) y tests.
4. Ajustar criteria fieldMap en repos que lo usen.

### 14. Checklist PR Interna
- [ ] Dominios usan Result y VO correctos
- [ ] Repos usan CriteriaConverter para filtros compuestos
- [ ] Commit de eventos ejecutado tras save
- [ ] Tests unit + lint pasan
- [ ] Nuevos índices Mongo si campo será filtrado frecuente

### 15. Anti‑Patrones que Rechazar
- Lógica de negocio en controllers/handlers
- Uso directo de entidades TypeORM en dominio (siempre mapear)
- Excepciones para control de flujo en dominio
- Queries ad-hoc sin CriteriaConverter

### 16. Ejemplo Aggregate (resumido)
```typescript
export class Visitor extends AggregateRoot {
  private constructor(private readonly _id: VisitorId, /* ... */) { super(); }
  static create(props: VisitorProperties) { const v = new Visitor(props.id /*...*/); v.apply(new VisitorCreatedEvent({ visitor: v.toPrimitives() })); return v; }
  static fromPrimitives(p: VisitorPrimitives) { return new Visitor(VisitorId.create(p.id) /*...*/); }
  toPrimitives(): VisitorPrimitives { return { id: this._id.value /*...*/ }; }
}
```

### 17. Dónde Mirar Antes de Implementar
- Patrón de repos: ver alguno existente en `infrastructure/persistence/impl`.
- Eventos cross-context: buscar `On` en nombres de handlers.
- Value objects reutilizables: `shared/domain/value-objects`.

---
Si algo no esté cubierto o ves repetición/ambigüedad, solicita precisión antes de generar código.