import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorIntentDetailedQueryHandler } from '../get-visitor-intent-detailed-query.handler';
import { GetVisitorIntentDetailedQuery } from '../get-visitor-intent-detailed.query';
import {
  IIntentDetectorRepository,
  INTENT_DETECTOR_REPOSITORY,
} from '../../../domain/intent-detector.repository';
import { VisitorIntent } from '../../../domain/visitor-intent.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { IntentType } from '../../../domain/value-objects/intent-type';
import { IntentConfidence } from '../../../domain/value-objects/intent-confidence';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

describe('GetVisitorIntentDetailedQueryHandler', () => {
  let handler: GetVisitorIntentDetailedQueryHandler;
  let repository: jest.Mocked<IIntentDetectorRepository>;

  beforeEach(async () => {
    // Se define el mock del repositorio usando tipado seguro para evitar asignaciones inseguras
    repository = {
      findOne: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      match: jest.fn(),
    } as jest.Mocked<IIntentDetectorRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorIntentDetailedQueryHandler,
        { provide: INTENT_DETECTOR_REPOSITORY, useValue: repository },
      ],
    }).compile();

    handler = module.get(GetVisitorIntentDetailedQueryHandler);
  });

  it('debe retornar el DTO detallado si existe intención', async () => {
    const uuid = Uuid.random().value;
    const visitorId = Uuid.random().value;
    const intent = VisitorIntent.create({
      id: Uuid.create(uuid),
      visitorId: VisitorId.create(visitorId),
      type: new IntentType('PURCHASE'),
      confidence: new IntentConfidence('HIGH'),
      detectedAt: new Date(),
    });
    repository.findOne.mockResolvedValue(ok(intent));
    const query = new GetVisitorIntentDetailedQuery(visitorId);
    const result = await handler.execute(query);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap().visitorId).toBe(visitorId);
    }
  });

  it('debe propagar el error de dominio si no existe intención', async () => {
    const query = new GetVisitorIntentDetailedQuery(Uuid.random().value);
    class CustomDomainError extends DomainError {
      constructor() {
        super('not found');
      }
    }
    repository.findOne.mockResolvedValue(err(new CustomDomainError()));
    const result = await handler.execute(query);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('not found');
    }
  });
});
