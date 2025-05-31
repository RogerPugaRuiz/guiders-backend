import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { OnVisitorAccountCreatedEventHandler } from '../on-visitor-account-created.event-handler';
import { VisitorAccountCreatedEvent } from '../../../../auth/auth-visitor/domain/events/visitor-account-created.event';
import { CreateDefaultVisitorCommand } from '../../commands/create-default-visitor.command';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('OnVisitorAccountCreatedEventHandler', () => {
  let handler: OnVisitorAccountCreatedEventHandler;
  let commandBus: CommandBus;

  beforeEach(async () => {
    // Mock para el CommandBus
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnVisitorAccountCreatedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<OnVisitorAccountCreatedEventHandler>(
      OnVisitorAccountCreatedEventHandler,
    );
    commandBus = module.get<CommandBus>(CommandBus);

    // Reset de los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should dispatch CreateDefaultVisitorCommand when handling VisitorAccountCreatedEvent', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const event = new VisitorAccountCreatedEvent({
      id: visitorAccountId,
      clientID: 1,
      userAgent: 'test-user-agent',
      createdAt: new Date(),
      apiKey: 'test-api-key',
      lastLoginAt: null,
    });

    // Act
    await handler.handle(event);

    // Assert

    expect(commandBus.execute).toHaveBeenCalledTimes(1);

    // Verificar que se ejecuta el comando correcto con el ID de la cuenta
    const commandArg = (commandBus.execute as jest.Mock).mock.calls[0][0];
    expect(commandArg).toBeInstanceOf(CreateDefaultVisitorCommand);
    expect(commandArg.visitorAccountId).toBe(visitorAccountId);
  });

  it('should handle errors without crashing', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const event = new VisitorAccountCreatedEvent({
      id: visitorAccountId,
      clientID: 1,
      userAgent: 'test-user-agent',
      createdAt: new Date(),
      apiKey: 'test-api-key',
      lastLoginAt: null,
    });

    // Simular un error en el command bus
    (commandBus.execute as jest.Mock).mockRejectedValue(
      new Error('Test error'),
    );

    // Act & Assert - no debería lanzar excepción
    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
