export enum Operator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_OR_EQUALS = '>=',
  LESS_OR_EQUALS = '<=',
  LIKE = 'LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
}
export type LogicalOperator = 'AND' | 'OR';

export class Filter<T> {
  constructor(
    public readonly field: keyof T,
    public readonly operator: Operator,
    public readonly value?: unknown,
  ) {}
}

export class FilterGroup<T> {
  constructor(
    public readonly operator: LogicalOperator,
    public readonly filters: (Filter<T> | FilterGroup<T>)[],
  ) {}
}

export interface Index<T> {
  field: keyof T;
  value: unknown;
}

export interface OrderBy<T> {
  field: keyof T;
  direction: 'ASC' | 'DESC';
}

export class Criteria<T> {
  readonly filters: (Filter<T> | FilterGroup<T>)[];
  readonly orderBy?: OrderBy<T>;
  readonly limit?: number;
  readonly offset?: number;
  readonly index?: Index<T>;

  constructor(
    filters: (Filter<T> | FilterGroup<T>)[] = [],
    orderBy?: OrderBy<T>,
    limit?: number,
    offset?: number,
    index?: Index<T>,
  ) {
    this.filters = [...filters];
    this.orderBy = orderBy;
    // Se acepta 0 como valor válido; por eso se comprueba contra undefined
    this.limit = limit !== undefined ? limit : undefined;
    this.offset = offset !== undefined ? offset : undefined;
    this.index = index;
  }

  public addFilter(
    field: keyof T,
    operator: Operator,
    value: unknown,
  ): Criteria<T> {
    return new Criteria(
      [...this.filters, new Filter(field, operator, value)],
      this.orderBy,
      this.limit,
      this.offset,
      this.index,
    );
  }

  public addOrFilterGroup(filters: Filter<T>[]): Criteria<T> {
    return new Criteria(
      [...this.filters, new FilterGroup('OR', filters)],
      this.orderBy,
      this.limit,
      this.offset,
      this.index,
    );
  }

  public addAndFilterGroup(filters: Filter<T>[]): Criteria<T> {
    return new Criteria(
      [...this.filters, new FilterGroup('AND', filters)],
      this.orderBy,
      this.limit,
      this.offset,
      this.index,
    );
  }

  public orderByField(field: keyof T, direction: 'ASC' | 'DESC'): Criteria<T> {
    return new Criteria(
      this.filters,
      { field, direction },
      this.limit,
      this.offset,
      this.index,
    );
  }

  public setLimit(limit: number): Criteria<T> {
    return new Criteria(
      this.filters,
      this.orderBy,
      limit,
      this.offset,
      this.index,
    );
  }

  public setOffset(offset: number): Criteria<T> {
    return new Criteria(
      this.filters,
      this.orderBy,
      this.limit,
      offset,
      this.index,
    );
  }

  public setIndex(index: { field: keyof T; value: unknown }): Criteria<T> {
    return new Criteria(
      this.filters,
      this.orderBy,
      this.limit,
      this.offset,
      index,
    );
  }
}
