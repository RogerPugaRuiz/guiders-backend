Genera siempre consultas con la API de Criteria en TypeScript siguiendo estas reglas estrictas:

🚀 Construcción de Criteria
Usa siempre Criteria<T> con el tipo explícito de entidad (Criteria<User>, Criteria<Order>, etc.).

Los métodos de Criteria son inmutables. Cada método (addFilter, orderByField, setLimit, addAndFilterGroup, etc.) debe devolver una nueva instancia.

No modifiques directamente ninguna instancia de Criteria (prohibido mutar propiedades).

🔎 Filtros
Crea filtros simples con Filter<T>(field, Operator, value).

Para condiciones compuestas, usa FilterGroup<T> con operadores lógicos (AND, OR).

Los filtros deben respetar el tipado de la entidad (Filter<User>, Filter<Order>, etc.).

📊 Ordenación y Paginación
Usa orderByField(field, 'ASC' | 'DESC') para ordenar resultados.

Utiliza setLimit(number) y setOffset(number) para controlar la paginación por offset.

Para paginación basada en cursores, usa Cursor<T> y setCursor(cursor).

📌 Ejemplos válidos

```typescript
Copiar
Editar
const criteria = new Criteria<User>()
  .addFilter('name', Operator.EQUALS, 'John')
  .orderByField('createdAt', 'DESC')
  .setLimit(10)
  .setOffset(0);

const orGroup = [
  new Filter<User>('status', Operator.EQUALS, 'active'),
  new Filter<User>('status', Operator.EQUALS, 'pending'),
];
const criteriaWithOr = new Criteria<User>()
  .addOrFilterGroup(orGroup);

const andGroup = [
  new Filter<User>('age', Operator.GREATER_THAN, 18),
  new Filter<User>('country', Operator.EQUALS, 'Spain'),
];
const criteriaWithAnd = new Criteria<User>()
  .addAndFilterGroup(andGroup);
```

🚫 Prohibido
No mutar instancias de Criteria directamente.

No omitir tipado en filtros o criteria (deben ser siempre Filter<T>, Criteria<T>).

No usar lógica adicional fuera de la definición de filtros, grupos, ordenaciones o paginación.

## Archivos relacionados

- [Guía de Result + Optional](result+optional.prompt.md)
- [Guía de Value Object](value-object.prompt.md)
- [Guía de Domain Event](domain-event.prompt.md)
- [Guía de Entity](entity.prompt.md)
