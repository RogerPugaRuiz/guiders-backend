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

export class Filter<T> {
  constructor(
    public readonly field: keyof T,
    public readonly operator: Operator,
    public readonly value: unknown,
  ) {}
}

export interface OrderBy<T> {
  field: keyof T;
  direction: 'ASC' | 'DESC';
}

export class Criteria<T> {
  readonly filters: Filter<T>[];
  readonly orderBy?: OrderBy<T>;
  readonly limit?: number;
  readonly offset?: number;

  constructor(
    filters: Filter<T>[] = [],
    orderBy?: OrderBy<T>,
    limit?: number,
    offset?: number,
  ) {
    this.filters = [...filters];
    this.orderBy = orderBy;
    // Se acepta 0 como valor válido; por eso se comprueba contra undefined
    this.limit = limit !== undefined ? limit : undefined;
    this.offset = offset !== undefined ? offset : undefined;
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
    );
  }

  public orderByField(field: keyof T, direction: 'ASC' | 'DESC'): Criteria<T> {
    return new Criteria(
      this.filters,
      { field, direction },
      this.limit,
      this.offset,
    );
  }

  public setLimit(limit: number): Criteria<T> {
    return new Criteria(this.filters, this.orderBy, limit, this.offset);
  }

  public setOffset(offset: number): Criteria<T> {
    return new Criteria(this.filters, this.orderBy, this.limit, offset);
  }
}
