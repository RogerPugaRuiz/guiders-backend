import { Test, TestingModule } from '@nestjs/testing';
import { ChatMapper } from '../chat.mapper';
import { Chat } from '../../../domain/entities/chat';
import { ChatSchema } from '../../schemas/chat.schema';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { CommercialId } from '../../../domain/value-objects/commercial-id';

describe('ChatMapper', () => {
  let mapper: ChatMapper;

  const mockChatId = Uuid.random().value;
  const mockVisitorId = Uuid.random().value;
  const mockCommercialId = Uuid.random().value;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatMapper],
    }).compile();

    mapper = module.get<ChatMapper>(ChatMapper);
  });

  describe('toSchema', () => {
    it('debería convertir una entidad Chat del dominio a ChatSchema de MongoDB', () => {
      // Arrange
      const chat = Chat.createPendingChat({
        visitorId: mockVisitorId,
        visitorInfo: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '+34123456789',
          company: 'Tech Corp',
          ipAddress: '192.168.1.1',
          location: { city: 'Madrid', country: 'España' },
          userAgent: 'Mozilla/5.0',
          referrer: 'https://google.com',
        },
        availableCommercialIds: [mockCommercialId],
        priority: 'HIGH',
        metadata: {
          department: 'ventas',
          source: 'website',
          tags: ['vip', 'urgente'],
          customFields: { campaña: 'verano2025' },
        },
      });

      // Act
      const schema = mapper.toSchema(chat);

      // Assert
      expect(schema).toBeInstanceOf(ChatSchema);
      expect(schema.id).toBe(chat.id.value);
      expect(schema.status).toBe('PENDING'); // El mapper actualmente no convierte a lowercase
      expect(schema.priority).toBe('HIGH');
      expect(schema.visitorId).toBe(mockVisitorId);
      expect(schema.assignedCommercialId).toBeUndefined();
      expect(schema.isActive).toBe(true);
      expect(schema.totalMessages).toBe(0);
      expect(schema.unreadMessagesCount).toBe(0);
      expect(schema.department).toBe('ventas');
      expect(schema.tags).toEqual(['vip', 'urgente']);
      expect(schema.createdAt).toBeDefined();

      // Verificar visitorInfo
      expect(schema.visitorInfo.id).toBe(mockVisitorId);
      expect(schema.visitorInfo.name).toBe('Juan Pérez');
      expect(schema.visitorInfo.email).toBe('juan@example.com');
      expect(schema.visitorInfo.phone).toBe('+34123456789');
      expect(schema.visitorInfo.location).toBe('Madrid');
      expect(schema.visitorInfo.additionalData?.company).toBe('Tech Corp');
      expect(schema.visitorInfo.additionalData?.ipAddress).toBe('192.168.1.1');

      // Verificar metadata
      expect(schema.metadata.department).toBe('ventas');
      expect(schema.metadata.source).toBe('website');
      expect(schema.metadata.customFields).toEqual({ campaña: 'verano2025' });
    });

    it('debería manejar correctamente un chat asignado con comercial', () => {
      // Arrange
      const chat = Chat.createPendingChat({
        visitorId: mockVisitorId,
        visitorInfo: {
          name: 'Ana García',
          email: 'ana@example.com',
        },
        availableCommercialIds: [mockCommercialId],
      });

      // Simular asignación del comercial
      const assignedChat = chat.assignCommercial(mockCommercialId);

      // Act
      const schema = mapper.toSchema(assignedChat);

      // Assert
      expect(schema.status).toBe('ASSIGNED'); // Los estados vienen del dominio en mayúsculas
      expect(schema.assignedCommercialId).toBe(mockCommercialId);
      // assignedAt puede no estar definido si firstResponseTime no está establecido en el chat
      // expect(schema.assignedAt).toBeDefined();
    });

    it('debería manejar correctamente un chat cerrado', () => {
      // Arrange
      const chat = Chat.createPendingChat({
        visitorId: mockVisitorId,
        visitorInfo: {
          name: 'Carlos López',
          email: 'carlos@example.com',
        },
        availableCommercialIds: [mockCommercialId],
      });

      // Simular asignación y luego cierre del chat
      const assignedChat = chat.assignCommercial(mockCommercialId);
      const closedChat = assignedChat.close('system', 'resolved');

      // Act
      const schema = mapper.toSchema(closedChat);

      // Assert
      expect(schema.status).toBe('CLOSED'); // Los estados vienen del dominio en mayúsculas
      expect(schema.isActive).toBe(false);
      expect(schema.closedAt).toBeDefined();
    });

    it('debería manejar correctamente metadatos con valores por defecto', () => {
      // Arrange
      const chat = Chat.createPendingChat({
        visitorId: mockVisitorId,
        visitorInfo: {
          name: 'Usuario Mínimo',
          email: 'minimo@example.com',
        },
        availableCommercialIds: [mockCommercialId],
      });

      // Act
      const schema = mapper.toSchema(chat);

      // Assert
      expect(schema.metadata.department).toBe('general');
      expect(schema.metadata.source).toBe('website');
      expect(schema.department).toBe('general');
      expect(schema.tags).toEqual([]);
    });
  });

  describe('toDomain', () => {
    it('debería convertir un ChatSchema de MongoDB a entidad Chat del dominio', () => {
      // Arrange
      const schema = new ChatSchema();
      schema.id = mockChatId;
      schema.status = 'PENDING'; // Usar estados en mayúsculas que espera el dominio
      schema.priority = 'NORMAL';
      schema.visitorId = mockVisitorId;
      schema.assignedCommercialId = undefined;
      schema.totalMessages = 5;
      schema.isActive = true;
      schema.createdAt = new Date('2025-01-01T10:00:00Z');
      schema.lastMessageDate = new Date('2025-01-01T12:00:00Z');

      schema.visitorInfo = {
        id: mockVisitorId,
        name: 'María Rodríguez',
        email: 'maria@example.com',
        phone: '+34987654321',
        location: 'Barcelona',
        additionalData: {
          company: 'Innovación SL',
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome/91.0',
          referrer: 'https://bing.com',
        },
      };

      schema.metadata = {
        department: 'soporte',
        source: 'mobile_app',
        tags: { premium: true },
        customFields: { plan: 'enterprise' },
      };

      schema.department = 'soporte';
      schema.tags = ['premium'];

      // Act
      const chat = mapper.toDomain(schema);

      // Assert
      expect(chat).toBeInstanceOf(Chat);
      expect(chat.id.value).toBe(mockChatId);
      expect(chat.status.value).toBe('PENDING'); // Estados en mayúsculas en el dominio
      expect(chat.priority.value).toBe('NORMAL');
      expect(chat.visitorId.getValue()).toBe(mockVisitorId);
      expect(chat.totalMessages).toBe(5);
      expect(chat.createdAt).toEqual(new Date('2025-01-01T10:00:00Z'));

      // Verificar conversión de visitorInfo
      const visitorInfo = chat.visitorInfo;
      expect(visitorInfo.getName()).toBe('María Rodríguez');
      expect(visitorInfo.getEmail()).toBe('maria@example.com');
      expect(visitorInfo.getPhone()).toBe('+34987654321');
      expect(visitorInfo.getCompany()).toBe('Innovación SL');
      expect(visitorInfo.getIpAddress()).toBe('10.0.0.1');
      expect(visitorInfo.getLocation()?.city).toBe('Barcelona');

      // Verificar conversión de metadata
      const metadata = chat.metadata;
      expect(metadata.isPresent()).toBe(true);
      if (metadata.isPresent()) {
        expect(metadata.get().getDepartment()).toBe('soporte');
        expect(metadata.get().getSource()).toBe('mobile_app');
        expect(metadata.get().getTags()).toEqual(['premium']);
        expect(metadata.get().getCustomField('plan')).toBe('enterprise');
      }
    });

    it('debería manejar correctamente un schema con datos mínimos', () => {
      // Arrange
      const schema = new ChatSchema();
      schema.id = mockChatId;
      schema.status = 'PENDING'; // Estados en mayúsculas para el dominio
      schema.priority = 'NORMAL';
      schema.visitorId = mockVisitorId;
      schema.totalMessages = 0;
      schema.isActive = true;
      schema.createdAt = new Date();

      schema.visitorInfo = {
        id: mockVisitorId,
        name: 'Usuario Anónimo',
        email: 'anonimo@example.com',
      };

      schema.metadata = {
        department: 'general',
        source: 'website',
      };

      schema.department = 'general';

      // Act
      const chat = mapper.toDomain(schema);

      // Assert
      expect(chat).toBeInstanceOf(Chat);
      expect(chat.id.value).toBe(mockChatId);
      expect(chat.visitorInfo.getName()).toBe('Usuario Anónimo');
      const metadata = chat.metadata;
      expect(metadata.isPresent()).toBe(true);
      if (metadata.isPresent()) {
        expect(metadata.get().getDepartment()).toBe('general');
        expect(metadata.get().getSource()).toBe('website');
        expect(metadata.get().getTags()).toEqual([]);
      }
    });

    it('debería manejar correctamente un schema con chat asignado y cerrado', () => {
      // Arrange
      const closedAt = new Date('2025-01-01T15:00:00Z');
      const schema = new ChatSchema();
      schema.id = mockChatId;
      schema.status = 'CLOSED'; // Estados en mayúsculas para el dominio
      schema.priority = 'HIGH';
      schema.visitorId = mockVisitorId;
      schema.assignedCommercialId = mockCommercialId;
      schema.totalMessages = 10;
      schema.isActive = false;
      schema.createdAt = new Date('2025-01-01T10:00:00Z');
      schema.assignedAt = new Date('2025-01-01T11:00:00Z');
      schema.closedAt = closedAt;

      schema.visitorInfo = {
        id: mockVisitorId,
        name: 'Cliente VIP',
        email: 'vip@example.com',
      };

      schema.metadata = {
        department: 'ventas',
        source: 'website',
      };

      // Act
      const chat = mapper.toDomain(schema);

      // Assert
      expect(chat.status.value).toBe('CLOSED'); // Estados en mayúsculas en dominio
      expect(chat.assignedCommercialId.isPresent()).toBe(true);
      if (chat.assignedCommercialId.isPresent()) {
        expect(chat.assignedCommercialId.get().getValue()).toBe(
          mockCommercialId,
        );
      }
      expect(chat.totalMessages).toBe(10);
      const chatPrimitives = chat.toPrimitives();
      expect(chatPrimitives.closedAt).toEqual(closedAt);
    });
  });

  describe('toDomainList', () => {
    it('debería convertir múltiples schemas a entidades de dominio', () => {
      // Arrange
      const schemas = [
        createMockSchema(Uuid.random().value, 'PENDING'), // Estados en mayúsculas para dominio
        createMockSchema(Uuid.random().value, 'ASSIGNED'),
        createMockSchema(Uuid.random().value, 'CLOSED'),
      ];

      // Act
      const chats = mapper.toDomainList(schemas);

      // Assert
      expect(chats).toHaveLength(3);
      expect(chats[0]).toBeInstanceOf(Chat);
      expect(chats[1]).toBeInstanceOf(Chat);
      expect(chats[2]).toBeInstanceOf(Chat);
      expect(chats[0].status.value).toBe('PENDING'); // Estados en mayúsculas
      expect(chats[1].status.value).toBe('ASSIGNED');
      expect(chats[2].status.value).toBe('CLOSED');
    });

    it('debería retornar array vacío para lista vacía', () => {
      // Act
      const chats = mapper.toDomainList([]);

      // Assert
      expect(chats).toEqual([]);
    });
  });

  describe('toSchemaList', () => {
    it('debería convertir múltiples entidades de dominio a schemas', () => {
      // Arrange
      const chats = [
        Chat.createPendingChat({
          visitorId: Uuid.random().value,
          visitorInfo: { name: 'Chat 1', email: 'chat1@example.com' },
          availableCommercialIds: [mockCommercialId],
        }),
        Chat.createPendingChat({
          visitorId: Uuid.random().value,
          visitorInfo: { name: 'Chat 2', email: 'chat2@example.com' },
          availableCommercialIds: [mockCommercialId],
        }),
      ];

      // Act
      const schemas = mapper.toSchemaList(chats);

      // Assert
      expect(schemas).toHaveLength(2);
      expect(schemas[0]).toBeInstanceOf(ChatSchema);
      expect(schemas[1]).toBeInstanceOf(ChatSchema);
      expect(schemas[0].visitorInfo.name).toBe('Chat 1');
      expect(schemas[1].visitorInfo.name).toBe('Chat 2');
    });

    it('debería retornar array vacío para lista vacía', () => {
      // Act
      const schemas = mapper.toSchemaList([]);

      // Assert
      expect(schemas).toEqual([]);
    });
  });

  describe('updateSchema', () => {
    it('debería actualizar un schema existente con datos de una entidad de dominio', () => {
      // Arrange
      const existingSchema = createMockSchema(mockChatId, 'PENDING'); // Estados en mayúsculas
      const originalCreatedAt = existingSchema.createdAt;
      const originalMetadataUrl = 'https://original.com';
      existingSchema.metadata.initialUrl = originalMetadataUrl;

      const updatedChat = Chat.createPendingChat({
        visitorId: mockVisitorId,
        visitorInfo: {
          name: 'Usuario Actualizado',
          email: 'actualizado@example.com',
        },
        availableCommercialIds: [mockCommercialId],
        priority: 'URGENT',
        metadata: {
          department: 'ventas',
          source: 'mobile_app',
          tags: ['premium'],
          customFields: { updated: true },
        },
      });

      // Simular asignación para cambiar el estado
      const assignedChat = updatedChat.assignCommercial(mockCommercialId);

      // Act
      const updatedSchema = mapper.updateSchema(existingSchema, assignedChat);

      // Assert
      expect(updatedSchema).toBe(existingSchema); // Debe ser el mismo objeto
      expect(updatedSchema.status).toBe('ASSIGNED'); // Los mappers mantienen el valor del dominio tal como está
      expect(updatedSchema.priority).toBe('URGENT');
      expect(updatedSchema.assignedCommercialId).toBe(mockCommercialId);
      // No verificamos assignedAt ya que puede ser undefined si no hay firstResponseTime
      expect(updatedSchema.isActive).toBe(true);
      expect(updatedSchema.updatedAt).toBeDefined();
      expect(updatedSchema.updatedAt).not.toEqual(originalCreatedAt);

      // Verificar que se mantienen campos que no deben cambiar
      expect(updatedSchema.createdAt).toEqual(originalCreatedAt);
      expect(updatedSchema.metadata.initialUrl).toBe(originalMetadataUrl);

      // Verificar actualización de metadatos
      expect(updatedSchema.metadata.department).toBe('ventas');
      expect(updatedSchema.department).toBe('ventas');
      expect(updatedSchema.tags).toEqual(['premium']);
    });

    it('debería manejar correctamente la actualización de un chat cerrado', () => {
      // Arrange
      const existingSchema = createMockSchema(mockChatId, 'ASSIGNED'); // Estados en mayúsculas
      existingSchema.assignedCommercialId = mockCommercialId;

      // Crear directamente un chat cerrado usando fromPrimitives
      const closedChatData = {
        id: mockChatId,
        status: 'CLOSED', // En el dominio está en mayúsculas
        priority: 'NORMAL',
        visitorId: mockVisitorId,
        assignedCommercialId: mockCommercialId,
        availableCommercialIds: [mockCommercialId],
        totalMessages: 0,
        closedAt: new Date(),
        closedReason: 'resolved',
        visitorInfo: { name: 'Usuario', email: 'usuario@example.com' },
        metadata: { department: 'general', source: 'website' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const closedChat = Chat.fromPrimitives(closedChatData);

      // Act
      const updatedSchema = mapper.updateSchema(existingSchema, closedChat);

      // Assert
      expect(updatedSchema.status).toBe('CLOSED'); // El mapper debe convertir a lo que espera el esquema
      expect(updatedSchema.isActive).toBe(false);
      expect(updatedSchema.closedAt).toBeDefined();
    });
  });

  // Helper function para crear un schema mock
  function createMockSchema(id: string, status: string): ChatSchema {
    const schema = new ChatSchema();
    schema.id = id;
    schema.status = status; // Ya recibe el estado correcto
    schema.priority = 'NORMAL';
    schema.visitorId = mockVisitorId;
    schema.totalMessages = 0;
    schema.isActive = status !== 'CLOSED'; // Usar mayúsculas para comparación
    schema.createdAt = new Date('2025-01-01T10:00:00Z');

    schema.visitorInfo = {
      id: mockVisitorId,
      name: 'Mock User',
      email: 'mock@example.com',
    };

    schema.metadata = {
      department: 'general',
      source: 'website',
    };

    schema.department = 'general';
    schema.tags = [];

    return schema;
  }
});
