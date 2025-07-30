import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { MessageV2Controller } from '../controllers/message-v2.controller';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';

describe('MessageV2Controller', () => {
  let controller: MessageV2Controller;

  const mockUser = {
    id: 'user-123',
    roles: ['commercial'],
    sub: 'user-123',
  };

  const mockRequest = {
    user: mockUser,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageV2Controller],
      providers: [
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MessageV2Controller>(MessageV2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should throw NOT_IMPLEMENTED error (temporary behavior)', () => {
      const sendMessageDto = {
        chatId: 'chat-123',
        content: 'Test message',
        type: 'text',
        isInternal: false,
      };

      expect(() => controller.sendMessage(sendMessageDto, mockRequest)).toThrow(
        new HttpException(
          'Funcionalidad no implementada',
          HttpStatus.NOT_IMPLEMENTED,
        ),
      );
    });
  });

  describe('getChatMessages', () => {
    it('should return empty message list (temporary behavior)', async () => {
      const queryParams = {
        cursor: undefined,
        limit: 50,
        filters: undefined,
        sort: undefined,
      };

      const result = await controller.getChatMessages(
        'chat-123',
        queryParams,
        mockRequest,
      );

      expect(result).toEqual({
        messages: [],
        total: 0,
        hasMore: false,
        nextCursor: undefined,
      });
    });
  });

  describe('getMessageById', () => {
    it('should throw NOT_FOUND error (temporary behavior)', () => {
      expect(() =>
        controller.getMessageById('message-123', mockRequest),
      ).toThrow(
        new HttpException('Mensaje no encontrado', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('markAsRead', () => {
    it('should return success response (temporary behavior)', async () => {
      const markAsReadDto = {
        messageIds: ['msg-1', 'msg-2'],
      };

      const result = await controller.markAsRead(markAsReadDto, mockRequest);

      expect(result).toEqual({
        success: true,
        markedCount: 2,
      });
    });
  });

  describe('getUnreadMessages', () => {
    it('should return empty array (temporary behavior)', async () => {
      const result = await controller.getUnreadMessages(
        'chat-123',
        mockRequest,
      );

      expect(result).toEqual([]);
    });
  });

  describe('searchMessages', () => {
    it('should return empty search results (temporary behavior)', async () => {
      const result = await controller.searchMessages('test keyword');

      expect(result).toEqual({
        messages: [],
        total: 0,
        hasMore: false,
        nextCursor: undefined,
      });
    });
  });

  describe('getConversationStats', () => {
    it('should return empty stats (temporary behavior)', async () => {
      const result = await controller.getConversationStats('chat-123');

      expect(result).toEqual({
        totalMessages: 0,
        messagesByType: {},
        averageResponseTime: 0,
        unreadCount: 0,
        lastActivity: expect.any(String),
        participantCount: 0,
      });
    });
  });

  describe('getMessageMetrics', () => {
    it('should return sample metrics (temporary behavior)', async () => {
      const result = await controller.getMessageMetrics(
        '2025-07-01T00:00:00Z',
        '2025-07-31T23:59:59Z',
        'day',
      );

      expect(result).toEqual([
        {
          period: '2025-07-28',
          totalMessages: 150,
          messagesByType: {
            text: 140,
            image: 8,
            file: 2,
          },
          averageLength: 85.3,
          responseTimeMinutes: 12.7,
        },
      ]);
    });
  });

  describe('getMessagesWithAttachments', () => {
    it('should return empty array (temporary behavior)', async () => {
      const result = await controller.getMessagesWithAttachments();

      expect(result).toEqual([]);
    });
  });
});
