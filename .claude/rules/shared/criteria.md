# Criteria Pattern

## Descripción

Patrón para construir queries flexibles de forma agnóstica a la persistencia.

## Referencia
`src/context/shared/domain/criteria/criteria.ts`

## Estructura Base

```typescript
const criteria = Criteria.create<Chat>()
  .addFilter('status', Operator.EQUALS, 'ACTIVE')
  .addFilter('companyId', Operator.EQUALS, companyId)
  .orderBy('createdAt', OrderDirection.DESC)
  .limit(20)
  .offset(0);
```

## Operadores Disponibles

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `EQUALS` | Igualdad exacta | `status = 'ACTIVE'` |
| `NOT_EQUALS` | Diferente | `status != 'CLOSED'` |
| `IN` | Dentro de lista | `status IN ['ACTIVE', 'PENDING']` |
| `NOT_IN` | Fuera de lista | `status NOT IN ['CLOSED']` |
| `GREATER_THAN` | Mayor que | `createdAt > date` |
| `LESS_THAN` | Menor que | `createdAt < date` |
| `LIKE` | Contiene (case insensitive) | `name LIKE '%john%'` |
| `IS_NULL` | Es null | `deletedAt IS NULL` |
| `IS_NOT_NULL` | No es null | `assignedTo IS NOT NULL` |

## Paginación

```typescript
// Offset-based
const criteria = Criteria.create<Chat>()
  .limit(20)
  .offset(40);  // Página 3

// Cursor-based (mejor para grandes volúmenes)
const criteria = Criteria.create<Chat>()
  .limit(20)
  .cursor('createdAt', lastCreatedAt, CursorDirection.AFTER);
```

## Uso en Repositorios

```typescript
// MongoDB
async match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>> {
  const filter = this.buildMongoFilter(criteria);
  const options = {
    sort: criteria.orderBy ? { [criteria.orderBy.field]: criteria.orderBy.direction } : {},
    limit: criteria.limit,
    skip: criteria.offset,
  };

  const schemas = await this.model.find(filter, null, options);
  return ok(this.mapper.toDomainList(schemas));
}

// TypeORM
async match(criteria: Criteria<Company>): Promise<Result<Company[], DomainError>> {
  const { sql, parameters } = CriteriaConverter.toPostgresSql(
    criteria,
    'companies',
    { id: 'id', name: 'company_name' },
  );

  const entities = await this.repo.query(sql, parameters);
  return ok(entities.map(CompanyMapper.toDomain));
}
```

## Anti-patrones

- SQL concatenado manualmente (usar CriteriaConverter)
- Criteria con demasiados filtros (considerar índices)
- Ignorar paginación en queries que pueden retornar muchos resultados
