import { Test, TestingModule } from '@nestjs/testing';
import { RecalculateAssignmentOnCommercialConnectedEventHandler } from '../recalculate-assignment-on-commercial-connected.event-handler';
import { CommercialConnectedEvent } from '../../../domain/events/commercial-connected.event';
import { CommercialAssignmentService } from '../../../domain/commercial-assignment.service';
import { EventBus } from '@nestjs/cqrs';
import { CHAT_REPOSITORY } from '../../../../conversations/chat/domain/chat/chat.repository';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { ConnectionUser } from '../../../domain/connection-user';
import { ConnectionUserId } from '../../../domain/value-objects/connection-user-id';
import { ConnectionSocketId } from '../../../domain/value-objects/connection-socket-id';
import { ConnectionCompanyId } from '../../../domain/value-objects/connection-company-id';
import { Status } from '../../../../conversations/chat/domain/chat/value-objects/status';
import { ChatCommercialsAssignedEvent } from '../../../domain/events/chat-commercials-assigned.event';
import { Chat } from '../../../../conversations/chat/domain/chat/chat';

describe('RecalculateAssignmentOnCommercialConnectedEventHandler', () => {
  let handler: RecalculateAssignmentOnCommercialConnectedEventHandler;
  let mockCommercialAssignmentService: {
    getConnectedCommercials: jest.Mock;
  };
  let mockEventBus: {
    publish: jest.Mock;
  };
  let mockChatRepository: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockCommercialAssignmentService = {
      getConnectedCommercials: jest.fn(),
    };
    mockEventBus = {
      publish: jest.fn(),
    };
    mockChatRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecalculateAssignmentOnCommercialConnectedEventHandler,
        {
          provide: CommercialAssignmentService,
          useValue: mockCommercialAssignmentService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
        },
      ],
    }).compile();

    handler =
      module.get<RecalculateAssignmentOnCommercialConnectedEventHandler>(
        RecalculateAssignmentOnCommercialConnectedEventHandler,
      );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should ignore if user is not a commercial', async () => {
      // Arrange
      const event = new CommercialConnectedEvent({
        userId: 'user-1',
        roles: ['visitor'],
        socketId: 'socket-1',
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).not.toHaveBeenCalled();
      expect(
        mockCommercialAssignmentService.getConnectedCommercials,
      ).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should do nothing if no pending chats found', async () => {
      // Arrange
      const event = new CommercialConnectedEvent({
        userId: 'user-1',
        roles: ['commercial'],
        socketId: 'socket-1',
      });

      mockChatRepository.find.mockResolvedValue({ chats: [] });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      expect(
        mockCommercialAssignmentService.getConnectedCommercials,
      ).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should do nothing if no connected commercials found', async () => {
      // Arrange
      const event = new CommercialConnectedEvent({
        userId: 'user-1',
        roles: ['commercial'],
        socketId: 'socket-1',
      });

      const mockChat = createMockChat('chat-1');
      mockChatRepository.find.mockResolvedValue({ chats: [mockChat] });
      mockCommercialAssignmentService.getConnectedCommercials.mockResolvedValue(
        [],
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      expect(
        mockCommercialAssignmentService.getConnectedCommercials,
      ).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should publish ChatCommercialsAssignedEvent for each pending chat', async () => {
      // Arrange
      const event = new CommercialConnectedEvent({
        userId: 'user-1',
        roles: ['commercial'],
        socketId: 'socket-1',
      });

      const mockChat1 = createMockChat('chat-1');
      const mockChat2 = createMockChat('chat-2');

      mockChatRepository.find.mockResolvedValue({
        chats: [mockChat1, mockChat2],
      });

      const connectedCommercial = createMockConnectionUser('user-1', true);
      mockCommercialAssignmentService.getConnectedCommercials.mockResolvedValue(
        [connectedCommercial],
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      expect(
        mockCommercialAssignmentService.getConnectedCommercials,
      ).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);

      // Verificar que se publicó el evento con los datos correctos para cada chat
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(ChatCommercialsAssignedEvent),
      );

      // Verificar los eventos publicados
      type PublishCall = [ChatCommercialsAssignedEvent];
      const calls = mockEventBus.publish.mock.calls as PublishCall[];
      const firstCall = calls[0][0];
      const secondCall = calls[1][0];

      expect(firstCall).toBeInstanceOf(ChatCommercialsAssignedEvent);
      expect(firstCall).toHaveProperty('chatId', 'chat-1');
      expect(firstCall).toHaveProperty('commercialIds', ['user-1']);

      expect(secondCall).toBeInstanceOf(ChatCommercialsAssignedEvent);
      expect(secondCall).toHaveProperty('chatId', 'chat-2');
      expect(secondCall).toHaveProperty('commercialIds', ['user-1']);
    });
  });
});

// Función auxiliar para crear mocks de ConnectionUser
function createMockConnectionUser(
  userId: string,
  isConnected: boolean,
): ConnectionUser {
  const connection = ConnectionUser.create({
    userId: new ConnectionUserId(userId),
    roles: [new ConnectionRole('commercial')],
    companyId: ConnectionCompanyId.create(
      '550e8400-e29b-41d4-a716-446655440000',
    ),
  });

  if (isConnected) {
    return connection.connect(new ConnectionSocketId('socket-' + userId));
  }

  return connection;
}

// Función auxiliar para crear mocks de Chat
function createMockChat(chatId: string): Chat {
  return {
    id: {
      value: chatId,
    },
    status: Status.PENDING,
  } as unknown as Chat;
}
