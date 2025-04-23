// Clase para convertir Criteria a sentencias SQL específicas de PostgreSQL
// Permite reutilizar la lógica de conversión en diferentes servicios de infraestructura
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
} from 'src/context/shared/domain/criteria';

export class CriteriaConverter {
  /**
   * Convierte un objeto Criteria en una sentencia SQL y parámetros para PostgreSQL
   * @param criteria Objeto Criteria a convertir
   * @param alias Alias de la tabla (por ejemplo, 'message')
   * @param fieldNameMap (opcional) Mapeo de nombres de campo del dominio a nombres de columna en la base de datos
   * @returns Objeto con fragmentos SQL y parámetros
   */
  static toPostgresSql(
    criteria: Criteria<any>,
    alias: string,
    fieldNameMap?: Record<string, string>,
  ) {
    // Construcción de filtros WHERE
    const whereClauses: string[] = [];
    const parameters: Record<string, any> = {};
    let paramIndex = 0;

    // Función auxiliar para obtener el nombre real de la columna
    const getColumnName = (field: string) => fieldNameMap?.[field] || field;

    const parseFilter = (filter: Filter<any> | FilterGroup<any>): string => {
      if (filter instanceof FilterGroup) {
        const subClauses = filter.filters.map(parseFilter);
        return `(${subClauses.join(` ${filter.operator} `)})`;
      }
      const paramName = `${String(filter.field)}_${paramIndex++}`;
      const columnName = getColumnName(String(filter.field));
      switch (filter.operator) {
        case Operator.IS_NULL:
          return `${alias}.${columnName} IS NULL`;
        default:
          parameters[paramName] = filter.value;
          return `${alias}.${columnName} ${String(filter.operator)} :${paramName}`;
      }
    };

    criteria.filters.forEach((filter) => {
      whereClauses.push(parseFilter(filter));
    });

    // Construcción de ORDER BY
    let orderByClause = '';
    if (criteria.orderBy) {
      const orderByColumn = getColumnName(String(criteria.orderBy.field));
      orderByClause = `ORDER BY ${alias}.${orderByColumn} ${criteria.orderBy.direction}`;
      // Orden secundario para desempatar por id si es necesario
      if (String(criteria.orderBy.field) === 'createdAt') {
        orderByClause += `, ${alias}.id ${criteria.orderBy.direction}`;
      }
    }

    // Construcción de LIMIT y OFFSET
    let limitClause = '';
    if (criteria.limit) {
      limitClause = `LIMIT ${criteria.limit}`;
    }
    let offsetClause = '';
    if (criteria.offset) {
      offsetClause = `OFFSET ${criteria.offset}`;
    }

    // Construcción de paginación por cursor
    let cursorClause = '';
    if (criteria.cursor) {
      const value = criteria.cursor.value as { createdAt: Date; id: string };
      console.warn(
        `Cursor: ${JSON.stringify(value)}, field: ${criteria.cursor?.field as string}, direction: ${criteria.orderBy?.direction}`,
      );
      const cursorColumn = getColumnName(String(criteria.cursor.field));
      if (
        criteria.orderBy &&
        criteria.orderBy.direction.toUpperCase() === 'DESC'
      ) {
        parameters['cursorCreatedAt'] = value.createdAt;
        parameters['cursorId'] = value.id;
        cursorClause = `AND (${alias}.${cursorColumn} < :cursorCreatedAt OR (${alias}.${cursorColumn} = :cursorCreatedAt AND ${alias}.id < :cursorId))`;
      } else {
        parameters['cursorCreatedAt'] = value.createdAt;
        parameters['cursorId'] = value.id;
        cursorClause = `AND (${alias}.${cursorColumn} > :cursorCreatedAt OR (${alias}.${cursorColumn} = :cursorCreatedAt AND ${alias}.id > :cursorId))`;
      }
    }

    // Unir todos los fragmentos
    const where =
      whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')} ${cursorClause}`.trim()
        : cursorClause
          ? `WHERE 1=1 ${cursorClause}`
          : '';
    const sql = [where, orderByClause, limitClause, offsetClause]
      .filter(Boolean)
      .join(' ');

    return { sql, parameters };
  }
}
