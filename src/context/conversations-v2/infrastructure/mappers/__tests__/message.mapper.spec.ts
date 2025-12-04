import { Test, TestingModule } from '@nestjs/testing';
import { MessageMapper } from '../message.mapper';
import { Message } from '../../../domain/entities/message.aggregate';
import { MessageSchema } from '../../schemas/message.schema';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('MessageMapper', () => {
  let mapper: MessageMapper;

  const mockMessageId = Uuid.random().value;
  const mockChatId = Uuid.random().value;
  const mockSenderId = Uuid.random().value;
  const mockCommercialId = `commercial_${Uuid.random().value}`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageMapper],
    }).compile();

    mapper = module.get<MessageMapper>(MessageMapper);
  });

  // Helper function para crear mock de schema
  const createMockMessageSchema = (
    id: string,
    chatId: string,
    type: string = 'TEXT',
    senderId: string = mockSenderId,
  ): MessageSchema => {
    const schema = new MessageSchema();
    schema.id = id;
    schema.chatId = chatId;
    schema.type = type; // Usar el tipo tal como viene (en mayúsculas del dominio)
    schema.senderId = senderId;
    schema.senderType = senderId === 'system' ? 'system' : 'visitor';
    schema.content = { text: `Mensaje de prueba ${type}` };
    schema.sentAt = new Date();
    schema.isRead = false;
    schema.isEdited = false;
    schema.isDeleted = false;
    schema.sequenceNumber = 1;
    schema.isInternal = false;
    schema.tags = [];
    return schema;
  };

  describe('toSchema', () => {
    it('debería convertir un mensaje de texto del dominio a MessageSchema de MongoDB', () => {
      // Arrange
      const message = Message.createTextMessage({
        chatId: mockChatId,
        senderId: mockSenderId,
        content: 'Hola, necesito ayuda',
        isInternal: false,
        isFirstResponse: false,
      });

      // Act
      const schema = mapper.toSchema(message);

      // Assert
      expect(schema).toBeInstanceOf(MessageSchema);
      expect(schema.id).toBe(message.id.value);
      expect(schema.chatId).toBe(mockChatId);
      expect(schema.type).toBe('TEXT'); // Tipos en mayúsculas en dominio
      expect(schema.senderId).toBe(mockSenderId);
      expect(schema.senderType).toBe('visitor');
      expect(schema.content.text).toBe('Hola, necesito ayuda');
      expect(schema.isRead).toBe(false);
      expect(schema.isInternal).toBe(false);
      expect(schema.sentAt).toBeDefined();
      expect(schema.searchableText).toBe('hola, necesito ayuda');
      expect(schema.sequenceNumber).toBe(0); // Se establece en el repositorio
    });

    it('debería manejar correctamente un mensaje del sistema', () => {
      // Arrange
      const message = Message.createSystemMessage({
        chatId: mockChatId,
        action: 'assigned',
        fromUserId: mockCommercialId,
        reason: 'Asignación automática',
      });

      // Act
      const schema = mapper.toSchema(message);

      // Assert
      expect(schema.type).toBe('SYSTEM');
      expect(schema.senderId).toBe('system');
      expect(schema.senderType).toBe('system');
      expect(schema.isInternal).toBe(true);
      expect(schema.systemInfo).toBeDefined();
      expect(schema.systemInfo?.action).toBe('assigned');
      expect(schema.systemInfo?.triggeredBy).toBe(mockCommercialId);
      expect(schema.systemInfo?.automationRule).toBe('Asignación automática');
      expect(schema.content.text).toBe('Comercial asignado al chat');
    });

    it('debería manejar correctamente un mensaje con archivo adjunto', () => {
      // Arrange
      const fileName = 'documento.pdf';
      const fileUrl = 'https://storage.example.com/files/documento.pdf';
      const fileType = 'application/pdf';
      const fileSize = 1024000;

      const message = Message.createFileMessage({
        chatId: mockChatId,
        senderId: mockSenderId,
        fileName,
        attachment: {
          url: fileUrl,
          fileName,
          fileSize,
          mimeType: fileType,
        },
      });

      // Act
      const schema = mapper.toSchema(message);

      // Assert
      expect(schema.type).toBe('FILE');
      expect(schema.content.text).toBe(`Archivo adjunto: ${fileName}`);
      expect(schema.content.attachments).toHaveLength(1);
      expect(schema.content.attachments?.[0]).toEqual({
        id: `${message.id.value}-attachment`,
        name: fileName,
        url: fileUrl,
        type: fileType,
        size: fileSize,
        mimeType: fileType,
      });
      expect(schema.fileInfo).toBeDefined();
      expect(schema.fileInfo?.originalName).toBe(fileName);
      expect(schema.fileInfo?.url).toBe(fileUrl);
      expect(schema.fileInfo?.size).toBe(fileSize);
      expect(schema.fileInfo?.downloadCount).toBe(0);
    });

    it('debería determinar correctamente el tipo de remitente para comerciales', () => {
      // Arrange
      const message = Message.createTextMessage({
        chatId: mockChatId,
        senderId: mockCommercialId,
        content: 'Hola, soy tu comercial asignado',
      });

      // Act
      const schema = mapper.toSchema(message);

      // Assert
      expect(schema.senderId).toBe(mockCommercialId);
      expect(schema.senderType).toBe('commercial');
    });

    it('debería manejar mensajes de imagen correctamente', () => {
      // Arrange
      const fileName = 'captura.png';
      const fileUrl = 'https://storage.example.com/images/captura.png';
      const fileType = 'image/png';
      const fileSize = 512000;

      const message = Message.createFileMessage({
        chatId: mockChatId,
        senderId: mockSenderId,
        fileName,
        attachment: {
          url: fileUrl,
          fileName,
          fileSize,
          mimeType: fileType,
        },
      });

      // Act
      const schema = mapper.toSchema(message);

      // Assert
      expect(schema.type).toBe('IMAGE'); // Para mimeType image/*
      expect(schema.fileInfo?.mimeType).toBe(fileType);
    });
  });

  describe('toDomain', () => {
    it('debería convertir un MessageSchema de MongoDB a entidad Message del dominio', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);
      schema.content.text = 'Mensaje desde MongoDB';

      // Act
      const message = mapper.toDomain(schema);

      // Assert
      expect(message).toBeInstanceOf(Message);
      expect(message.id.value).toBe(mockMessageId);
      expect(message.chatId.value).toBe(mockChatId);
      expect(message.senderId).toBe(mockSenderId);
      expect(message.content.value).toBe('Mensaje desde MongoDB');
      expect(message.type.value).toBe('TEXT');
      expect(message.isInternal).toBe(false);
      expect(message.createdAt).toBe(schema.sentAt);
    });

    it('debería manejar correctamente un schema de mensaje del sistema', () => {
      // Arrange
      const schema = createMockMessageSchema(
        mockMessageId,
        mockChatId,
        'SYSTEM',
        'system',
      );
      schema.content.text = 'Comercial asignado al chat';
      schema.systemInfo = {
        action: 'assigned',
        triggeredBy: mockCommercialId,
        automationRule: 'Auto-assignment',
      };
      schema.isInternal = true;

      // Act
      const message = mapper.toDomain(schema);

      // Assert
      expect(message.type.value).toBe('SYSTEM');
      expect(message.senderId).toBe('system');
      expect(message.isInternal).toBe(true);
      expect(message.systemData).toBeDefined();
      expect(message.systemData?.action).toBe('assigned');
      expect(message.systemData?.fromUserId).toBe(mockCommercialId);
      expect(message.systemData?.reason).toBe('Auto-assignment');
    });

    it('debería manejar correctamente un schema con archivo adjunto', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId, 'FILE');
      schema.content.text = 'Archivo adjunto: documento.pdf';
      schema.fileInfo = {
        originalName: 'documento.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        url: 'https://storage.example.com/files/documento.pdf',
        downloadCount: 3,
      };

      // Act
      const message = mapper.toDomain(schema);

      // Assert
      expect(message.type.value).toBe('FILE');
      expect(message.attachment).toBeDefined();
      expect(message.attachment?.fileName).toBe('documento.pdf');
      expect(message.attachment?.url).toBe(
        'https://storage.example.com/files/documento.pdf',
      );
      expect(message.attachment?.fileSize).toBe(1024000);
      expect(message.attachment?.mimeType).toBe('application/pdf');
    });

    it('debería manejar correctamente un schema con datos mínimos', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);
      // Solo los campos requeridos

      // Act
      const message = mapper.toDomain(schema);

      // Assert
      expect(message.id.value).toBe(mockMessageId);
      expect(message.chatId.value).toBe(mockChatId);
      expect(message.systemData).toBeNull();
      expect(message.attachment).toBeNull();
    });
  });

  describe('toDomainList', () => {
    it('debería convertir múltiples schemas a entidades de dominio', () => {
      // Arrange
      const schemas = [
        createMockMessageSchema(Uuid.random().value, mockChatId, 'TEXT'),
        createMockMessageSchema(
          Uuid.random().value,
          mockChatId,
          'SYSTEM',
          'system',
        ),
        createMockMessageSchema(Uuid.random().value, mockChatId, 'FILE'),
      ];

      // Act
      const messages = mapper.toDomainList(schemas);

      // Assert
      expect(messages).toHaveLength(3);
      expect(messages[0]).toBeInstanceOf(Message);
      expect(messages[1]).toBeInstanceOf(Message);
      expect(messages[2]).toBeInstanceOf(Message);
      expect(messages[0].type.value).toBe('TEXT');
      expect(messages[1].type.value).toBe('SYSTEM');
      expect(messages[2].type.value).toBe('FILE');
    });

    it('debería retornar array vacío para lista vacía', () => {
      // Arrange
      const schemas: MessageSchema[] = [];

      // Act
      const messages = mapper.toDomainList(schemas);

      // Assert
      expect(messages).toEqual([]);
    });
  });

  describe('toSchemaList', () => {
    it('debería convertir múltiples entidades de dominio a schemas', () => {
      // Arrange
      const messages = [
        Message.createTextMessage({
          chatId: mockChatId,
          senderId: mockSenderId,
          content: 'Primer mensaje',
        }),
        Message.createSystemMessage({
          chatId: mockChatId,
          action: 'assigned',
        }),
        Message.createTextMessage({
          chatId: mockChatId,
          senderId: mockCommercialId,
          content: 'Respuesta del comercial',
        }),
      ];

      // Act
      const schemas = mapper.toSchemaList(messages);

      // Assert
      expect(schemas).toHaveLength(3);
      expect(schemas[0]).toBeInstanceOf(MessageSchema);
      expect(schemas[1]).toBeInstanceOf(MessageSchema);
      expect(schemas[2]).toBeInstanceOf(MessageSchema);
      expect(schemas[0].type).toBe('TEXT');
      expect(schemas[1].type).toBe('SYSTEM');
      expect(schemas[2].senderType).toBe('commercial');
    });

    it('debería retornar array vacío para lista vacía', () => {
      // Arrange
      const messages: Message[] = [];

      // Act
      const schemas = mapper.toSchemaList(messages);

      // Assert
      expect(schemas).toEqual([]);
    });
  });

  describe('updateSchema', () => {
    it('debería actualizar la fecha updatedAt en el schema', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);
      const originalUpdatedAt = schema.updatedAt;

      // Act
      const updatedSchema = mapper.updateSchema(schema);

      // Assert
      expect(updatedSchema).toBe(schema); // Debe ser el mismo objeto
      expect(updatedSchema.updatedAt).toBeDefined();
      expect(updatedSchema.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe('markAsRead', () => {
    it('debería marcar un mensaje como leído', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);
      const readBy = mockCommercialId;
      const readAt = new Date();

      // Act
      const updatedSchema = mapper.markAsRead(schema, readBy, readAt);

      // Assert
      expect(updatedSchema).toBe(schema); // Debe ser el mismo objeto
      expect(updatedSchema.isRead).toBe(true);
      expect(updatedSchema.readBy).toBe(readBy);
      expect(updatedSchema.readAt).toBe(readAt);
      expect(updatedSchema.updatedAt).toBeDefined();
    });

    it('debería usar fecha actual por defecto para readAt', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);
      const readBy = mockCommercialId;

      // Act
      const updatedSchema = mapper.markAsRead(schema, readBy);

      // Assert
      expect(updatedSchema.isRead).toBe(true);
      expect(updatedSchema.readBy).toBe(readBy);
      expect(updatedSchema.readAt).toBeDefined();
      expect(updatedSchema.readAt).toBeInstanceOf(Date);
    });
  });

  describe('markAsDeleted', () => {
    it('debería marcar un mensaje como eliminado', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);
      const deletedAt = new Date();

      // Act
      const updatedSchema = mapper.markAsDeleted(schema, deletedAt);

      // Assert
      expect(updatedSchema).toBe(schema); // Debe ser el mismo objeto
      expect(updatedSchema.isDeleted).toBe(true);
      expect(updatedSchema.deletedAt).toBe(deletedAt);
      expect(updatedSchema.updatedAt).toBeDefined();
    });

    it('debería usar fecha actual por defecto para deletedAt', () => {
      // Arrange
      const schema = createMockMessageSchema(mockMessageId, mockChatId);

      // Act
      const updatedSchema = mapper.markAsDeleted(schema);

      // Assert
      expect(updatedSchema.isDeleted).toBe(true);
      expect(updatedSchema.deletedAt).toBeDefined();
      expect(updatedSchema.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('métodos helper para crear mensajes', () => {
    it('createTextMessageSchema debería crear un schema de mensaje de texto', () => {
      // Arrange
      const chatId = mockChatId;
      const senderId = mockSenderId;
      const text = 'Mensaje helper';
      const sequenceNumber = 5;

      // Act
      const schema = mapper.createTextMessageSchema(
        chatId,
        senderId,
        text,
        sequenceNumber,
      );

      // Assert
      expect(schema).toBeInstanceOf(MessageSchema);
      expect(schema.chatId).toBe(chatId);
      expect(schema.senderId).toBe(senderId);
      expect(schema.content.text).toBe(text);
      expect(schema.type).toBe('TEXT');
      expect(schema.sequenceNumber).toBe(sequenceNumber);
    });

    it('createSystemMessageSchema debería crear un schema de mensaje del sistema', () => {
      // Arrange
      const chatId = mockChatId;
      const action = 'transferred';
      const details = {
        fromUserId: mockCommercialId,
        reason: 'Change of shift',
      };

      // Act
      const schema = mapper.createSystemMessageSchema(chatId, action, details);

      // Assert
      expect(schema.chatId).toBe(chatId);
      expect(schema.type).toBe('SYSTEM');
      expect(schema.senderId).toBe('system');
      expect(schema.systemInfo?.action).toBe(action);
      expect(schema.systemInfo?.triggeredBy).toBe(mockCommercialId);
    });

    it('createFileMessageSchema debería crear un schema de mensaje con archivo', () => {
      // Arrange
      const chatId = mockChatId;
      const senderId = mockSenderId;
      const fileName = 'reporte.xlsx';
      const fileUrl = 'https://storage.example.com/files/reporte.xlsx';
      const fileType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileSize = 2048000;

      // Act
      const schema = mapper.createFileMessageSchema(
        chatId,
        senderId,
        fileName,
        fileUrl,
        fileType,
        fileSize,
      );

      // Assert
      expect(schema.chatId).toBe(chatId);
      expect(schema.senderId).toBe(senderId);
      expect(schema.type).toBe('FILE');
      expect(schema.content.text).toBe(`Archivo adjunto: ${fileName}`);
      expect(schema.fileInfo?.originalName).toBe(fileName);
      expect(schema.fileInfo?.url).toBe(fileUrl);
      expect(schema.fileInfo?.mimeType).toBe(fileType);
      expect(schema.fileInfo?.size).toBe(fileSize);
    });
  });
});
