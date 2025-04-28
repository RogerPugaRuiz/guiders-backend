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
  static toPostgresSql<T>(
    criteria: Criteria<T>,
    alias: string,
    fieldNameMap?: Record<string, string>,
  ) {
    // Construcción de filtros WHERE
    const whereClauses: string[] = [];
    const parameters: Record<string, any> = {};
    let paramIndex = 0;

    // Función auxiliar para obtener el nombre real de la columna
    const getColumnName = (field: string) => fieldNameMap?.[field] || field;

    const parseFilter = (filter: Filter<T> | FilterGroup<T>): string => {
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
      const orderBys = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      const orderByParts = orderBys.map((order) => {
        const orderByColumn = getColumnName(String(order.field));
        return `${alias}.${orderByColumn} ${order.direction}`;
      });
      // Agrega el id como segundo criterio de ordenación si no está presente
      const idField =
        Object.keys(fieldNameMap || {}).find((key) => key === 'id') || 'id';
      const idColumn = getColumnName(idField);
      const idAlreadyPresent = orderBys.some(
        (order) => String(order.field) === idField,
      );
      if (!idAlreadyPresent) {
        orderByParts.push(`${alias}.${idColumn} DESC`);
      }
      orderByClause = `ORDER BY ${orderByParts.join(', ')}`;
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
    if (criteria.cursor && criteria.orderBy) {
      // Solo un cursor, pero considerar todos los campos de orderBy
      const cursor = criteria.cursor;
      const orderBys = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      // Generar expresión compuesta para el cursor
      const cursorExprs: string[] = [];
      // Para cada campo de orden, construir la comparación correspondiente
      orderBys.forEach((order) => {
        const cursorColumn = getColumnName(String(order.field));
        const paramName = `cursor_${String(order.field)}`;
        // El valor del cursor debe ser un objeto con los valores de los campos de orden
        const cursorValue = cursor[order.field as string];
        if (cursorValue !== undefined) {
          parameters[paramName] = cursorValue;
          const op = order.direction.toUpperCase() === 'DESC' ? '<' : '>';
          cursorExprs.push(`${alias}.${cursorColumn} ${op} :${paramName}`);
        }
      });
      if (cursorExprs.length > 0) {
        // Se combinan las expresiones con AND para paginación compuesta
        cursorClause = `AND (${cursorExprs.join(' AND ')})`;
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
