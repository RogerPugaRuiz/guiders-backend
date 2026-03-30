# AGENTS.md - Conversations V2 Context

Real-time chat system for visitor engagement. Built with MongoDB for scalability and WebSocket support for instant messaging.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Visitors V2](../visitors-v2/AGENTS.md)

**Status**: ACTIVE (V2) - Use for new chat features | **Legacy**: [Conversations V1](../conversations/AGENTS.md) (PostgreSQL, maintenance only)

## Context Overview

The Conversations V2 context handles:

- Chat creation between visitors and companies
- Real-time message exchange via WebSocket
- Message history and persistence
- Typing indicators and read receipts
- Chat archival and search
- Agent/staff assignment to chats

This context is the **core of real-time engagement** and integrates with visitors-v2 for identification.

## Directory Structure

```
src/context/conversations-v2/
├── domain/
│   ├── chat.aggregate.ts       # Chat aggregate root
│   ├── chat.repository.ts      # Repository interface
│   ├── entities/
│   │   ├── message.entity.ts   # Message sub-entity
│   │   └── participant.entity.ts
│   ├── value-objects/
│   │   ├── chat-id.ts
│   │   ├── message-id.ts
│   │   └── chat-status.ts
│   ├── events/                 # Domain events
│   └── errors/                 # Domain-specific errors
├── application/
│   ├── commands/
│   │   ├── create-chat/
│   │   ├── send-message/
│   │   ├── archive-chat/
│   │   └── ...
│   ├── queries/
│   │   ├── get-chat/
│   │   ├── list-chats/
│   │   └── search-messages/
│   ├── events/                 # Event handlers
│   └── dtos/
└── infrastructure/
    ├── controllers/
    │   ├── chat.controller.ts  # HTTP endpoints
    │   └── websocket.gateway.ts # WebSocket real-time
    ├── persistence/
    │   ├── mongo-chat.repository.ts
    │   └── chat.mapper.ts
    └── services/
```

## Domain Entities

### Chat Aggregate (Root)

```typescript
// src/context/conversations-v2/domain/chat.aggregate.ts
Chat {
  id: ChatId (UUID)
  visitorId: VisitorId
  companyId: CompanyId
  status: ChatStatus (OPEN, CLOSED, ARCHIVED)
  messages: Message[]
  participants: Participant[]
  assignedAgentId: UserId | null
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}
```

### Message Entity

```typescript
// Sub-entity within Chat
Message {
  id: MessageId (UUID)
  senderId: SenderId (visitor or agent)
  content: string
  attachments: Attachment[]
  createdAt: Date
  readAt: Date | null
  editedAt: Date | null
}
```

### Participant Entity

```typescript
// Tracks who is in the chat
Participant {
  id: UserId (or VisitorId)
  role: ParticipantRole (VISITOR, AGENT, ADMIN)
  joinedAt: Date
  leftAt: Date | null
}
```

## Value Objects

- `ChatId` - Unique chat identifier
- `MessageId` - Unique message identifier
- `ChatStatus` - OPEN, CLOSED, ARCHIVED
- `SenderId` - User or Visitor ID
- `ParticipantRole` - VISITOR, AGENT, ADMIN
- `MessageContent` - String with max length validation

## Key Use Cases

### Chat Lifecycle

- **Initialize Chat**: Create chat between visitor and company
- **Send Message**: Add message to chat (visitor or agent)
- **Edit Message**: Modify sent message (auto-tracks edit time)
- **Delete Message**: Soft-delete message (preserves history)
- **Close Chat**: Mark as closed (can be reopened)
- **Archive Chat**: Move to history (cannot reopen)
- **Reopen Chat**: If closed but not archived

### Real-time Features

- **Typing Indicator**: Show when someone is typing
- **Read Receipts**: Track when messages are read
- **Online Status**: User presence in chat
- **Participant Join/Leave**: Track who's in conversation

### Chat Management

- **Assign Agent**: Route to specific support agent
- **Unassign Agent**: Remove assignment
- **Transfer Chat**: Move to different agent
- **List Chats**: Filter by status, date, visitor, agent
- **Search Messages**: Full-text search in chat history

## Commands

### Chat Operations

- `CreateChatCommand` → Initialize chat
- `SendMessageCommand` → Add message
- `EditMessageCommand` → Modify message
- `DeleteMessageCommand` → Soft-delete message
- `CloseChatCommand` → Mark as closed
- `ReopenChatCommand` → Reactivate closed chat
- `ArchiveChatCommand` → Move to archive

### Agent Operations

- `AssignAgentCommand` → Route to agent
- `UnassignAgentCommand` → Clear assignment
- `TransferChatCommand` → Move to different agent

### Real-time

- `SetTypingIndicatorCommand` → Show typing status
- `MarkMessageAsReadCommand` → Update read status

## Queries

### Chat Information

- `GetChatQuery` → Fetch chat details with messages
- `GetChatMessagesQuery` → Paginated messages
- `GetChatByIdQuery` → Chat metadata only
- `SearchMessagesQuery` → Full-text search

### Chat Lists

- `ListCompanyChatsQuery` → All chats for company
- `ListVisitorChatsQuery` → Chats for specific visitor
- `ListAgentChatsQuery` → Chats assigned to agent
- `ListOpenChatsQuery` → Filter by status

### Analytics

- `GetChatMetricsQuery` → Response times, resolution rates
- `GetConversationFlowQuery` → Message patterns

## Events

- `ChatCreatedEvent` → Chat initialized
- `MessageSentEvent` → Message added
- `MessageEditedEvent` → Message modified
- `MessageDeletedEvent` → Message removed
- `ChatClosedEvent` → Chat marked closed
- `ChatReopenedEvent` → Closed chat reactivated
- `ChatArchivedEvent` → Chat moved to archive
- `AgentAssignedEvent` → Agent routing done
- `TypingIndicatorStartedEvent` → User typing
- `TypingIndicatorStoppedEvent` → Typing ended
- `MessageReadEvent` → Message marked read
- `ChatTransferredEvent` → Moved to different agent

## Database Schema (MongoDB)

### chats collection

```javascript
db.createCollection('chats', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['visitorId', 'companyId', 'status', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        visitorId: { bsonType: 'string' },
        companyId: { bsonType: 'string' },
        status: { enum: ['OPEN', 'CLOSED', 'ARCHIVED'] },
        assignedAgentId: { bsonType: ['string', 'null'] },
        messages: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              id: { bsonType: 'string' },
              senderId: { bsonType: 'string' },
              content: { bsonType: 'string' },
              attachments: { bsonType: 'array' },
              createdAt: { bsonType: 'date' },
              readAt: { bsonType: ['date', 'null'] },
              editedAt: { bsonType: ['date', 'null'] },
            },
          },
        },
        participants: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              id: { bsonType: 'string' },
              role: { enum: ['VISITOR', 'AGENT', 'ADMIN'] },
              joinedAt: { bsonType: 'date' },
              leftAt: { bsonType: ['date', 'null'] },
            },
          },
        },
        lastMessageAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

// Indexes for performance
db.chats.createIndex({ companyId: 1, createdAt: -1 });
db.chats.createIndex({ visitorId: 1, createdAt: -1 });
db.chats.createIndex({ assignedAgentId: 1, status: 1 });
db.chats.createIndex({ status: 1, lastMessageAt: -1 });
```

## WebSocket Events

Real-time communication over WebSocket:

### Client → Server

```typescript
// Client sends message
socket.emit('message:send', {
  chatId: 'chat-123',
  content: 'Hello',
  attachments: [],
});

// Client typing
socket.emit('typing:start', { chatId: 'chat-123' });
socket.emit('typing:stop', { chatId: 'chat-123' });

// Client reading messages
socket.emit('message:mark-read', {
  chatId: 'chat-123',
  messageIds: ['msg-1', 'msg-2'],
});
```

### Server → Client

```typescript
// New message broadcast
socket.emit('message:received', {
  id: 'msg-123',
  content: 'Hello',
  senderId: 'visitor-1',
  createdAt: '2024-01-15T10:00:00Z',
});

// Typing indicator
socket.emit('typing:indicator', {
  chatId: 'chat-123',
  senderId: 'agent-1',
  isTyping: true,
});

// Message read receipt
socket.emit('message:read', {
  messageIds: ['msg-1', 'msg-2'],
  readAt: '2024-01-15T10:05:00Z',
});

// Chat closed by agent
socket.emit('chat:closed', {
  chatId: 'chat-123',
  reason: 'Resolved',
});
```

## Integration Points

| Context     | Purpose                | Method                       |
| ----------- | ---------------------- | ---------------------------- |
| company     | Chat scoped to company | CompanyId in all queries     |
| visitors-v2 | Visitor identification | Create chat on visitor login |
| auth        | Agent authentication   | JWT on WebSocket connection  |
| leads       | Chat context for leads | Link chat to lead record     |
| tracking-v2 | Event tracking         | Log chat events              |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/conversations-v2/**/*.spec.ts
```

Test domain logic:

- Chat creation with validation
- Message addition and editing
- Chat status transitions
- Participant management

### Integration Tests

```bash
npm run test:int -- src/context/conversations-v2/**/*.spec.ts
```

Test MongoDB persistence:

- Chat CRUD operations
- Message queries and pagination
- Index usage for performance
- Event publishing

### E2E Tests with WebSocket

```bash
npm run test:e2e
```

Test HTTP and WebSocket endpoints:

- POST /chats (create)
- GET /chats/:id (retrieve with messages)
- POST /chats/:id/messages (send message)
- WebSocket message exchange
- Typing indicators

## Security Guidelines

### Message Permissions

```typescript
// Only sender, agents in chat, or admins can edit
const canEdit =
  message.senderId === userId || isAgentInChat(userId) || isAdmin(userId);
```

### Company Isolation

```typescript
// Always filter by company to prevent data leaks
const chats = await repo.find({
  companyId: userCompanyId,
  status: 'OPEN',
});
```

### WebSocket Authentication

```typescript
// Verify JWT before allowing WebSocket connection
const verified = jwt.verify(token);
socket.userId = verified.sub;
socket.companyId = verified.company;
```

## Performance Considerations

### Message Pagination

```typescript
// Always paginate messages to avoid loading huge chats
const messages = await query.execute(
  new GetChatMessagesQuery(chatId, { page: 1, limit: 50 }),
);
```

### Message Indexing

```typescript
// Create compound index for fast lookup
db.chats.createIndex({
  companyId: 1,
  createdAt: -1,
});
```

### Typing Indicator Debouncing

```typescript
// Client-side: debounce typing events
debounce(() => socket.emit('typing:start'), 300);
```

## Known Limitations

- No message encryption at rest
- No message retention policies
- Typing indicators cleared on disconnect (not persistent)
- No conversation threading (reply-to)
- File attachments metadata only (no file storage)
- No message reactions/emoji support yet
- Read receipts not synced across devices

## Common Patterns

### Sending a Message

```typescript
const result = await handler.execute(
  new SendMessageCommand(chatId, visitorId, 'Hello agent!', []),
);
if (result.isErr()) return result;
const message = result.unwrap();
// WebSocket broadcasts: message:received
// Event: MessageSentEvent
```

### Closing Chat and Creating Ticket

```typescript
// 1. Close chat
const closeResult = await closeChatHandler.execute(
  new CloseChatCommand(chatId, 'Resolved'),
);
if (closeResult.isErr()) return closeResult;

// 2. On ChatClosedEvent, might create lead/ticket
```

### Paginating Chat Messages

```typescript
const query = new GetChatMessagesQuery(chatId, {
  page: 1,
  limit: 50,
  sortBy: 'createdAt',
  direction: 'DESC',
});
const messages = await queryBus.execute(query);
```

## Future Enhancements

1. **Message threading** - Reply to specific messages
2. **Conversation tags** - Categorize chats (urgent, feedback, etc.)
3. **Bot responses** - AI-powered suggestions
4. **Message reactions** - Emoji reactions
5. **Voice/video** - Call integration
6. **Message encryption** - E2E encryption
7. **Canned responses** - Agent templates
8. **Routing rules** - Auto-assign based on criteria

## Related Documentation

- [Visitors V2](../visitors-v2/AGENTS.md) - Visitor identification
- [Auth Context](../auth/AGENTS.md) - User authentication
- [Company Context](../company/AGENTS.md) - Multi-tenancy
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview

## Troubleshooting

### WebSocket connection fails

- Verify JWT token in Authorization header
- Check CORS settings for WebSocket upgrade
- Ensure room subscription matches chatId

### Messages not persisting

- Verify MongoDB connection and indexes
- Check command handler calls `commit()` after save
- Confirm event handlers are registered

### Real-time updates not received

- Verify client subscribed to correct room
- Check socket.io transport configuration
- Ensure event is emitted after save

### Chat not appearing in list

- Verify company ID filter matches user's company
- Check chat status isn't ARCHIVED
- Ensure pagination doesn't skip results
