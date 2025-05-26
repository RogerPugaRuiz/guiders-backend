# Contexto Conversations

Este contexto orquesta la lógica de conversaciones y mensajería, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura

- **application/**: Lógica de aplicación (commands, events, queries, dtos) para chat y mensajes.
  - **commands/**: Comandos para crear y modificar conversaciones y mensajes.
  - **events/**: Manejadores de eventos relacionados con conversaciones.
  - **queries/**: Consultas para obtener información de conversaciones y mensajes.
  - **dtos/**: Objetos de transferencia de datos.
- **domain/**: Entidades, repositorios, eventos y value objects del dominio conversacional.
  - **models/**: Entidades como Chat, Message, Participant.
  - **repositories/**: Interfaces de repositorios.
  - **events/**: Eventos de dominio específicos de conversaciones.
- **infrastructure/**: Adaptadores, persistencia y controladores.
  - **controllers/**: API REST para operaciones con conversaciones.
  - **repositories/**: Implementaciones de repositorios con TypeORM.
  - **persistence/**: Entidades ORM y mappers.

## Componentes principales

- **chat/**: Gestión de conversaciones entre visitantes y comerciales.
- **message/**: Gestión de mensajes individuales dentro de una conversación.

### Agregados y entidades

- **Chat**: Representa una conversación completa entre un visitante y un comercial.
- **Message**: Mensaje individual dentro de una conversación.
- **Participant**: Usuario participante en una conversación (visitante o comercial).

### Value Objects principales

```typescript
export class ChatId {
  private constructor(private readonly value: Uuid) {}

  static create(value?: string): ChatId {
    return new ChatId(Uuid.create(value));
  }

  toString(): string {
    return this.value.toString();
  }
}

export class MessageContent {
  private constructor(private readonly value: string) {}

  static create(value: string): MessageContent {
    if (!value || value.trim().length === 0) {
      throw new EmptyMessageContentError();
    }
    
    if (value.length > 2000) {
      throw new MessageContentTooLongError(value.length);
    }
    
    return new MessageContent(value.trim());
  }

  get value(): string {
    return this.value;
  }
}
```

## Principios

- **DDD**: El dominio modela las reglas y procesos de negocio de las conversaciones.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Flujos principales

### Creación de una conversación

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Comercial │────▶│  Controller     │────▶│ CreateChatCmd    │
└───────────┘     └─────────────────┘     └──────────────────┘
                                                   │
                                                   ▼
┌───────────────┐     ┌─────────────────┐     ┌──────────────────┐
│EventHandlers  │◀────│  ChatCreated    │◀────│    ChatEntity    │
└───────────────┘     └─────────────────┘     └──────────────────┘
        │                                                
        │                                                
        ▼                                                
┌───────────────┐                                        
│NotificarUsuario│                                       
└───────────────┘                                        
```

1. El comercial inicia una conversación con un visitante.
2. Se crea un Chat con ambos participantes.
3. Se emite un evento de ChatCreated.
4. Los EventHandlers notifican a ambas partes sobre la nueva conversación.

### Envío de mensajes

```typescript
@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: SendMessageCommand): Promise<void> {
    const { chatId, senderId, content, attachments } = command;
    
    // 1. Buscar el chat
    const chat = await this.chatRepository.findById(ChatId.create(chatId));
    if (!chat) {
      throw new ChatNotFoundError(chatId);
    }
    
    // 2. Verificar que el remitente es participante
    if (!chat.isParticipant(ParticipantId.create(senderId))) {
      throw new NotChatParticipantError(senderId, chatId);
    }
    
    // 3. Crear el mensaje
    const message = Message.create({
      chatId: ChatId.create(chatId),
      senderId: ParticipantId.create(senderId),
      content: MessageContent.create(content),
      attachments: attachments ? attachments.map(a => MessageAttachment.create(a)) : [],
    });
    
    // 4. Guardar y publicar eventos
    const messageWithPublisher = this.publisher.mergeObjectContext(message);
    await this.messageRepository.save(messageWithPublisher);
    messageWithPublisher.commit();
    
    // 5. Actualizar estado del chat
    chat.addMessage(message);
    await this.chatRepository.save(chat);
  }
}
```

## Ejemplos de uso

### Crear una conversación

```typescript
// Controller
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async createConversation(@Body() dto: CreateConversationDto) {
    const chatId = await this.commandBus.execute(
      new CreateChatCommand({
        visitorId: dto.visitorId,
        commercialId: dto.commercialId,
        companyId: dto.companyId,
        initialMessage: dto.message,
      }),
    );
    
    return { chatId };
  }
}
```

### Obtener historial de mensajes

```typescript
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id/messages')
  async getMessages(
    @Param('id') chatId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.queryBus.execute(
      new GetChatMessagesQuery({
        chatId,
        page,
        limit,
      }),
    );
  }
}

@QueryHandler(GetChatMessagesQuery)
export class GetChatMessagesHandler implements IQueryHandler<GetChatMessagesQuery> {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly repository: MessageRepository,
  ) {}

  async execute(query: GetChatMessagesQuery): Promise<PaginatedResult<MessageDto>> {
    const { chatId, page, limit } = query;
    
    const result = await this.repository.findByChatId(
      ChatId.create(chatId),
      {
        page,
        limit,
        sortBy: 'timestamp',
        sortDirection: 'DESC',
      },
    );
    
    return {
      items: result.items.map(message => MessageMapper.toDto(message)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
```

### Marcar mensajes como leídos

```typescript
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':chatId/messages/read')
  async markMessagesAsRead(
    @Param('chatId') chatId: string,
    @Body() dto: MarkMessagesAsReadDto,
  ) {
    await this.commandBus.execute(
      new MarkMessagesAsReadCommand({
        chatId,
        participantId: dto.participantId,
        lastReadMessageId: dto.lastReadMessageId,
      }),
    );
    
    return { success: true };
  }
}
```

## Intención

Permite gestionar conversaciones y mensajes de forma desacoplada, clara y escalable, facilitando la integración con otros contextos. Este diseño:

- Proporciona un sistema completo de mensajería entre visitantes y comerciales.
- Mantiene el historial de conversaciones para referencia y análisis.
- Separa la lógica de negocio de la infraestructura de entrega de mensajes.
- Facilita la integración con el contexto de Real-Time para la entrega de mensajes en tiempo real.
