# Prompt para uso de la API Criteria

La API de Criteria permite construir consultas complejas de filtrado, ordenación y paginación de manera tipada y flexible. Utiliza los siguientes conceptos principales:

- **Operator**: Enumera los operadores de comparación disponibles (EQUALS, NOT_EQUALS, GREATER_THAN, etc.).
- **Filter<T>**: Representa un filtro sobre un campo de la entidad T, con un operador y un valor.
- **FilterGroup<T>**: Permite agrupar varios filtros usando operadores lógicos ('AND' o 'OR').
- **OrderBy<T>**: Define el campo y la dirección de ordenación ('ASC' o 'DESC').
- **Cursor<T>**: Permite paginación basada en cursores.
- **Criteria<T>**: Clase principal para construir la consulta. Permite añadir filtros, grupos de filtros, ordenación, límite, offset y cursor.

## Ejemplo de uso

```typescript
// Crear un filtro simple
const criteria = new Criteria<User>()
  .addFilter('name', Operator.EQUALS, 'John')
  .orderByField('createdAt', 'DESC')
  .setLimit(10)
  .setOffset(0);

// Crear un grupo de filtros OR
const orGroup = [
  new Filter<User>('status', Operator.EQUALS, 'active'),
  new Filter<User>('status', Operator.EQUALS, 'pending'),
];
const criteriaWithOr = new Criteria<User>()
  .addOrFilterGroup(orGroup);

// Crear un grupo de filtros AND
const andGroup = [
  new Filter<User>('age', Operator.GREATER_THAN, 18),
  new Filter<User>('country', Operator.EQUALS, 'Spain'),
];
const criteriaWithAnd = new Criteria<User>()
  .addAndFilterGroup(andGroup);
```

## Notas
- Los métodos de Criteria son inmutables: cada llamada retorna una nueva instancia.
- Puedes combinar filtros simples y grupos de filtros para construir consultas complejas.
- Utiliza los tipos genéricos para mantener el tipado seguro sobre los campos de la entidad.
- Consulta el archivo `criteria.ts` para más detalles sobre cada clase y método.
