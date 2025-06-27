import { Chat } from '../../domain/chat/chat';
import { CompanyId } from '../../domain/chat/value-objects/company-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('Chat with CompanyId Integration', () => {
  it('should create chat with valid companyId', () => {
    const chatId = Uuid.random().value;
    const companyId = 'valid-company-123';

    const chat = Chat.createPendingChat({
      chatId,
      companyId,
      visitor: { id: 'visitor-123', name: 'Test Visitor' },
      createdAt: new Date(),
    });

    expect(chat.companyId).toBeInstanceOf(CompanyId);
    expect(chat.companyId.getValue()).toBe(companyId);
  });

  it('should serialize companyId in toPrimitives', () => {
    const primitives = {
      id: Uuid.random().value,
      companyId: 'test-company-456',
      participants: [
        {
          id: 'visitor-123',
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
      status: 'pending',
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };

    const chat = Chat.fromPrimitives(primitives);
    const serialized = chat.toPrimitives();

    expect(serialized.companyId).toBe('test-company-456');
  });

  it('should throw error for invalid companyId', () => {
    expect(() => {
      CompanyId.create('');
    }).toThrow('CompanyId debe ser un string no vacío');

    expect(() => {
      CompanyId.create('   ');
    }).toThrow('CompanyId debe ser un string no vacío');
  });
});
