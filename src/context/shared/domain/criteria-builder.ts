// Clase CriteriaBuilder para construir objetos Criteria de forma fluida y legible
// Permite agregar filtros, ordenamientos, límites, offset y cursor de manera encadenada
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
  OrderBy,
  OrderByList,
  Cursor,
} from './criteria';

// Builder para facilitar la creación de Criteria en tests y servicios
export class CriteriaBuilder<T> {
  private filters: (Filter<T> | FilterGroup<T>)[] = [];
  private orderBy?: OrderBy<T> | OrderByList<T>;
  private limit?: number;
  private offset?: number;
  private cursor?: Cursor<T>;

  // Agrega un filtro simple
  addFilter(field: keyof T, operator: Operator, value?: unknown): this {
    this.filters.push(new Filter(field, operator, value));
    return this;
  }

  // Agrega un grupo de filtros con operador OR
  addOrFilterGroup(filters: Filter<T>[]): this {
    this.filters.push(new FilterGroup('OR', filters));
    return this;
  }

  // Agrega un grupo de filtros con operador AND
  addAndFilterGroup(filters: Filter<T>[]): this {
    this.filters.push(new FilterGroup('AND', filters));
    return this;
  }

  // Define el ordenamiento (puede ser uno o varios)
  setOrderBy(orderBy: OrderBy<T> | OrderByList<T>): this {
    this.orderBy = orderBy;
    return this;
  }

  // Agrega un campo de ordenamiento
  addOrderBy(field: keyof T, direction: 'ASC' | 'DESC'): this {
    if (!this.orderBy) {
      this.orderBy = [];
    }
    if (!Array.isArray(this.orderBy)) {
      this.orderBy = [this.orderBy];
    }
    this.orderBy.push({ field, direction });
    return this;
  }

  // Define el límite de resultados
  setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  // Define el offset de resultados
  setOffset(offset: number): this {
    this.offset = offset;
    return this;
  }

  // Define el cursor para paginación
  setCursor(cursor: Cursor<T>): this {
    this.cursor = cursor;
    return this;
  }

  // Construye el objeto Criteria
  build(): Criteria<T> {
    return new Criteria(
      this.filters,
      this.orderBy,
      this.limit,
      this.offset,
      this.cursor,
    );
  }
}
