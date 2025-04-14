import { Injectable } from '@nestjs/common';
import { ITrackingVisitorRepository } from '../domain/tracking-visitor.repository';
import { Criteria } from 'src/context/shared/domain/criteria';
import { TrackingVisitor } from '../domain/tracking-visitor';
import { TrackingVisitorId } from '../domain/value-objects/tracking-visitor-id';
import { InjectRepository } from '@nestjs/typeorm';
import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { Repository } from 'typeorm';
import { TrackingVisitorMapper } from './tracking-visitor.mapper';

@Injectable()
export class TrackingVisitorService implements ITrackingVisitorRepository {
  constructor(
    @InjectRepository(TrackingVisitorEntity)
    private readonly trackingVisitorRepository: Repository<TrackingVisitorEntity>,
  ) {}

  findOne(id: TrackingVisitorId): Promise<TrackingVisitor | null> {
    throw new Error('Method not implemented.');
  }
  matcher(criteria: Criteria<TrackingVisitor>): Promise<TrackingVisitor[]> {
    throw new Error('Method not implemented.');
  }

  async save(trackingVisitor: TrackingVisitor): Promise<void> {
    await this.trackingVisitorRepository.save(
      TrackingVisitorMapper.toEntity(trackingVisitor),
    );
  }
}
