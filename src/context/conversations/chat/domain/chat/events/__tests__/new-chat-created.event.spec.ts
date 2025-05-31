import { NewChatCreatedEvent } from '../new-chat-created.event';
import { ChatPrimitives } from '../../chat';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('NewChatCreatedEvent', () => {
  const validChatPrimitives: ChatPrimitives = {
    id: Uuid.random().value,
    participants: [
      {
        id: Uuid.random().value,
        name: 'Test Visitor',
        isCommercial: false,
        isVisitor: true,
        isOnline: true,
        assignedAt: new Date(),
        lastSeenAt: null,
        isViewing: false,
        isTyping: false,
      },
    ],
    status: 'pending',
    lastMessage: null,
    lastMessageAt: null,
    createdAt: new Date(),
  };

  describe('constructor', () => {
    it('should create event with valid parameters', () => {
      const publisherId = Uuid.random().value;
      const customTimestamp = new Date('2023-01-01');

      const event = new NewChatCreatedEvent(
        {
          chat: validChatPrimitives,
          publisherId,
        },
        customTimestamp,
      );

      expect(event.atributes.chat).toBe(validChatPrimitives);
      expect(event.atributes.publisherId).toBe(publisherId);
      expect(event.timestamp).toEqual(customTimestamp);
    });

    it('should create event with default timestamp when not provided', () => {
      const publisherId = Uuid.random().value;
      const beforeCreation = new Date();

      const event = new NewChatCreatedEvent({
        chat: validChatPrimitives,
        publisherId,
      });

      const afterCreation = new Date();

      expect(event.atributes.chat).toBe(validChatPrimitives);
      expect(event.atributes.publisherId).toBe(publisherId);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });

    it('should preserve all chat primitive properties', () => {
      const publisherId = Uuid.random().value;

      const event = new NewChatCreatedEvent({
        chat: validChatPrimitives,
        publisherId,
      });

      expect(event.atributes.chat.id).toBe(validChatPrimitives.id);
      expect(event.atributes.chat.status).toBe('pending');
      expect(event.atributes.chat.participants).toHaveLength(1);
      expect(event.atributes.chat.participants[0].name).toBe('Test Visitor');
      expect(event.atributes.chat.participants[0].isVisitor).toBe(true);
      expect(event.atributes.chat.lastMessage).toBeNull();
      expect(event.atributes.chat.lastMessageAt).toBeNull();
    });
  });
});
