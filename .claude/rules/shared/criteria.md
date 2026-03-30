# Criteria Pattern

## Description

Pattern for building flexible queries in a persistence-agnostic way.

## Reference
`src/context/shared/domain/criteria/criteria.ts`

## Base Structure

```typescript
const criteria = Criteria.create<Chat>()
  .addFilter('status', Operator.EQUALS, 'ACTIVE')
  .addFilter('companyId', Operator.EQUALS, companyId)
  .orderBy('createdAt', OrderDirection.DESC)
  .limit(20)
  .offset(0);
```

## Available Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `EQUALS` | Exact equality | `status = 'ACTIVE'` |
| `NOT_EQUALS` | Not equal | `status != 'CLOSED'` |
| `IN` | Within list | `status IN ['ACTIVE', 'PENDING']` |
| `NOT_IN` | Outside list | `status NOT IN ['CLOSED']` |
| `GREATER_THAN` | Greater than | `createdAt > date` |
| `LESS_THAN` | Less than | `createdAt < date` |
| `LIKE` | Contains (case insensitive) | `name LIKE '%john%'` |
| `IS_NULL` | Is null | `deletedAt IS NULL` |
| `IS_NOT_NULL` | Is not null | `assignedTo IS NOT NULL` |

## Pagination

```typescript
// Offset-based
const criteria = Criteria.create<Chat>()
  .limit(20)
  .offset(40);  // Page 3

// Cursor-based (better for large volumes)
const criteria = Criteria.create<Chat>()
  .limit(20)
  .cursor('createdAt', lastCreatedAt, CursorDirection.AFTER);
```

## Usage in Repositories

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

## Anti-patterns

- Manually concatenated SQL (use CriteriaConverter)
- Criteria with too many filters (consider indexes)
- Ignoring pagination in queries that can return many results
