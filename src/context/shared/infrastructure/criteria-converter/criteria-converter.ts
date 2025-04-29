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
      // Soporta múltiples campos de ordenamiento para paginación compuesta
      const cursor = criteria.cursor;
      const orderBys = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      // Genera condiciones lexicográficas para el cursor
      const buildCursorCondition = (index: number): string => {
        // Genera la condición para los primeros 'index + 1' campos
        const andParts: string[] = [];
        for (let i = 0; i < index; i++) {
          const prevOrder = orderBys[i];
          const prevColumn = getColumnName(String(prevOrder.field));
          const prevParam = `cursor_${String(prevOrder.field)}`;
          andParts.push(`${alias}.${prevColumn} = :${prevParam}`);
        }
        const currentOrder = orderBys[index];
        const currentColumn = getColumnName(String(currentOrder.field));
        const currentParam = `cursor_${String(currentOrder.field)}`;
        const op = currentOrder.direction.toUpperCase() === 'DESC' ? '<' : '>';
        andParts.push(`${alias}.${currentColumn} ${op} :${currentParam}`);
        return `(${andParts.join(' AND ')})`;
      };
      // Asigna los valores de los parámetros del cursor
      orderBys.forEach((order) => {
        const paramName = `cursor_${String(order.field)}`;
        const cursorValue = cursor[order.field as string];
        if (cursorValue !== undefined) {
          parameters[paramName] = cursorValue;
        }
      });
      // Combina las condiciones con OR para paginación compuesta
      if (orderBys.length > 0) {
        const orConditions = orderBys.map((_, idx) => buildCursorCondition(idx));
        cursorClause = `AND (${orConditions.join(' OR ')})`;
      }
    }

    // Unir todos los fragmentos
    let where = '';
    if (whereClauses.length > 0 && cursorClause) {
      where = `WHERE ${whereClauses.join(' AND ')} ${cursorClause}`.trim();
    } else if (whereClauses.length > 0) {
      where = `WHERE ${whereClauses.join(' AND ')}`;
    } else if (cursorClause) {
      where = `WHERE 1=1 ${cursorClause}`;
    } // Si no hay filtros ni cursor, no se agrega WHERE
    const sql = [where, orderByClause, limitClause, offsetClause]
      .filter(Boolean)
      .join(' ');

    return { sql, parameters };
  }
}
