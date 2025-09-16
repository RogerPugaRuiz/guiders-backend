import { Test, TestingModule } from '@nestjs/testing';
import { GetCurrentVisitorIntentQueryHandler } from '../get-current-visitor-intent-query.handler';
import { GetCurrentVisitorIntentQuery } from '../get-current-visitor-intent.query';
import { INTENT_DETECTOR_REPOSITORY } from 'src/context/tracking/domain/intent-detector.repository';
import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent.aggregate';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

const mockIntentRepository = {
  findOne: jest.fn(),
};

describe('GetCurrentVisitorIntentQueryHandler', () => {
  let handler: GetCurrentVisitorIntentQueryHandler;
  let intentRepository: typeof mockIntentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentVisitorIntentQueryHandler,
        { provide: INTENT_DETECTOR_REPOSITORY, useValue: mockIntentRepository },
      ],
    }).compile();

    handler = module.get(GetCurrentVisitorIntentQueryHandler);
    intentRepository = module.get(INTENT_DETECTOR_REPOSITORY);
    jest.clearAllMocks();
  });

  it('debe devolver la intención encontrada', async () => {
    // Usar la clase Uuid para generar un UUID válido
    const visitorId = Uuid.generate();
    const query = new GetCurrentVisitorIntentQuery(visitorId);
    const fakeIntent = { id: 'intent-1' } as unknown as VisitorIntent;
    intentRepository.findOne.mockResolvedValue(ok(fakeIntent));

    const result = await handler.execute(query);

    expect(intentRepository.findOne).toHaveBeenCalled();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(fakeIntent);
  });

  it('debe devolver un error si no se encuentra intención', async () => {
    // Usar la clase Uuid para generar un UUID válido
    const visitorId = Uuid.generate();
    const query = new GetCurrentVisitorIntentQuery(visitorId);
    const fakeError = new (class extends DomainError {
      constructor() {
        super('No encontrada');
      }
    })();
    intentRepository.findOne.mockResolvedValue(err(fakeError));

    const result = await handler.execute(query);

    expect(intentRepository.findOne).toHaveBeenCalled();
    expect(result.isErr()).toBe(true);
    expect(result.isOk()).toBe(false);
    // unwrap() siempre lanza el mensaje genérico
    expect(() => result.unwrap()).toThrow('No se puede desempaquetar un Err');
  });
});
