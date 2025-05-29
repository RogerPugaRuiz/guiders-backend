import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { ChatEntity } from '../src/context/conversations/chat/infrastructure/chat.entity';
import { ParticipantsEntity } from '../src/context/conversations/chat/infrastructure/participants.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokenVerifyService } from '../src/context/shared/infrastructure/token-verify.service';
import { Uuid } from '../src/context/shared/domain/value-objects/uuid';

// E2E Test para el endpoint de obtener IDs de chats
// Prueba la funcionalidad completa usando la base de datos de test
describe('Chat Controller (e2e)', () => {
  let app: INestApplication;
  let chatRepository: Repository<ChatEntity>;
  let participantsRepository: Repository<ParticipantsEntity>;
  let tokenVerifyService: TokenVerifyService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    chatRepository = moduleFixture.get<Repository<ChatEntity>>(
      getRepositoryToken(ChatEntity),
    );
    participantsRepository = moduleFixture.get<Repository<ParticipantsEntity>>(
      getRepositoryToken(ParticipantsEntity),
    );
    tokenVerifyService = moduleFixture.get<TokenVerifyService>(TokenVerifyService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar datos de prueba antes de cada test
    await chatRepository.query('DELETE FROM chat_participants');
    await chatRepository.query('DELETE FROM chats');
    await participantsRepository.query('DELETE FROM participants');
  });

  describe('/chat/ids (GET)', () => {
    it('debe requerir autenticación', () => {
      return request(app.getHttpServer())
        .get('/chat/ids')
        .expect(401);
    });

    it('debe requerir rol commercial', async () => {
      // Mock del servicio de verificación de token para simular un usuario visitor
      const mockVerifyToken = jest.spyOn(tokenVerifyService, 'verifyToken');
      mockVerifyToken.mockResolvedValue({
        sub: 'visitor-user-id',
        typ: 'access',
        role: ['visitor'],
        username: 'visitor-user',
        email: 'visitor@test.com',
        companyId: 'company-123',
      });

      const result = await request(app.getHttpServer())
        .get('/chat/ids')
        .set('Authorization', 'Bearer valid-visitor-token')
        .expect(403);

      mockVerifyToken.mockRestore();
    });

    it('debe retornar lista de chat IDs para usuario commercial', async () => {
      // Arrange: Preparar datos de prueba
      const commercialUserId = Uuid.generate();
      const visitorUserId = Uuid.generate();
      const chatId1 = Uuid.generate();
      const chatId2 = Uuid.generate();
      const chatId3 = Uuid.generate();

      // Mock del servicio de verificación de token para simular un usuario commercial
      const mockVerifyToken = jest.spyOn(tokenVerifyService, 'verifyToken');
      mockVerifyToken.mockResolvedValue({
        sub: commercialUserId,
        typ: 'access',
        role: ['commercial'],
        username: 'commercial-user',
        email: 'commercial@test.com',
        companyId: 'company-123',
      });

      // Crear participantes de prueba
      const commercialUser = participantsRepository.create({
        id: commercialUserId,
        name: 'Commercial User',
        isCommercial: true,
        isVisitor: false,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      const visitorUser = participantsRepository.create({
        id: visitorUserId,
        name: 'Visitor User',
        isCommercial: false,
        isVisitor: true,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      await participantsRepository.save([commercialUser, visitorUser]);

      // Crear chats de prueba: el usuario commercial participa en chat1 y chat2
      const chat1 = chatRepository.create({
        id: chatId1,
        status: 'active',
        lastMessage: 'Test message 1',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [commercialUser, visitorUser],
      });

      const chat2 = chatRepository.create({
        id: chatId2,
        status: 'active',
        lastMessage: 'Test message 2',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [commercialUser],
      });

      // Chat3 solo tiene al visitor, no al commercial
      const chat3 = chatRepository.create({
        id: chatId3,
        status: 'active',
        lastMessage: 'Test message 3',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [visitorUser],
      });

      await chatRepository.save([chat1, chat2, chat3]);

      // Act & Assert: Realizar la petición y verificar la respuesta
      const response = await request(app.getHttpServer())
        .get('/chat/ids')
        .set('Authorization', 'Bearer valid-commercial-token')
        .expect(200);

      // Verificar que se retornan solo los chats donde el usuario commercial participa
      expect(response.body).toHaveProperty('chatIds');
      expect(response.body.chatIds).toHaveLength(2);
      expect(response.body.chatIds).toContain(chatId1);
      expect(response.body.chatIds).toContain(chatId2);
      expect(response.body.chatIds).not.toContain(chatId3);

      mockVerifyToken.mockRestore();
    });

    it('debe retornar array vacío cuando el usuario no participa en ningún chat', async () => {
      // Arrange: Usuario commercial sin chats
      const commercialUserId = Uuid.generate();
      const otherUserId = Uuid.generate();
      const chatId = Uuid.generate();

      // Mock del servicio de verificación de token
      const mockVerifyToken = jest.spyOn(tokenVerifyService, 'verifyToken');
      mockVerifyToken.mockResolvedValue({
        sub: commercialUserId,
        typ: 'access',
        role: ['commercial'],
        username: 'isolated-commercial',
        email: 'isolated@test.com',
        companyId: 'company-123',
      });

      // Crear usuarios de prueba
      const commercialUser = participantsRepository.create({
        id: commercialUserId,
        name: 'Isolated Commercial',
        isCommercial: true,
        isVisitor: false,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      const otherUser = participantsRepository.create({
        id: otherUserId,
        name: 'Other User',
        isCommercial: false,
        isVisitor: true,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      await participantsRepository.save([commercialUser, otherUser]);

      // Crear chat que no incluye al usuario commercial
      const chat = chatRepository.create({
        id: chatId,
        status: 'active',
        lastMessage: 'Test message',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [otherUser],
      });

      await chatRepository.save(chat);

      // Act & Assert: Realizar la petición y verificar la respuesta vacía
      const response = await request(app.getHttpServer())
        .get('/chat/ids')
        .set('Authorization', 'Bearer valid-commercial-token')
        .expect(200);

      expect(response.body).toHaveProperty('chatIds');
      expect(response.body.chatIds).toHaveLength(0);

      mockVerifyToken.mockRestore();
    });
  });
});
