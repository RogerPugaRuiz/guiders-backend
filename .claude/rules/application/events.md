# Event Handlers

## Descripción

Reaccionan a eventos de dominio para ejecutar side-effects.

## Referencia
`src/context/llm/application/events/send-ai-response-on-message-sent.event-handler.ts`

## Convención de Naming

```
<NewAction>On<OldEvent>EventHandler
```

Ejemplo: `SendNotificationOnChatCreatedEventHandler`
- **NewAction**: Lo que hace este handler (SendNotification)
- **OldEvent**: El evento que lo dispara (ChatCreated)

## Estructura Base

```typescript
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

@EventsHandler(ChatCreatedEvent)
export class SendNotificationOnChatCreatedEventHandler
  implements IEventHandler<ChatCreatedEvent>
{
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: Logger,
  ) {}

  async handle(event: ChatCreatedEvent): Promise<void> {
    try {
      await this.notificationService.notifyNewChat({
        chatId: event.chatId,
        visitorId: event.visitorId,
        companyId: event.companyId,
      });

      this.logger.log(`Notificación enviada para chat ${event.chatId}`);
    } catch (error) {
      // IMPORTANTE: No lanzar excepciones, solo loguear
      this.logger.error(
        `Error enviando notificación para chat ${event.chatId}: ${error.message}`,
      );
    }
  }
}
```

## Ejecutar Commands desde Event Handler

```typescript
@EventsHandler(ChatAssignedEvent)
export class UpdateMetricsOnChatAssignedEventHandler
  implements IEventHandler<ChatAssignedEvent>
{
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ChatAssignedEvent): Promise<void> {
    try {
      // Usar CommandBus para acciones que requieren persistencia
      await this.commandBus.execute(
        new UpdateCommercialMetricsCommand(event.commercialId),
      );
    } catch (error) {
      // Loguear pero no propagar
      console.error(`Error actualizando métricas: ${error.message}`);
    }
  }
}
```

## Múltiples Handlers por Evento

```typescript
// Cada handler hace UNA cosa
@EventsHandler(ChatCreatedEvent)
export class NotifyCommercialsOnChatCreatedEventHandler { /* ... */ }

@EventsHandler(ChatCreatedEvent)
export class UpdateQueueMetricsOnChatCreatedEventHandler { /* ... */ }

@EventsHandler(ChatCreatedEvent)
export class SendWebhookOnChatCreatedEventHandler { /* ... */ }
```

## Registro en Módulo

```typescript
const EventHandlers = [
  SendNotificationOnChatCreatedEventHandler,
  UpdateMetricsOnChatAssignedEventHandler,
  NotifyVisitorOnChatClosedEventHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [...EventHandlers],
})
export class ChatApplicationModule {}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Handler | `<Action>On<Event>EventHandler` | `SendNotificationOnChatCreatedEventHandler` |
| Archivo | `<action>-on-<event>.event-handler.ts` | `send-notification-on-chat-created.event-handler.ts` |

## Anti-patrones

- Lanzar excepciones (rompe otros handlers)
- Lógica de negocio crítica (usar Commands)
- Handlers síncronos que bloquean
- Naming sin patrón `<Action>On<Event>`
