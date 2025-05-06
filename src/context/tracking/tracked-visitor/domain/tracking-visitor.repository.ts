import { Criteria } from 'src/context/shared/domain/criteria';
import { TrackingVisitor } from './tracking-visitor';
import { TrackingVisitorId } from './value-objects/tracking-visitor-id';

export const TRACKING_VISITOR_REPOSITORY = Symbol('TrackingVisitorRepository');

export interface ITrackingVisitorRepository {
  matcher(criteria: Criteria<TrackingVisitor>): Promise<TrackingVisitor[]>;
  findOne(id: TrackingVisitorId): Promise<TrackingVisitor | null>;
  save(trackingVisitor: TrackingVisitor): Promise<void>;
  total(criteria: Criteria<TrackingVisitor>): Promise<number>;
}
