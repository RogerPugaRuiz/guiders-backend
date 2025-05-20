import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTrackingEventCommandHandler } from '../process-tracking-event-command.handler';
import { ProcessTrackingEventCommand } from '../process-tracking-event.command';
import { BasicIntentDetector } from 'src/context/tracking/domain/basic-intent-detector';
import { INTENT_DETECTOR_REPOSITORY } from 'src/context/tracking/domain/intent-detector.repository';
import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Mock para el repositorio
const mockIntentRepository = {
  save: jest.fn(),
};

// Mock para el detector
const mockIntentDetector = {
  detect: jest.fn(),
};

describe('ProcessTrackingEventCommandHandler', () => {
  let handler: ProcessTrackingEventCommandHandler;
  let intentRepository: typeof mockIntentRepository;
  let intentDetector: typeof mockIntentDetector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessTrackingEventCommandHandler,
        { provide: BasicIntentDetector, useValue: mockIntentDetector },
        { provide: INTENT_DETECTOR_REPOSITORY, useValue: mockIntentRepository },
      ],
    }).compile();

    handler = module.get(ProcessTrackingEventCommandHandler);
    intentRepository = module.get(INTENT_DETECTOR_REPOSITORY);
    intentDetector = module.get(BasicIntentDetector);
    jest.clearAllMocks();
  });

  it('debe guardar la intención detectada si existe', async () => {
    // Usar la clase Uuid para generar un UUID válido
    const visitorId = Uuid.generate();
    const trackingEvents = [
      {
        id: Uuid.generate(), // Usar Uuid para el id del evento de tracking
        visitorId,
        eventType: 'PRODUCT_VIEW',
        metadata: { productId: 'p1', durationSeconds: 40 },
        occurredAt: new Date(), // Pasar un Date real, no string
      },
    ];
    const command = new ProcessTrackingEventCommand(visitorId, trackingEvents);
    const fakeIntent = { id: 'intent-1' } as unknown as VisitorIntent;
    intentDetector.detect.mockReturnValue(fakeIntent);
    intentRepository.save.mockResolvedValue(undefined);

    await handler.execute(command);

    expect(intentDetector.detect).toHaveBeenCalled();
    expect(intentRepository.save).toHaveBeenCalledWith(fakeIntent);
  });

  it('no debe guardar si no se detecta intención', async () => {
    // Usar la clase Uuid para generar un UUID válido
    const visitorId = Uuid.generate();
    const trackingEvents = [];
    const command = new ProcessTrackingEventCommand(visitorId, trackingEvents);
    intentDetector.detect.mockReturnValue(null);

    await handler.execute(command);

    expect(intentDetector.detect).toHaveBeenCalled();
    expect(intentRepository.save).not.toHaveBeenCalled();
  });
});
