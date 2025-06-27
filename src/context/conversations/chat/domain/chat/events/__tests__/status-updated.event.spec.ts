import { StatusUpdatedEvent } from '../status-updated.event';
import { ChatPrimitives } from '../../chat';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('StatusUpdatedEvent', () => {
  const validChatPrimitives: ChatPrimitives = {
    id: Uuid.random().value,
    companyId: 'test-company-id',
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
        isAnonymous: true,
      },
    ],
    status: 'active',
    lastMessage: 'Hello world',
    lastMessageAt: new Date(),
    createdAt: new Date(),
  };

  describe('constructor', () => {
    it('should create event with valid parameters', () => {
      const timestamp = new Date('2023-01-01');
      const oldStatus = 'pending';

      const event = new StatusUpdatedEvent({
        timestamp,
        attributes: {
          chat: validChatPrimitives,
          oldStatus,
        },
      });

      expect(event.params.timestamp).toEqual(timestamp);
      expect(event.params.attributes.chat).toBe(validChatPrimitives);
      expect(event.params.attributes.oldStatus).toBe(oldStatus);
    });

    it('should preserve chat status change information', () => {
      const timestamp = new Date();
      const oldStatus = 'pending';

      const event = new StatusUpdatedEvent({
        timestamp,
        attributes: {
          chat: validChatPrimitives,
          oldStatus,
        },
      });

      expect(event.params.attributes.chat.status).toBe('active');
      expect(event.params.attributes.oldStatus).toBe('pending');
      expect(event.params.timestamp).toEqual(timestamp);
    });

    it('should include all chat details in the event', () => {
      const timestamp = new Date();
      const oldStatus = 'inactive';

      const event = new StatusUpdatedEvent({
        timestamp,
        attributes: {
          chat: validChatPrimitives,
          oldStatus,
        },
      });

      expect(event.params.attributes.chat.id).toBe(validChatPrimitives.id);
      expect(event.params.attributes.chat.participants).toHaveLength(1);
      expect(event.params.attributes.chat.participants[0].isVisitor).toBe(true);
      expect(event.params.attributes.chat.lastMessage).toBe('Hello world');
      expect(event.params.attributes.chat.lastMessageAt).toEqual(
        validChatPrimitives.lastMessageAt,
      );
    });

    it('should handle different status transitions', () => {
      const statusTransitions = [
        { from: 'pending', to: 'active' },
        { from: 'active', to: 'closed' },
        { from: 'closed', to: 'archived' },
        { from: 'inactive', to: 'active' },
      ];

      statusTransitions.forEach(({ from, to }) => {
        const chatWithNewStatus = { ...validChatPrimitives, status: to };
        const event = new StatusUpdatedEvent({
          timestamp: new Date(),
          attributes: {
            chat: chatWithNewStatus,
            oldStatus: from,
          },
        });

        expect(event.params.attributes.chat.status).toBe(to);
        expect(event.params.attributes.oldStatus).toBe(from);
      });
    });
  });
});
