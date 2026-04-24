import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { IntegrationController } from '../integration.controller';
import { CHAT_V2_REPOSITORY } from 'src/context/conversations-v2/domain/chat.repository';
import { MESSAGE_V2_REPOSITORY } from 'src/context/conversations-v2/domain/message.repository';
import { ok, err, okVoid } from 'src/context/shared/domain/result';
import { Chat } from 'src/context/conversations-v2/domain/entities/chat.aggregate';
import { Message } from 'src/context/conversations-v2/domain/entities/message.aggregate';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { RepositoryError } from 'src/context/shared/domain/errors/repository.error';
import { CreateIntegrationConversationDto } from '../dtos/create-integration-conversation.dto';
import { SendIntegrationMessageDto } from '../dtos/send-integration-message.dto';
import {
  IntegrationApiKeyGuard,
  IntegrationApiKeyRequest,
} from 'src/context/auth/integration-api-key/infrastructure/integration-api-key.guard';

/**
 * Crea un mock de IntegrationApiKeyRequest con companyId y environment dados.
 */
function makeRequest(
  companyId: string,
  environment = 'live',
): IntegrationApiKeyRequest {
  return {
    integrationApiKey: { id: Uuid.random().value, companyId, environment },
  } as unknown as IntegrationApiKeyRequest;
}

describe('IntegrationController', () => {
  let controller: IntegrationController;
  let chatRepo: jest.Mocked<any>;
  let messageRepo: jest.Mocked<any>;
  let publisher: jest.Mocked<any>;

  beforeEach(async () => {
    chatRepo = {
      findActiveByVisitorAndCompany: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    };
    messageRepo = {
      save: jest.fn(),
      findByChatId: jest.fn(),
    };
    // mergeObjectContext devuelve el mismo aggregate con commit() mockeado
    publisher = {
      mergeObjectContext: jest
        .fn()
        .mockImplementation((aggregate: Record<string, unknown>) => {
          aggregate['commit'] = jest.fn();
          return aggregate;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationController],
      providers: [
        { provide: CHAT_V2_REPOSITORY, useValue: chatRepo },
        { provide: MESSAGE_V2_REPOSITORY, useValue: messageRepo },
        { provide: EventPublisher, useValue: publisher },
      ],
    })
      .overrideGuard(IntegrationApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IntegrationController);
  });

  describe('createConversation', () => {
    const companyId = Uuid.random().value;
    const visitorId = Uuid.random().value;
    const dto: CreateIntegrationConversationDto = {
      visitorId,
      message: 'Hola, necesito ayuda',
    };

    it('debe crear una conversación y devolver el conversationId', async () => {
      chatRepo.findActiveByVisitorAndCompany.mockResolvedValue(ok(null));
      chatRepo.save.mockResolvedValue(okVoid());
      messageRepo.save.mockResolvedValue(okVoid());

      const result = await controller.createConversation(
        makeRequest(companyId),
        dto,
      );

      expect(result.conversationId).toBeDefined();
      expect(result.companyId).toBe(companyId);
      expect(result.visitorId).toBe(visitorId);
      expect(chatRepo.save).toHaveBeenCalledTimes(1);
      expect(messageRepo.save).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar ConflictException si ya existe conversación activa', async () => {
      const existingChat = Chat.createPendingChat({
        visitorId,
        companyId,
        channel: 'chat',
        visitorInfo: {},
        availableCommercialIds: [],
        metadata: { department: 'general', source: 'test' },
      });
      chatRepo.findActiveByVisitorAndCompany.mockResolvedValue(
        ok(existingChat),
      );

      await expect(
        controller.createConversation(makeRequest(companyId), dto),
      ).rejects.toThrow(ConflictException);
    });

    it('debe propagar error si el repositorio falla al guardar', async () => {
      chatRepo.findActiveByVisitorAndCompany.mockResolvedValue(ok(null));
      chatRepo.save.mockResolvedValue(
        err(new RepositoryError('error de base de datos')),
      );

      await expect(
        controller.createConversation(makeRequest(companyId), dto),
      ).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    const companyId = Uuid.random().value;
    const visitorId = Uuid.random().value;
    const dto: SendIntegrationMessageDto = { content: 'Mensaje de respuesta' };

    it('debe enviar un mensaje y devolver el messageId', async () => {
      const chat = Chat.createPendingChat({
        visitorId,
        companyId,
        channel: 'chat',
        visitorInfo: {},
        availableCommercialIds: [],
        metadata: { department: 'general', source: 'test' },
      });
      chatRepo.findById.mockResolvedValue(ok(chat));
      messageRepo.save.mockResolvedValue(okVoid());

      const result = await controller.sendMessage(
        makeRequest(companyId),
        chat.id.getValue(),
        dto,
      );

      expect(result.messageId).toBeDefined();
      expect(result.content).toBe(dto.content);
      expect(messageRepo.save).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar NotFoundException si la conversación no existe', async () => {
      chatRepo.findById.mockResolvedValue(
        err(new RepositoryError('no encontrado')),
      );

      await expect(
        controller.sendMessage(
          makeRequest(companyId),
          Uuid.random().value,
          dto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si la conversación es de otra empresa', async () => {
      const otherCompanyId = Uuid.random().value;
      const chat = Chat.createPendingChat({
        visitorId,
        companyId: otherCompanyId,
        channel: 'chat',
        visitorInfo: {},
        availableCommercialIds: [],
        metadata: { department: 'general', source: 'test' },
      });
      chatRepo.findById.mockResolvedValue(ok(chat));

      await expect(
        controller.sendMessage(makeRequest(companyId), chat.id.getValue(), dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getConversation', () => {
    const companyId = Uuid.random().value;
    const visitorId = Uuid.random().value;

    it('debe devolver los datos de la conversación', async () => {
      const chat = Chat.createPendingChat({
        visitorId,
        companyId,
        channel: 'chat',
        visitorInfo: {},
        availableCommercialIds: [],
        metadata: { department: 'general', source: 'test' },
      });
      chatRepo.findById.mockResolvedValue(ok(chat));

      const result = await controller.getConversation(
        makeRequest(companyId),
        chat.id.getValue(),
      );

      expect(result.conversationId).toBe(chat.id.getValue());
      expect(result.companyId).toBe(companyId);
      expect(result.messages).toBeUndefined();
    });

    it('debe incluir mensajes si includeMessages=true', async () => {
      const chat = Chat.createPendingChat({
        visitorId,
        companyId,
        channel: 'chat',
        visitorInfo: {},
        availableCommercialIds: [],
        metadata: { department: 'general', source: 'test' },
      });
      chatRepo.findById.mockResolvedValue(ok(chat));
      const msg = Message.createTextMessage({
        chatId: chat.id.getValue(),
        senderId: visitorId,
        content: 'hola',
      });
      messageRepo.findByChatId.mockResolvedValue(
        ok({ messages: [msg], total: 1, hasMore: false }),
      );

      const result = await controller.getConversation(
        makeRequest(companyId),
        chat.id.getValue(),
        'true',
      );

      expect(result.messages).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('debe lanzar ForbiddenException si la conversación es de otra empresa', async () => {
      const chat = Chat.createPendingChat({
        visitorId,
        companyId: Uuid.random().value,
        channel: 'chat',
        visitorInfo: {},
        availableCommercialIds: [],
        metadata: { department: 'general', source: 'test' },
      });
      chatRepo.findById.mockResolvedValue(ok(chat));

      await expect(
        controller.getConversation(makeRequest(companyId), chat.id.getValue()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si la conversación no existe', async () => {
      chatRepo.findById.mockResolvedValue(
        err(new RepositoryError('no encontrado')),
      );

      await expect(
        controller.getConversation(makeRequest(companyId), Uuid.random().value),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
