import { Injectable, Logger } from '@nestjs/common';
import { ITrackingVisitorRepository } from '../domain/tracking-visitor.repository';
import { Criteria } from 'src/context/shared/domain/criteria';
import { TrackingVisitor } from '../domain/tracking-visitor';
import { TrackingVisitorId } from '../domain/value-objects/tracking-visitor-id';
import { InjectRepository } from '@nestjs/typeorm';
import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { Repository } from 'typeorm';
import { TrackingVisitorMapper } from './tracking-visitor.mapper';
import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';

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

  async matcher(
    criteria: Criteria<TrackingVisitor>,
  ): Promise<TrackingVisitor[]> {
    // Convierte el objeto Criteria a SQL y parámetros usando CriteriaConverter
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'visitor',
    );

    console.log('SQL:', sql);
    console.log('Parameters:', parameters);

    // Extrae las partes WHERE, ORDER BY y LIMIT del SQL generado
    // Expresión regular mejorada para capturar correctamente la cláusula WHERE
    const whereMatch = sql.match(/WHERE (.*?)(ORDER BY|LIMIT|OFFSET|$)/s);
    const orderByMatch = sql.match(/ORDER BY ([^L]*)/);
    const limitMatch = sql.match(/LIMIT (\d+)/);
    const offsetMatch = sql.match(/OFFSET (\d+)/);

    const queryBuilder =
      this.trackingVisitorRepository.createQueryBuilder('visitor');

    // Aplica la condición WHERE si existe
    if (whereMatch) {
      queryBuilder.where(whereMatch[1].trim(), parameters);
    }
    // Aplica ORDER BY si existe
    if (orderByMatch) {
      const orderByParts = orderByMatch[1]
        .split(',')
        .map((part) => part.trim());
      orderByParts.forEach((orderBy) => {
        const [field, direction] = orderBy.split(' ');
        // field puede ser visitor.createdAt, visitor.id, etc.
        const [alias, column] = field.split('.');
        queryBuilder.addOrderBy(
          `${alias}.${column}`,
          (direction as 'ASC' | 'DESC') || 'DESC',
        );
      });
    }
    // Aplica LIMIT si existe
    if (limitMatch) {
      queryBuilder.limit(Number(limitMatch[1]));
    }
    // Aplica OFFSET si existe
    if (offsetMatch) {
      queryBuilder.offset(Number(offsetMatch[1]));
    }
    // Ejecuta la consulta y mapea los resultados a entidades de dominio
    const entities = await queryBuilder.getMany();
    console.log('Entities:', entities);
    return entities.map((entity) => TrackingVisitorMapper.toDomain(entity));
  }

  async save(trackingVisitor: TrackingVisitor): Promise<void> {
    await this.trackingVisitorRepository.save(
      TrackingVisitorMapper.toEntity(trackingVisitor),
    );
  }

  async total(criteria: Criteria<TrackingVisitor>): Promise<number> {
    console.log('Total criteria:', criteria);
    // Convierte el objeto Criteria a SQL y parámetros usando CriteriaConverter
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'visitor',
    );

    // Extrae la cláusula WHERE del SQL generado
    const whereMatch = sql.match(/WHERE (.*?)(ORDER BY|LIMIT|OFFSET|$)/s);

    const queryBuilder =
      this.trackingVisitorRepository.createQueryBuilder('visitor');

    // Aplica la condición WHERE si existe
    if (whereMatch) {
      queryBuilder.where(whereMatch[1].trim(), parameters);
    }

    // Ejecuta la consulta y cuenta los resultados
    return await queryBuilder.getCount();
  }
}
