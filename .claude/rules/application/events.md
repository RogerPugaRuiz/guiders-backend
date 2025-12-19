# Event Handlers

## Description

React to domain events to execute side-effects.

## Reference
`src/context/llm/application/events/send-ai-response-on-message-sent.event-handler.ts`

## Naming Convention

```
<NewAction>On<OldEvent>EventHandler
```

Example: `SendNotificationOnChatCreatedEventHandler`
- **NewAction**: What this handler does (SendNotification)
- **OldEvent**: The event that triggers it (ChatCreated)

## Base Structure

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

      this.logger.log(`Notification sent for chat ${event.chatId}`);
    } catch (error) {
      // IMPORTANT: Don't throw exceptions, just log
      this.logger.error(
        `Error sending notification for chat ${event.chatId}: ${error.message}`,
      );
    }
  }
}
```

## Execute Commands from Event Handler

```typescript
@EventsHandler(ChatAssignedEvent)
export class UpdateMetricsOnChatAssignedEventHandler
  implements IEventHandler<ChatAssignedEvent>
{
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ChatAssignedEvent): Promise<void> {
    try {
      // Use CommandBus for actions requiring persistence
      await this.commandBus.execute(
        new UpdateCommercialMetricsCommand(event.commercialId),
      );
    } catch (error) {
      // Log but don't propagate
      console.error(`Error updating metrics: ${error.message}`);
    }
  }
}
```

## Multiple Handlers per Event

```typescript
// Each handler does ONE thing
@EventsHandler(ChatCreatedEvent)
export class NotifyCommercialsOnChatCreatedEventHandler { /* ... */ }

@EventsHandler(ChatCreatedEvent)
export class UpdateQueueMetricsOnChatCreatedEventHandler { /* ... */ }

@EventsHandler(ChatCreatedEvent)
export class SendWebhookOnChatCreatedEventHandler { /* ... */ }
```

## Module Registration

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

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Handler | `<Action>On<Event>EventHandler` | `SendNotificationOnChatCreatedEventHandler` |
| File | `<action>-on-<event>.event-handler.ts` | `send-notification-on-chat-created.event-handler.ts` |

## Anti-patterns

- Throwing exceptions (breaks other handlers)
- Critical business logic (use Commands)
- Synchronous handlers that block
- Naming without `<Action>On<Event>` pattern
