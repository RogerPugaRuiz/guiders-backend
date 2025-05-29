import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { QueryBus } from '@nestjs/cqrs';
import { ChatNotFoundError } from '../../chat/domain/chat/errors/errors';
import { ChatResponseDto } from '../../chat/application/dtos/chat-response.dto';
import { ChatIdsResponseDto } from '../../chat/application/dtos/chat-ids-response.dto';
import { ok, err } from 'src/context/shared/domain/result';
import { ChatPrimitives } from '../../chat/domain/chat/chat';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthenticatedRequest } from 'src/context/shared/infrastructure/guards/auth.guard';

// Mock para AuthGuard y RolesGuard
jest.mock('src/context/shared/infrastructure/guards/auth.guard', () => ({
  AuthGuard: jest.fn(() => true),
}));
jest.mock('src/context/shared/infrastructure/guards/role.guard', () => ({
  RolesGuard: jest.fn(() => true),
  RequiredRoles: () => () => {},
}));

describe('ChatController', () => {
  let controller: ChatController;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ChatService,
          useValue: { startChat: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  describe('getChatById', () => {
    it('debe devolver el chat serializado si existe', async () => {
      // Arrange
      const chatId = 'chat-uuid';
      const chat: ChatPrimitives = {
        id: chatId,
        participants: [],
        status: 'active',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };
      jest
        .spyOn(queryBus, 'execute')
        .mockResolvedValue(
          ok<{ chat: ChatPrimitives }, ChatNotFoundError>({ chat }),
        );

      // Act
      const result = await controller.getChatById(chatId);

      // Assert
      expect(result).toBeInstanceOf(ChatResponseDto);
      expect(result.id).toBe(chatId);
    });

    it('debe lanzar 404 si el chat no existe', async () => {
      // Arrange
      const chatId = 'chat-uuid';
      jest
        .spyOn(queryBus, 'execute')
        .mockResolvedValue(
          err<{ chat: ChatPrimitives }, ChatNotFoundError>(
            new ChatNotFoundError(),
          ),
        );

      // Act & Assert
      await expect(controller.getChatById(chatId)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.getChatById(chatId)).rejects.toThrow(
        'Chat not found',
      );
      await expect(controller.getChatById(chatId)).rejects.toHaveProperty(
        'status',
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('getChatIds', () => {
    it('debe devolver lista de IDs de chats del usuario autenticado', async () => {
      // Arrange
      const userId = 'user-123';
      const req: AuthenticatedRequest = {
        user: {
          id: userId,
          roles: ['commercial'],
          username: 'test-user',
        },
      } as AuthenticatedRequest;

      const chats: ChatPrimitives[] = [
        {
          id: 'chat-1',
          participants: [],
          status: 'active',
          lastMessage: null,
          lastMessageAt: null,
          createdAt: new Date(),
        },
        {
          id: 'chat-2',
          participants: [],
          status: 'active',
          lastMessage: null,
          lastMessageAt: null,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(queryBus, 'execute').mockResolvedValue({ chats });

      // Act
      const result = await controller.getChatIds(req);

      // Assert
      expect(result).toBeInstanceOf(ChatIdsResponseDto);
      expect(result.chatIds).toEqual(['chat-1', 'chat-2']);
    });

    it('debe devolver lista vacía si el usuario no tiene chats', async () => {
      // Arrange
      const userId = 'user-123';
      const req: AuthenticatedRequest = {
        user: {
          id: userId,
          roles: ['commercial'],
          username: 'test-user',
        },
      } as AuthenticatedRequest;

      jest.spyOn(queryBus, 'execute').mockResolvedValue({ chats: [] });

      // Act
      const result = await controller.getChatIds(req);

      // Assert
      expect(result).toBeInstanceOf(ChatIdsResponseDto);
      expect(result.chatIds).toEqual([]);
    });
  });
});
