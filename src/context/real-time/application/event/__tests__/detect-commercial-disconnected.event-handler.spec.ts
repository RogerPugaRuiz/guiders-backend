import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { DetectCommercialDisconnectedEventHandler } from '../detect-commercial-disconnected.event-handler';
import { DisconnectedEvent } from '../../../domain/events/disconnected.event';
import { CommercialDisconnectedEvent } from '../../../domain/events/commercial-disconnected.event';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { ConnectionUserPrimitive } from '../../../domain/connection-user';

describe('DetectCommercialDisconnectedEventHandler', () => {
  let handler: DetectCommercialDisconnectedEventHandler;
  let eventBus: EventBus;

  beforeEach(async () => {
    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DetectCommercialDisconnectedEventHandler,
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<DetectCommercialDisconnectedEventHandler>(
      DetectCommercialDisconnectedEventHandler,
    );
    eventBus = module.get<EventBus>(EventBus);
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe publicar evento cuando un comercial se desconecta', () => {
      // Arrange
      const userId = 'commercial-id';
      const socketId = 'socket-123';
      const connectionData: ConnectionUserPrimitive = {
        userId,
        roles: [ConnectionRole.COMMERCIAL, ConnectionRole.VISITOR],
        socketId,
      };
      const event = new DisconnectedEvent(connectionData);

      // Espía para el método publish
      const publishSpy = jest.spyOn(eventBus, 'publish');

      // Act
      handler.handle(event);

      // Assert
      expect(publishSpy).toHaveBeenCalledTimes(1);

      // Verificamos que se llamó con un evento del tipo correcto
      const calledWithEvent = publishSpy.mock.calls[0][0];
      expect(calledWithEvent).toBeInstanceOf(CommercialDisconnectedEvent);

      // Verificar propiedades específicas
      const commercialEvent = calledWithEvent as CommercialDisconnectedEvent;
      expect(commercialEvent.connection.userId).toBe(userId);
      expect(commercialEvent.connection.socketId).toBe(socketId);
    });

    it('no debe publicar ningún evento si el usuario no es comercial', () => {
      // Arrange
      const visitorData: ConnectionUserPrimitive = {
        userId: 'visitor-id',
        roles: [ConnectionRole.VISITOR],
        socketId: 'socket-123',
      };
      const event = new DisconnectedEvent(visitorData);

      // Espía para el método publish
      const publishSpy = jest.spyOn(eventBus, 'publish');

      // Act
      handler.handle(event);

      // Assert
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('debe manejar correctamente cuando la lista de comerciales está vacía', () => {
      // Este caso de prueba no aplica directamente a este handler,
      // ya que este solo detecta si un usuario desconectado es comercial o no,
      // pero lo incluimos para mantener la cobertura similar al test original
      const emptyRoles: ConnectionUserPrimitive = {
        userId: 'some-id',
        roles: [],
        socketId: 'socket-123',
      };
      const event = new DisconnectedEvent(emptyRoles);

      // Espía para el método publish
      const publishSpy = jest.spyOn(eventBus, 'publish');

      // Act
      handler.handle(event);

      // Assert
      expect(publishSpy).not.toHaveBeenCalled();
    });
  });
});
