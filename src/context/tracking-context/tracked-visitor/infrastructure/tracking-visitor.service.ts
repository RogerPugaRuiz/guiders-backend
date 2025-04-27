import { Injectable } from '@nestjs/common';
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
    // Convierte los criterios a SQL usando CriteriaConverter
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'tracking_visitor',
      {
        id: 'id',
        name: 'name',
        currentUrl: 'current_url',
        connectionDuration: 'connection_duration',
        ultimateConnectionDate: 'ultimate_connection_date',
        isConnected: 'is_connected',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        lastVisitedUrl: 'last_visited_url',
        lastVisitedAt: 'last_visited_at',
        pageViews: 'page_views',
        sessionDurationSeconds: 'session_duration_seconds',
      },
    );
    // Ejecuta la consulta SQL nativa
    // Define el tipo esperado para los resultados de la consulta
    const entities = await this.trackingVisitorRepository
      .createQueryBuilder('tracking_visitor')
      .where(sql.replace(/^WHERE /, '')) // Elimina el WHERE inicial porque TypeORM lo agrega
      .setParameters(parameters)
      .getMany();
    // Mapea los resultados a entidades de dominio
    return entities.map((entity: TrackingVisitorEntity) =>
      TrackingVisitorMapper.toDomain(entity),
    );
  }

  async save(trackingVisitor: TrackingVisitor): Promise<void> {
    await this.trackingVisitorRepository.save(
      TrackingVisitorMapper.toEntity(trackingVisitor),
    );
  }
}
