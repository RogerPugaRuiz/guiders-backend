import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { OnVisitorAliasAssignedUpdateParticipantEventHandler } from '../on-visitor-alias-assigned-update-participant.event-handler';
import { VisitorAliasAssignedEvent } from '../../../domain/events/visitor-alias-assigned-event';
import { UpdateParticipantNameCommand } from 'src/context/conversations/chat/application/update/participants/name/update-participant-name.command';

describe('OnVisitorAliasAssignedUpdateParticipantEventHandler', () => {
  let handler: OnVisitorAliasAssignedUpdateParticipantEventHandler;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    // Creamos un mock del CommandBus
    mockCommandBus = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnVisitorAliasAssignedUpdateParticipantEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<OnVisitorAliasAssignedUpdateParticipantEventHandler>(
      OnVisitorAliasAssignedUpdateParticipantEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateParticipantNameCommand when alias is assigned to visitor', async () => {
      // Arrange
      const visitorId = 'visitor-123';
      const alias = 'Swift Eagle';
      const event = new VisitorAliasAssignedEvent({
        visitorId,
        alias,
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateParticipantNameCommand(visitorId, alias),
      );
    });

    it('should log the correct messages during successful execution', async () => {
      // Arrange
      const visitorId = 'visitor-456';
      const alias = 'Brave Lion';
      const event = new VisitorAliasAssignedEvent({
        visitorId,
        alias,
      });

      const logSpy = jest.spyOn(handler['logger'], 'log');
      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        `Evento de asignación de alias recibido para visitante: ${visitorId} con alias: ${alias}`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Actualizando nombre del participante con alias asignado: ${alias}`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Comando para actualizar nombre del participante enviado correctamente tras asignación de alias',
      );
    });

    it('should handle errors gracefully and log error message', async () => {
      // Arrange
      const visitorId = 'visitor-789';
      const alias = 'Clever Fox';
      const event = new VisitorAliasAssignedEvent({
        visitorId,
        alias,
      });

      const error = new Error('Command execution failed');
      const errorSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(error);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        'Error al manejar evento de asignación de alias para actualizar participante: Command execution failed',
      );
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const visitorId = 'visitor-999';
      const alias = 'Mysterious Cat';
      const event = new VisitorAliasAssignedEvent({
        visitorId,
        alias,
      });

      const errorSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue('Unknown error');

      // Act
      await handler.handle(event);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Error al manejar evento de asignación de alias para actualizar participante: Error desconocido',
      );
    });

    it('should work with different alias formats', async () => {
      // Arrange
      const testCases = [
        { visitorId: 'visitor-1', alias: 'Simple Wolf' },
        { visitorId: 'visitor-2', alias: 'Amazing Black Bear' },
        { visitorId: 'visitor-3', alias: 'Fast Red Falcon' },
      ];

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act & Assert
      for (const testCase of testCases) {
        const event = new VisitorAliasAssignedEvent({
          visitorId: testCase.visitorId,
          alias: testCase.alias,
        });

        await handler.handle(event);

        expect(mockCommandBus.execute).toHaveBeenCalledWith(
          new UpdateParticipantNameCommand(testCase.visitorId, testCase.alias),
        );
      }

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(testCases.length);
    });
  });
});
