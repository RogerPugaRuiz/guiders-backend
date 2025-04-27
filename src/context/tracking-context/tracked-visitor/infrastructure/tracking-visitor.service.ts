import { Injectable, Logger } from '@nestjs/common';
import { ITrackingVisitorRepository } from '../domain/tracking-visitor.repository';
import {
  Criteria,
  Filter,
  FilterGroup,
} from 'src/context/shared/domain/criteria';
import { TrackingVisitor } from '../domain/tracking-visitor';
import { TrackingVisitorId } from '../domain/value-objects/tracking-visitor-id';
import { InjectRepository } from '@nestjs/typeorm';
import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { Repository } from 'typeorm';
import { TrackingVisitorMapper } from './tracking-visitor.mapper';

@Injectable()
export class TrackingVisitorService implements ITrackingVisitorRepository {
  private readonly logger = new Logger(TrackingVisitorService.name);
  constructor(
    @InjectRepository(TrackingVisitorEntity)
    private readonly trackingVisitorRepository: Repository<TrackingVisitorEntity>,
  ) {}

  async findOne(id: TrackingVisitorId): Promise<TrackingVisitor | null> {
    // Busca un visitante por su ID
    const entity = await this.trackingVisitorRepository.findOne({
      where: { id: id.value },
    });
    if (!entity) return null;
    return TrackingVisitorMapper.toDomain(entity);
  }

  private isFilterGroup(
    filter: Filter<TrackingVisitor> | FilterGroup<TrackingVisitor>,
  ): filter is FilterGroup<TrackingVisitor> {
    return (
      (filter as FilterGroup<TrackingVisitor>).filters !== undefined &&
      (filter as FilterGroup<TrackingVisitor>).operator !== undefined
    );
  }

  private isFilter(
    filter: Filter<TrackingVisitor> | FilterGroup<TrackingVisitor>,
  ): filter is Filter<TrackingVisitor> {
    return (
      (filter as Filter<TrackingVisitor>).field !== undefined &&
      (filter as Filter<TrackingVisitor>).operator !== undefined
    );
  }

  async matcher(
    criteria: Criteria<TrackingVisitor>,
  ): Promise<TrackingVisitor[]> {
    // Construye la consulta usando QueryBuilder para soportar filtros, ordenamientos y paginación por cursor
    const qb = this.trackingVisitorRepository.createQueryBuilder('visitor');

    // Función auxiliar para mapear campos de dominio a columnas de la entidad
    const mapField = (field: keyof TrackingVisitor): string => {
      // Mapea los campos de dominio a los nombres de columna en la entidad
      const fieldMap: Record<string, string> = {
        id: 'visitor.id',
        name: 'visitor.visitorName',
        ultimateConnectionDate: 'visitor.ultimateConnectionDate',
        isConnected: 'visitor.isConnected',
        createdAt: 'visitor.createdAt',
        updatedAt: 'visitor.updatedAt',
        lastVisitedUrl: 'visitor.lastVisitedUrl',
        lastVisitedAt: 'visitor.lastVisitedAt',
        pageViews: 'visitor.pageViews',
        sessionDurationSeconds: 'visitor.sessionDurationSeconds',
      };
      return fieldMap[field as string] || `visitor.${field as string}`;
    };

    // Función recursiva para aplicar filtros y grupos de filtros
    const applyFilters = (
      filters: (Filter<TrackingVisitor> | FilterGroup<TrackingVisitor>)[],
      parentType: 'AND' | 'OR' = 'AND',
    ) => {
      const expressions: string[] = [];
      const parameters: Record<string, unknown> = {};
      let paramIndex = 0;
      for (const filter of filters) {
        if (this.isFilterGroup(filter)) {
          // Es un grupo de filtros
          const { expr, params } = applyFilters(
            filter.filters,
            filter.operator,
          );
          if (expr) expressions.push(`(${expr})`);
          Object.assign(parameters, params);
        } else if (this.isFilter(filter)) {
          // Es un filtro simple
          const column = mapField(filter.field);
          const paramName = `param${paramIndex++}`;
          let expr = '';
          switch (filter.operator as string) {
            case 'IS NULL':
              expr = `${column} IS NULL`;
              break;
            case 'IS NOT NULL':
              expr = `${column} IS NOT NULL`;
              break;
            case 'IN':
            case 'NOT IN':
              expr = `${column} ${filter.operator} (:...${paramName})`;
              parameters[paramName] = filter.value;
              break;
            default:
              expr = `${column} ${filter.operator} :${paramName}`;
              parameters[paramName] = filter.value;
          }
          expressions.push(expr);
        }
      }
      return {
        expr: expressions.join(` ${parentType} `),
        params: parameters,
      };
    };

    // Aplica los filtros definidos en Criteria
    if (criteria.filters && criteria.filters.length > 0) {
      const { expr, params } = applyFilters(criteria.filters);
      if (expr) qb.andWhere(expr, params);
    }

    // Aplica ordenamientos (ahora soporta múltiples orderBy)
    if (criteria.orderBy) {
      const orderBys = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      for (const order of orderBys) {
        qb.addOrderBy(mapField(order.field), order.direction);
      }
    }

    // Aplica paginación basada en cursor si está definido
    if (criteria.cursor) {
      // Soporta múltiples cursores: cada uno debe tener field y value
      const cursors = Array.isArray(criteria.cursor)
        ? criteria.cursor
        : [criteria.cursor];
      const orderBys = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      // Construye condición para paginación por cursor (soporta ASC/DESC y múltiples columnas)
      const cursorExprs: string[] = [];
      const cursorParams: Record<string, unknown> = {};
      cursors.forEach((cursor, idx) => {
        // Validación: el cursor debe tener field y value
        if (!cursor.field || typeof cursor.field !== 'string') return;
        const order = orderBys[idx] || orderBys[0];
        if (!order) return;
        const column = mapField(cursor.field as keyof TrackingVisitor);
        const paramName = `cursorParam${idx}`;
        const op = order.direction === 'ASC' ? '>' : '<';
        cursorExprs.push(`${column} ${op} :${paramName}`);
        cursorParams[paramName] = cursor.value;
      });
      if (cursorExprs.length > 0) {
        qb.andWhere(cursorExprs.join(' AND '), cursorParams);
      }
    }

    // Aplica limit y offset si están definidos
    if (typeof criteria.limit === 'number') {
      qb.limit(criteria.limit);
    }
    if (typeof criteria.offset === 'number') {
      qb.offset(criteria.offset);
    }

    // Ejecuta la consulta y mapea los resultados a dominio
    const entities = await qb.getMany();
    console.log(
      `Executing query: ${qb.getQuery()} with parameters: ${JSON.stringify(
        qb.getParameters(),
      )}`,
    );
    console.log(`Found ${entities.length} visitors`);
    console.log(`Visitors: ${JSON.stringify(entities, null, 2)}`);
    return entities.map((entity) => TrackingVisitorMapper.toDomain(entity));
  }

  async save(trackingVisitor: TrackingVisitor): Promise<void> {
    await this.trackingVisitorRepository.save(
      TrackingVisitorMapper.toEntity(trackingVisitor),
    );
  }
}
